-- Migration: Fix recursive RLS evaluation by setting row_security = 'off' on private security definer helper functions

CREATE OR REPLACE FUNCTION private.can_view_space(target_space_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1 from public.spaces s where s.id = target_space_id and (
      s.user_id = (select auth.uid())
      or private.is_workspace_admin(s.workspace_id)
      or (private.is_workspace_member(s.workspace_id) and (
        not coalesce(s.is_private, false)
        or coalesce(s.share_settings, '{}'::jsonb) ? ((select auth.uid())::text)
      ))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_space(target_space_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1 from public.spaces s where s.id = target_space_id and (
      s.user_id = (select auth.uid())
      or private.is_workspace_admin(s.workspace_id)
      or (private.is_workspace_member(s.workspace_id) and (
        not coalesce(s.is_private, false)
        or coalesce(s.share_settings, '{}'::jsonb)->>((select auth.uid())::text) = 'edit'
      ))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_view_list(target_list_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1 from public.lists l where l.id = target_list_id
      and private.can_view_space(l.space_id)
      and (l.user_id = (select auth.uid()) or not coalesce(l.is_private, false)
           or coalesce(l.share_settings, '{}'::jsonb) ? ((select auth.uid())::text)
           or private.can_edit_space(l.space_id))
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_list(target_list_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1 from public.lists l where l.id = target_list_id
      and (
        l.user_id = (select auth.uid())
        or private.can_edit_space(l.space_id)
        or coalesce(l.share_settings, '{}'::jsonb)->>((select auth.uid())::text) = 'edit'
      )
  );
$function$;

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
      and private.is_workspace_member(c.workspace_id)
      and (
        c.channel_type = 'public'
        or c.created_by = (select auth.uid())
        or exists (
          select 1
          from public.chat_channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = (select auth.uid())
        )
      )
  );
$function$;

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

CREATE OR REPLACE FUNCTION private.enforce_free_space_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
declare
  actor uuid := (select auth.uid());
  has_pro boolean := false;
  current_space_count integer := 0;
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or actor is null then
    return new;
  end if;

  select exists (
    select 1
    from public.billing_subscriptions bs
    where bs.user_id = actor
      and (
        bs.status in ('active', 'trialing')
        or (bs.status = 'past_due' and coalesce(bs.current_period_end, now()) > now() - interval '7 days')
      )
  ) into has_pro;

  if has_pro then return new; end if;

  select count(*)
  into current_space_count
  from public.spaces s
  where s.workspace_id = new.workspace_id;

  if current_space_count >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'FREE_SPACE_LIMIT_REACHED',
      hint = 'Upgrade to Apexa Pro to create more than 5 spaces in this workspace.';
  end if;

  return new;
end;
$function$;

-- Drop old policies on lists and spaces
DROP POLICY IF EXISTS "lists_select" ON "public"."lists";
DROP POLICY IF EXISTS "lists_insert" ON "public"."lists";
DROP POLICY IF EXISTS "lists_update" ON "public"."lists";
DROP POLICY IF EXISTS "lists_delete" ON "public"."lists";
DROP POLICY IF EXISTS "spaces_insert" ON "public"."spaces";

-- Recreate bulletproof policies for collaborative lists & spaces
CREATE POLICY "lists_select" ON "public"."lists"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  user_id = (select auth.uid()) 
  or private.can_view_space(space_id)
  or not coalesce(is_private, false)
);

CREATE POLICY "lists_insert" ON "public"."lists"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = (select auth.uid()) or user_id is null)
  and private.can_edit_space(space_id)
);

CREATE POLICY "lists_update" ON "public"."lists"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  user_id = (select auth.uid()) 
  or private.can_edit_list(id) 
  or private.can_edit_space(space_id)
)
WITH CHECK (
  private.can_edit_space(space_id)
);

CREATE POLICY "lists_delete" ON "public"."lists"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  user_id = (select auth.uid()) 
  or private.can_edit_list(id) 
  or private.can_edit_space(space_id)
);

CREATE POLICY "spaces_insert" ON "public"."spaces"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = (select auth.uid()) or user_id is null) 
  and private.is_workspace_member(workspace_id)
);
