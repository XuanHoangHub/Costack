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
      when private.is_workspace_member(d.workspace_id) then 'editor'
      when private.has_document_role(d.id, array['owner']) then 'owner'
      when private.has_document_role(d.id, array['editor']) then 'editor'
      when private.has_document_role(d.id, array['commenter']) then 'commenter'
      when private.has_document_role(d.id, array['viewer']) then 'viewer'
      when d.is_published then 'viewer'
      else 'none'
    end
    from public.documents d
    where d.id = target_document_id
  ), 'none');
$$;

revoke all on function public.get_document_access_level(uuid) from public, anon;
grant execute on function public.get_document_access_level(uuid) to authenticated, service_role;
