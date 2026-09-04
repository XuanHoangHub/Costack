create table if not exists public.base_apps (
  id text primary key,
  workspace_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text default '📋',
  description text default '',
  tables jsonb default '[]'::jsonb,
  active_table_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.base_apps enable row level security;

create policy "Users can view base_apps in their workspaces or own"
  on public.base_apps for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_memberships wm
      where wm.workspace_id = base_apps.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Users can insert their own base_apps"
  on public.base_apps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own base_apps"
  on public.base_apps for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_memberships wm
      where wm.workspace_id = base_apps.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_memberships wm
      where wm.workspace_id = base_apps.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  );

create policy "Users can delete their own base_apps"
  on public.base_apps for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_memberships wm
      where wm.workspace_id = base_apps.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );
