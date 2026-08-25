create or replace function public.get_document_access_level(target_document_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select case
      when d.user_id = (select auth.uid()) then 'owner'
      when exists (
        select 1
        from public.workspaces w
        where w.id = d.workspace_id
          and w.user_id = (select auth.uid())
      ) then 'editor'
      when exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = d.workspace_id
          and wm.user_id = (select auth.uid())
          and wm.status = 'active'
      ) then 'editor'
      when exists (
        select 1
        from public.document_collaborators dc
        where dc.document_id = d.id
          and dc.user_id = (select auth.uid())
          and dc.role = 'owner'
      ) then 'owner'
      when exists (
        select 1
        from public.document_collaborators dc
        where dc.document_id = d.id
          and dc.user_id = (select auth.uid())
          and dc.role = 'editor'
      ) then 'editor'
      when exists (
        select 1
        from public.document_collaborators dc
        where dc.document_id = d.id
          and dc.user_id = (select auth.uid())
          and dc.role = 'commenter'
      ) then 'commenter'
      when exists (
        select 1
        from public.document_collaborators dc
        where dc.document_id = d.id
          and dc.user_id = (select auth.uid())
          and dc.role = 'viewer'
      ) then 'viewer'
      when d.is_published then 'viewer'
      else 'none'
    end
    from public.documents d
    where d.id = target_document_id
  ), 'none');
$$;

revoke all on function public.get_document_access_level(uuid) from public, anon;
grant execute on function public.get_document_access_level(uuid) to authenticated, service_role;
