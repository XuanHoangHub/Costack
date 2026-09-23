-- Migration: Chat Postgres Changes Realtime Architecture and Channel-Scoped Security
-- File: supabase/migrations/20260923154500_chat_postgres_changes_and_channel_security.sql
-- Description:
--   1. Xoá bỏ trigger broadcast tin nhắn (nếu có) để sử dụng hoàn toàn Postgres Changes (CDC)
--      nhất quán, không gây lặp tin nhắn và không phát sinh chi phí PERFORM realtime.send().
--   2. Sửa lỗi điều kiện c.workspace_id = c.workspace_id trong policy chat_messages_insert:
--      kiểm tra channel tồn tại, quyền xem channel, và đối chiếu workspace_id khớp chính xác.
--   3. Tạo BEFORE INSERT/UPDATE trigger trên public.chat_messages để điền/chuẩn hóa workspace_id
--      từ channel ở phía tin cậy, ngăn chặn client giả mạo workspace_id hoặc xử lý an toàn khi client để trống.
--   4. Tạo helper private.realtime_chat_channel_id() và bổ sung policies cho realtime.messages
--      (Realtime Authorization) dành riêng cho topic chat:*, hoàn toàn không chạm/ảnh hưởng đến
--      các policies cộng tác tài liệu hiện có (document_collaboration_*).
--   5. Đảm bảo chat_messages nằm trong publication supabase_realtime và REPLICA IDENTITY FULL.

-- ==============================================================================
-- 1. XOÁ BỎ TRIGGER BROADCAST TIN NHẮN (SỬ DỤNG POSTGRES CHANGES NHẤT QUÁN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_broadcast_chat_message ON public.chat_messages;
DROP FUNCTION IF EXISTS public.broadcast_chat_message();

-- ==============================================================================
-- 2. TRIGGER ĐIỀN & XÁC THỰC WORKSPACE_ID PHÍA TIN CẬY TRÊN CHAT_MESSAGES
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.trg_set_chat_message_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chan_workspace_id text;
BEGIN
  -- Lấy workspace_id của kênh chat từ bảng public.chat_channels
  SELECT c.workspace_id
  INTO chan_workspace_id
  FROM public.chat_channels c
  WHERE c.id = NEW.channel_id;

  IF NOT FOUND OR chan_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Kênh chat % không tồn tại hoặc không hợp lệ', NEW.channel_id;
  END IF;

  -- Nếu client truyền workspace_id không khớp với workspace của channel -> từ chối ngay lập tức
  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id <> chan_workspace_id THEN
    RAISE EXCEPTION 'workspace_id (%) không khớp với workspace của kênh chat (%)', NEW.workspace_id, chan_workspace_id;
  END IF;

  -- Điền hoặc chuẩn hóa workspace_id từ channel ở phía tin cậy
  NEW.workspace_id := chan_workspace_id;

  -- Chuẩn hóa user_id từ auth.uid() nếu chưa có hoặc đang để trống để đảm bảo tính toàn vẹn
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_chat_message_workspace ON public.chat_messages;
CREATE TRIGGER trg_set_chat_message_workspace
  BEFORE INSERT OR UPDATE OF channel_id, workspace_id ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_chat_message_workspace();

-- Backfill an toàn cho các dòng tin nhắn cũ nếu có workspace_id bị null hoặc không khớp
UPDATE public.chat_messages m
SET workspace_id = c.workspace_id
FROM public.chat_channels c
WHERE m.channel_id = c.id
  AND (m.workspace_id IS NULL OR m.workspace_id <> c.workspace_id);

-- ==============================================================================
-- 3. CỦNG CỐ RLS POLICIES CHO CHAT_MESSAGES (SỬA LỖI WORKSPACE_ID TRONG INSERT)
-- ==============================================================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON public.chat_messages;

-- SELECT: Người dùng chỉ được đọc tin nhắn nếu có quyền xem kênh tương ứng
CREATE POLICY "chat_messages_select" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  private.can_view_chat_channel(channel_id)
);

-- INSERT: Sửa lỗi c.workspace_id = c.workspace_id cũ
-- Kiểm tra:
--   - Người dùng có quyền xem kênh
--   - user_id là chính người gửi hoặc null (trigger sẽ gán auth.uid())
--   - Channel tồn tại trong chat_channels và workspace_id của message (nếu được truyền) phải khớp với channel.workspace_id
CREATE POLICY "chat_messages_insert" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  private.can_view_chat_channel(channel_id)
  AND (user_id = (SELECT auth.uid()) OR user_id IS NULL)
  AND EXISTS (
    SELECT 1
    FROM public.chat_channels c
    WHERE c.id = chat_messages.channel_id
      AND (
        chat_messages.workspace_id IS NULL
        OR chat_messages.workspace_id = c.workspace_id
      )
  )
);

-- UPDATE: Sửa tin nhắn của chính mình hoặc admin/quản lý kênh
CREATE POLICY "chat_messages_update" ON public.chat_messages
FOR UPDATE TO authenticated
USING (
  private.can_view_chat_channel(channel_id)
  AND (
    user_id = (SELECT auth.uid())
    OR private.can_manage_chat_channel(channel_id)
  )
)
WITH CHECK (
  private.can_view_chat_channel(channel_id)
  AND (
    chat_messages.workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.workspace_id = chat_messages.workspace_id
    )
  )
);

-- DELETE: Xóa tin nhắn của chính mình hoặc admin/quản lý kênh
CREATE POLICY "chat_messages_delete" ON public.chat_messages
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_manage_chat_channel(channel_id)
);

-- ==============================================================================
-- 4. REALTIME AUTHORIZATION POLICIES TRÊN REALTIME.MESSAGES (PRESENCE & BROADCAST CHO CHAT)
-- ==============================================================================

-- Helper an toàn trích xuất channel_id từ topic 'chat:<channel_id>'
CREATE OR REPLACE FUNCTION private.realtime_chat_channel_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN (SELECT realtime.topic()) ~ '^chat:[^/\s]+$'
      THEN substring((SELECT realtime.topic()) FROM 6)
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION private.realtime_chat_channel_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.realtime_chat_channel_id() TO authenticated, service_role;

DO $$
BEGIN
  -- Chỉ cấu hình nếu schema realtime có bảng messages (Realtime Authorization)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;';

    -- Xóa các policy chat cũ nếu có, TUYỆT ĐỐI KHÔNG chạm vào document_collaboration_*
    EXECUTE 'DROP POLICY IF EXISTS "chat_realtime_channel_access" ON realtime.messages;';
    EXECUTE 'DROP POLICY IF EXISTS "chat_realtime_receive" ON realtime.messages;';
    EXECUTE 'DROP POLICY IF EXISTS "chat_realtime_send" ON realtime.messages;';

    -- Policy SELECT cho realtime.messages:
    -- Chỉ áp dụng cho các topic bắt đầu bằng "chat:" và người dùng có quyền xem kênh chat đó.
    -- Bất kỳ topic tài liệu hoặc topic khác đều trả về FALSE trong policy này,
    -- không làm mở rộng quyền hay ảnh hưởng đến document_collaboration_receive.
    EXECUTE '
      CREATE POLICY "chat_realtime_receive"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        realtime.messages.extension IN (''broadcast'', ''presence'')
        AND (realtime.topic()) ~ ''^chat:[^/\s]+$''
        AND private.can_view_chat_channel(private.realtime_chat_channel_id())
      );
    ';

    -- Policy INSERT cho realtime.messages:
    -- Cho phép người dùng gửi presence (online track) hoặc broadcast (typing indicator)
    -- vào topic "chat:<channel_id>" nếu người dùng có quyền xem kênh đó.
    EXECUTE '
      CREATE POLICY "chat_realtime_send"
      ON realtime.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        realtime.messages.extension IN (''broadcast'', ''presence'')
        AND (realtime.topic()) ~ ''^chat:[^/\s]+$''
        AND private.can_view_chat_channel(private.realtime_chat_channel_id())
      );
    ';
  END IF;
END $$;

-- ==============================================================================
-- 5. ĐẢM BẢO PUBLICATION SUPABASE_REALTIME & REPLICA IDENTITY FULL
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_channels'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
    END IF;
  END IF;
END $$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
