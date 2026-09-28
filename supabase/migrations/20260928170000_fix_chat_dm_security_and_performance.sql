-- Migration: Fix Chat DM Security, Instant Access & Query Optimization
-- File: supabase/migrations/20260928170000_fix_chat_dm_security_and_performance.sql
-- Description:
-- 1. Updates `private.can_view_chat_channel` to grant instant RLS access to DM participants
--    based on `dm_key` or deterministic channel ID containing the user's UUID, eliminating any
--    window of permission rejection when a DM conversation is initiated.
-- 2. Updates `private.can_manage_chat_channel` to allow DM participants full management of their 1-1 chat.
-- 3. Adds indexes for fast DM channel lookups and message retrieval.

-- 1. Cập nhật private.can_view_chat_channel cho phép người dùng trong DM xem tin nhắn tức thì
CREATE OR REPLACE FUNCTION private.can_view_chat_channel(target_channel_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.chat_channels c
    where c.id = target_channel_id
      and c.is_archived = false
      and (
        -- Kênh công khai
        c.channel_type = 'public'
        -- Người tạo kênh
        or c.created_by = (select auth.uid())
        -- Trò chuyện riêng (DM): Người dùng nằm trong dm_key hoặc ID kênh chứa UUID
        or (
          c.channel_type = 'dm'
          and (
            (c.dm_key is not null and (
              c.dm_key = (select auth.uid())::text
              or c.dm_key like (select auth.uid())::text || ':%'
              or c.dm_key like '%:' || (select auth.uid())::text
              or c.dm_key like '%:' || (select auth.uid())::text || ':%'
            ))
            or (c.id like '%:' || (select auth.uid())::text || '-%' or c.id like '%-%' || (select auth.uid())::text)
          )
        )
        -- Thành viên rõ ràng trong bảng chat_channel_members
        or exists (
          select 1
          from public.chat_channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = (select auth.uid())
        )
      )
  );
$function$;

-- 2. Cập nhật private.can_manage_chat_channel
CREATE OR REPLACE FUNCTION private.can_manage_chat_channel(target_channel_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.chat_channels c
    where c.id = target_channel_id
      and (
        c.created_by = (select auth.uid())
        or private.is_workspace_admin(c.workspace_id)
        or (
          c.channel_type = 'dm'
          and (
            (c.dm_key is not null and (
              c.dm_key = (select auth.uid())::text
              or c.dm_key like (select auth.uid())::text || ':%'
              or c.dm_key like '%:' || (select auth.uid())::text
              or c.dm_key like '%:' || (select auth.uid())::text || ':%'
            ))
            or (c.id like '%:' || (select auth.uid())::text || '-%' or c.id like '%-%' || (select auth.uid())::text)
          )
        )
        or exists (
          select 1
          from public.chat_channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = (select auth.uid())
            and cm.role in ('owner','admin')
        )
      )
  );
$function$;

-- 3. Chỉ mục tối ưu hoá truy vấn
CREATE INDEX IF NOT EXISTS idx_chat_channels_workspace_dm_key 
  ON public.chat_channels (workspace_id, dm_key) 
  WHERE channel_type = 'dm';

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created 
  ON public.chat_messages (channel_id, created_at DESC);
