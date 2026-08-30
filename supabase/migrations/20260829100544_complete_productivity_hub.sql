begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  history jsonb not null default '{}'::jsonb check (jsonb_typeof(history) = 'object'),
  streak integer not null default 0 check (streak >= 0 and streak <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.focus_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  type text not null check (type in ('work', 'short', 'long')),
  "timestamp" timestamptz not null default now(),
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists habits_user_updated_idx
  on public.habits (user_id, updated_at desc);

create index if not exists focus_sessions_user_timestamp_idx
  on public.focus_sessions (user_id, "timestamp" desc);

create or replace function private.touch_productivity_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_productivity_updated_at() from public, anon, authenticated;

drop trigger if exists habits_touch_updated_at on public.habits;
create trigger habits_touch_updated_at
before update on public.habits
for each row execute function private.touch_productivity_updated_at();

drop trigger if exists focus_sessions_touch_updated_at on public.focus_sessions;
create trigger focus_sessions_touch_updated_at
before update on public.focus_sessions
for each row execute function private.touch_productivity_updated_at();

alter table public.habits enable row level security;
alter table public.focus_sessions enable row level security;

revoke all on table public.habits from anon, authenticated;
revoke all on table public.focus_sessions from anon, authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.focus_sessions to authenticated;

drop policy if exists "Users can view their own habits" on public.habits;
create policy "Users can view their own habits"
on public.habits for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own habits" on public.habits;
create policy "Users can create their own habits"
on public.habits for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own habits" on public.habits;
create policy "Users can update their own habits"
on public.habits for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own habits" on public.habits;
create policy "Users can delete their own habits"
on public.habits for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own focus sessions" on public.focus_sessions;
create policy "Users can view their own focus sessions"
on public.focus_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own focus sessions" on public.focus_sessions;
create policy "Users can create their own focus sessions"
on public.focus_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own focus sessions" on public.focus_sessions;
create policy "Users can update their own focus sessions"
on public.focus_sessions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own focus sessions" on public.focus_sessions;
create policy "Users can delete their own focus sessions"
on public.focus_sessions for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.habits is 'Per-user habit tracking with offline-compatible daily check-in history.';
comment on table public.focus_sessions is 'Per-user completed Pomodoro and focus-session history.';

commit;
