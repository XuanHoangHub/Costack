-- Migration: Chat Realtime Broadcast, Channel-Scoped Security and Presence Policies
-- File: supabase/migrations/20260923150000_chat_realtime_broadcast_and_security.sql
-- Description:
--   1. Tạo database trigger function để phát Realtime Broadcast theo từng topic kênh 'chat:<channel_id>'
--   2. Củng cố Row Level Security (RLS) cho chat_messages và chat_channel_members
--   3. Cấu hình kiểm tra quyền truy cập cho Realtime Authorization (nếu realtime.messages được kích hoạt)
--   4. Đảm bảo cấu hình REPLICA IDENTITY FULL cho publication supabase_realtime

-- ==============================================================================
-- 1. DATABASE TRIGGER FUNCTION: Realtime Broadcast trên chat_messages
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.broadcast_chat_message()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
SET search_path = public, private, realtime
AS $$
DECLARE
  target_channel_id text := COALESCE(NEW.channel_id, OLD.channel_id);
  event_op text := TG_OP;
  payload jsonb;
BEGIN
  -- Khi không có channel_id thì bỏ qua
  IF target_channel_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Chuẩn bị payload tương thích và loại bỏ các dữ liệu không cần thiết
  IF event_op = 'DELETE' THEN
    payload := jsonb_build_object(
      'eventType', 'DELETE',
      'old', jsonb_build_object(
        'id', OLD.id,
        'channel_id', OLD.channel_id,
        'workspace_id', OLD.workspace_id
      )
    );
  ELSE
    payload := jsonb_build_object(
      'eventType', event_op,
      'new', jsonb_build_object(
        'id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_name', NEW.sender_name,
        'sender_avatar', NEW.sender_avatar,
        'content', NEW.content,
        'timestamp', NEW.timestamp,
        'channel_id', NEW.channel_id,
        'is_ai_response', NEW.is_ai_response,
        'user_id', NEW.user_id,
        'workspace_id', NEW.workspace_id,
        'created_at', NEW.created_at,
        'attachment', NEW.attachment,
        'parent_id', NEW.parent_id,
        'is_pinned', NEW.is_pinned,
        'reactions', NEW.reactions,
        'edited_at', NEW.edited_at,
        'deleted_at', NEW.deleted_at,
        'mentions', NEW.mentions
      )
    );
  END IF;

  -- Phát broadcast qua Supabase Realtime với topic theo kênh: 'chat:<channel_id>'
  -- Bọc trong khối exception để nếu realtime extension gặp lỗi cũng không chặn việc ghi database.
  BEGIN
    PERFORM realtime.send(
      payload,
      'message',
      'chat:' || target_channel_id,
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Realtime broadcast failsafe: không làm fail transaction chính
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Gắn trigger vào bảng public.chat_messages
DROP TRIGGER IF EXISTS trg_broadcast_chat_message ON public.chat_messages;
CREATE TRIGGER trg_broadcast_chat_message
  AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_chat_message();

-- ==============================================================================
-- 2. CỦNG CỐ ROW LEVEL SECURITY (RLS) CHO CHAT_MESSAGES
-- ==============================================================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON public.chat_messages;

-- Người dùng chỉ được đọc tin nhắn nếu có quyền xem kênh tương ứng
CREATE POLICY "chat_messages_select" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  private.can_view_chat_channel(channel_id)
);

-- Người dùng chỉ được gửi tin nhắn vào kênh họ có quyền truy cập
CREATE POLICY "chat_messages_insert" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  private.can_view_chat_channel(channel_id)
  AND (user_id = (SELECT auth.uid()) OR user_id IS NULL)
);

-- Người dùng có thể sửa tin nhắn của chính mình hoặc admin/quản lý kênh có thể sửa (ví dụ ghim tin nhắn)
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
);

-- Người dùng có thể xóa tin nhắn của chính mình hoặc admin/quản lý kênh
CREATE POLICY "chat_messages_delete" ON public.chat_messages
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_manage_chat_channel(channel_id)
);

-- ==============================================================================
-- 3. CỦNG CỐ ROW LEVEL SECURITY (RLS) CHO CHAT_CHANNEL_MEMBERS
-- ==============================================================================

ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_channel_members_select" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_insert" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_update" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_delete" ON public.chat_channel_members;

-- Xem thành viên kênh nếu có quyền xem kênh hoặc là chính mình
CREATE POLICY "chat_channel_members_select" ON public.chat_channel_members
FOR SELECT TO authenticated
USING (
  private.can_view_chat_channel(channel_id)
  OR user_id = (SELECT auth.uid())
);

-- Thêm thành viên: quản lý kênh hoặc tự tham gia kênh công khai
CREATE POLICY "chat_channel_members_insert" ON public.chat_channel_members
FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_chat_channel(channel_id)
  OR (
    user_id = (SELECT auth.uid())
    AND private.can_view_chat_channel(channel_id)
  )
);

-- Cập nhật trạng thái thành viên (ví dụ is_starred, last_read_at)
CREATE POLICY "chat_channel_members_update" ON public.chat_channel_members
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_manage_chat_channel(channel_id)
);

-- Rời kênh hoặc quản lý gỡ thành viên
CREATE POLICY "chat_channel_members_delete" ON public.chat_channel_members
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_manage_chat_channel(channel_id)
);

-- ==============================================================================
-- 4. REALTIME AUTHORIZATION POLICIES (CHO TOPIC CHAT:*)
-- ==============================================================================

DO $$
BEGIN
  -- Nếu schema realtime tồn tại và có bảng messages (Realtime Authorization)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    -- Bật RLS trên realtime.messages nếu chưa bật
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;';
    
    EXECUTE 'DROP POLICY IF EXISTS "chat_realtime_channel_access" ON realtime.messages;';
    EXECUTE '
      CREATE POLICY "chat_realtime_channel_access" ON realtime.messages
      FOR SELECT TO authenticated
      USING (
        CASE
          WHEN realtime.topic() LIKE ''chat:%'' THEN
            private.can_view_chat_channel(regexp_replace(realtime.topic(), ''^chat:'', ''''))
          ELSE true
        END
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
ALTER TABLE public.chat_channels REPLICA IDENTITY FULL;
