begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (char_length(action) between 3 and 100),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  request_id uuid not null default gen_random_uuid(),
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc, id desc);
create index admin_audit_logs_actor_created_idx
  on public.admin_audit_logs (actor_id, created_at desc);
create index admin_audit_logs_target_created_idx
  on public.admin_audit_logs (target_type, target_id, created_at desc)
  where target_id is not null;

create table public.app_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null check (version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$'),
  channel text not null default 'stable' check (channel in ('stable', 'beta', 'canary')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'deprecated')),
  title text not null check (char_length(title) between 3 and 160),
  release_notes text not null default '' check (char_length(release_notes) <= 20000),
  rollout_percent smallint not null default 0 check (rollout_percent between 0 and 100),
  minimum_supported_version text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version, channel)
);

create index app_versions_status_channel_updated_idx
  on public.app_versions (status, channel, updated_at desc);
create unique index app_versions_one_active_per_channel_idx
  on public.app_versions (channel)
  where status = 'active';

create table public.app_admin_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,63}$'),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  description text not null default '' check (char_length(description) <= 500),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table public.admin_user_profiles (
  user_id uuid primary key,
  risk_level text not null default 'normal' check (risk_level in ('normal', 'watch', 'high')),
  tags text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 5000),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create index admin_user_profiles_risk_updated_idx
  on public.admin_user_profiles (risk_level, updated_at desc);

create or replace function public.admin_publish_app_version(
  p_version_id uuid,
  p_actor_id uuid,
  p_rollout_percent smallint default 100
)
returns public.app_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.app_versions%rowtype;
begin
  if p_actor_id <> 'd8c93bca-750a-4c79-9acc-61007b0ba261'::uuid then
    raise exception 'Unauthorized version publisher';
  end if;
  if p_rollout_percent < 1 or p_rollout_percent > 100 then
    raise exception 'Rollout percent must be between 1 and 100';
  end if;

  select * into target
  from public.app_versions
  where id = p_version_id
  for update;
  if not found then raise exception 'Version not found'; end if;

  update public.app_versions
  set status = 'deprecated'
  where channel = target.channel and status = 'active' and id <> target.id;

  update public.app_versions
  set status = 'active',
      rollout_percent = p_rollout_percent,
      published_at = coalesce(published_at, now()),
      scheduled_at = null
  where id = target.id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.admin_publish_app_version(uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.admin_publish_app_version(uuid, uuid, smallint) to service_role;

insert into public.app_admin_settings (key, value, description)
values
  ('maintenance', '{"enabled":false,"message":"Apexa đang được bảo trì. Vui lòng quay lại sau."}'::jsonb, 'Controls the public maintenance screen.'),
  ('registration', '{"enabled":true}'::jsonb, 'Controls whether new account registration is available.'),
  ('runtime', '{"status":"operational","statusMessage":"Tất cả hệ thống hoạt động bình thường."}'::jsonb, 'Public operational status displayed by the application.'),
  ('security', '{"sessionWarningMinutes":15,"adminMutationLimitPerMinute":30}'::jsonb, 'Server-enforced administrative security limits.')
on conflict (key) do nothing;

create or replace function private.touch_admin_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.reject_admin_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Admin audit records are immutable';
end;
$$;

revoke all on function private.touch_admin_updated_at() from public, anon, authenticated;
revoke all on function private.reject_admin_audit_mutation() from public, anon, authenticated;

create trigger app_versions_touch_updated_at
before update on public.app_versions
for each row execute function private.touch_admin_updated_at();

create trigger app_admin_settings_touch_updated_at
before update on public.app_admin_settings
for each row execute function private.touch_admin_updated_at();

create trigger admin_user_profiles_touch_updated_at
before update on public.admin_user_profiles
for each row execute function private.touch_admin_updated_at();

create trigger admin_audit_logs_immutable
before update or delete on public.admin_audit_logs
for each row execute function private.reject_admin_audit_mutation();

alter table public.admin_audit_logs enable row level security;
alter table public.admin_audit_logs force row level security;
alter table public.app_versions enable row level security;
alter table public.app_versions force row level security;
alter table public.app_admin_settings enable row level security;
alter table public.app_admin_settings force row level security;
alter table public.admin_user_profiles enable row level security;
alter table public.admin_user_profiles force row level security;

create policy admin_audit_logs_owner_select
on public.admin_audit_logs for select
to authenticated
using (
  (select auth.uid()) = 'd8c93bca-750a-4c79-9acc-61007b0ba261'::uuid
  and (select auth.jwt() ->> 'aal') = 'aal2'
);

create policy app_versions_owner_select
on public.app_versions for select
to authenticated
using (
  (select auth.uid()) = 'd8c93bca-750a-4c79-9acc-61007b0ba261'::uuid
  and (select auth.jwt() ->> 'aal') = 'aal2'
);

create policy app_admin_settings_owner_select
on public.app_admin_settings for select
to authenticated
using (
  (select auth.uid()) = 'd8c93bca-750a-4c79-9acc-61007b0ba261'::uuid
  and (select auth.jwt() ->> 'aal') = 'aal2'
);

create policy admin_user_profiles_owner_select
on public.admin_user_profiles for select
to authenticated
using (
  (select auth.uid()) = 'd8c93bca-750a-4c79-9acc-61007b0ba261'::uuid
  and (select auth.jwt() ->> 'aal') = 'aal2'
);

revoke all on public.admin_audit_logs, public.app_versions, public.app_admin_settings, public.admin_user_profiles from anon;
revoke all on public.admin_audit_logs, public.app_versions, public.app_admin_settings, public.admin_user_profiles from authenticated;
grant select on public.admin_audit_logs, public.app_versions, public.app_admin_settings, public.admin_user_profiles to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_audit_logs'
    ) then
      alter publication supabase_realtime add table public.admin_audit_logs;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_versions'
    ) then
      alter publication supabase_realtime add table public.app_versions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_admin_settings'
    ) then
      alter publication supabase_realtime add table public.app_admin_settings;
    end if;
  end if;
end
$$;

comment on table public.admin_audit_logs is 'Immutable audit trail for server-authorized administrative actions.';
comment on table public.app_versions is 'Application release, rollout, and compatibility registry.';
comment on table public.app_admin_settings is 'Administrative runtime settings; public exposure is filtered through a server API.';
comment on table public.admin_user_profiles is 'Private administrative notes and risk labels for application users.';

commit;
