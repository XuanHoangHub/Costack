create schema if not exists private;

alter table public.workspace_invitations
  alter column workspace_id set not null;

update public.workspace_invitations
set email = lower(btrim(email))
where email <> lower(btrim(email));

revoke all on table public.workspace_invitations from anon;
revoke all on table public.workspace_memberships from anon;
grant select, insert, update, delete on table public.workspace_invitations to authenticated;
grant select, insert, update, delete on table public.workspace_memberships to authenticated;

create or replace function public.create_workspace_invitation(
  p_workspace_id text,
  p_email text,
  p_role text default 'member',
  p_inviter_name text default null
)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  caller_email text;
  target_user_id uuid;
  invitation public.workspace_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Only workspace owners and admins can invite people';
  end if;

  if p_role not in ('admin', 'member', 'guest') then
    raise exception 'Invalid workspace role';
  end if;

  if length(normalized_email) > 320
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address';
  end if;

  select lower(u.email), u.id
  into caller_email, target_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  order by u.created_at asc
  limit 1;

  if caller_email = normalized_email and target_user_id = auth.uid() then
    raise exception 'You are already a member of this workspace';
  end if;

  if target_user_id is not null and exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = target_user_id
      and wm.status = 'active'
  ) then
    raise exception 'This person is already a member of the workspace';
  end if;

  update public.workspace_invitations wi
  set role = p_role,
      invited_by = auth.uid()::text,
      invited_by_name = nullif(btrim(p_inviter_name), ''),
      workspace_name = w.name,
      token = gen_random_uuid()::text,
      created_at = now(),
      expires_at = now() + interval '7 days'
  from public.workspaces w
  where wi.workspace_id = p_workspace_id
    and lower(wi.email) = normalized_email
    and wi.status = 'pending'
    and w.id = p_workspace_id
  returning wi.* into invitation;

  if invitation.id is null then
    insert into public.workspace_invitations (
      workspace_id,
      workspace_name,
      email,
      role,
      invited_by,
      invited_by_name,
      status
    )
    select
      w.id,
      w.name,
      normalized_email,
      p_role,
      auth.uid()::text,
      nullif(btrim(p_inviter_name), ''),
      'pending'
    from public.workspaces w
    where w.id = p_workspace_id
    returning * into invitation;
  end if;

  if invitation.id is null then
    raise exception 'Workspace not found';
  end if;

  return invitation;
end;
$$;

create or replace function public.accept_workspace_invitation(invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  invitation public.workspace_invitations%rowtype;
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(u.email) into caller_email
  from auth.users u
  where u.id = auth.uid();

  select * into invitation
  from public.workspace_invitations wi
  where wi.id = invitation_id
  for update;

  if invitation.id is null
     or lower(invitation.email) <> caller_email
     or invitation.status <> 'pending'
     or (invitation.expires_at is not null and invitation.expires_at <= now()) then
    raise exception 'Invitation is invalid, expired, or belongs to another account';
  end if;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  )
  values (
    invitation.workspace_id,
    auth.uid(),
    case when invitation.role in ('admin', 'member', 'guest') then invitation.role else 'member' end,
    'active',
    case
      when invitation.invited_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then invitation.invited_by::uuid
      else null
    end,
    now()
  )
  on conflict (workspace_id, user_id)
  do update set
    role = case
      when public.workspace_memberships.role = 'owner' then 'owner'
      else excluded.role
    end,
    status = 'active',
    invited_by = excluded.invited_by,
    updated_at = now();

  update public.members m
  set workspace_ids = array_append(coalesce(m.workspace_ids, '{}'::text[]), invitation.workspace_id)
  where m.user_id = auth.uid()
    and not (invitation.workspace_id = any(coalesce(m.workspace_ids, '{}'::text[])));

  update public.workspace_invitations
  set status = 'accepted'
  where id = invitation.id;

  return invitation.workspace_id;
end;
$$;

create or replace function public.decline_workspace_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(u.email) into caller_email
  from auth.users u
  where u.id = auth.uid();

  update public.workspace_invitations
  set status = 'declined'
  where id = invitation_id
    and lower(email) = caller_email
    and status = 'pending';

  if not found then
    raise exception 'Invitation is invalid or no longer pending';
  end if;
end;
$$;

create or replace function public.resend_workspace_invitation(invitation_id uuid)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  invitation public.workspace_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.workspace_invitations wi
  set token = gen_random_uuid()::text,
      status = 'pending',
      created_at = now(),
      expires_at = now() + interval '7 days',
      invited_by = auth.uid()::text
  where wi.id = invitation_id
    and private.is_workspace_admin(wi.workspace_id)
  returning wi.* into invitation;

  if invitation.id is null then
    raise exception 'Invitation not found or permission denied';
  end if;

  return invitation;
end;
$$;

create or replace function public.revoke_workspace_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.workspace_invitations wi
  set status = 'revoked'
  where wi.id = invitation_id
    and wi.status = 'pending'
    and private.is_workspace_admin(wi.workspace_id);

  if not found then
    raise exception 'Invitation not found or permission denied';
  end if;
end;
$$;

revoke all on function public.create_workspace_invitation(text, text, text, text) from public, anon;
revoke all on function public.accept_workspace_invitation(uuid) from public, anon;
revoke all on function public.decline_workspace_invitation(uuid) from public, anon;
revoke all on function public.resend_workspace_invitation(uuid) from public, anon;
revoke all on function public.revoke_workspace_invitation(uuid) from public, anon;

grant execute on function public.create_workspace_invitation(text, text, text, text) to authenticated;
grant execute on function public.accept_workspace_invitation(uuid) to authenticated;
grant execute on function public.decline_workspace_invitation(uuid) to authenticated;
grant execute on function public.resend_workspace_invitation(uuid) to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated;
