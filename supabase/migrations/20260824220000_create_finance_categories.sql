-- Applied to the Apexa Supabase project as migration version 20260824220000.

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  type text not null check (type in ('income', 'expense', 'both')),
  color text not null default '#6366f1',
  icon text not null default 'Tag',
  description text not null default '',
  sort_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name, type)
);

create index if not exists finance_categories_workspace_idx on public.finance_categories (workspace_id, type, sort_order);

drop trigger if exists finance_categories_touch_updated_at on public.finance_categories;
create trigger finance_categories_touch_updated_at before update on public.finance_categories
for each row execute function private.touch_finance_updated_at();

alter table public.finance_categories enable row level security;

drop policy if exists finance_categories_select on public.finance_categories;
create policy finance_categories_select on public.finance_categories for select to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists finance_categories_insert on public.finance_categories;
create policy finance_categories_insert on public.finance_categories for insert to authenticated
with check (private.can_edit_workspace(workspace_id));

drop policy if exists finance_categories_update on public.finance_categories;
create policy finance_categories_update on public.finance_categories for update to authenticated
using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));

drop policy if exists finance_categories_delete on public.finance_categories;
create policy finance_categories_delete on public.finance_categories for delete to authenticated
using (private.can_edit_workspace(workspace_id));

grant select, insert, update, delete on public.finance_categories to authenticated;
revoke all on public.finance_categories from anon;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'finance_categories'
  ) then
    alter publication supabase_realtime add table public.finance_categories;
  end if;
end $$;
