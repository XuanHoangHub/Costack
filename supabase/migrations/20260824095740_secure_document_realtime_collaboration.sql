create or replace function private.realtime_document_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (select realtime.topic()) ~ '^document:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then substring((select realtime.topic()) from 10)::uuid
    else null
  end;
$$;

revoke all on function private.realtime_document_id() from public, anon;
grant execute on function private.realtime_document_id() to authenticated, service_role;

create or replace function public.get_document_access_level(target_document_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
set row_security = off
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

drop policy if exists document_collaboration_receive on realtime.messages;
drop policy if exists document_collaboration_send on realtime.messages;

create policy document_collaboration_receive
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and private.can_view_document(private.realtime_document_id())
);

create policy document_collaboration_send
on realtime.messages
for insert
to authenticated
with check (
  (
    realtime.messages.extension = 'presence'
    and private.can_view_document(private.realtime_document_id())
  )
  or
  (
    realtime.messages.extension = 'broadcast'
    and (
      (
        realtime.messages.event in ('yjs-awareness', 'yjs-sync-request')
        and private.can_view_document(private.realtime_document_id())
      )
      or
      (
        realtime.messages.event in ('yjs-update', 'yjs-sync-response')
        and private.can_edit_document(private.realtime_document_id())
      )
    )
  )
);
