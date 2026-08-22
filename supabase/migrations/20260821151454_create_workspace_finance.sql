-- Applied to the Apexa Supabase project as migration version 20260821151454.
create schema if not exists private;

create or replace function private.can_edit_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = target_workspace_id
          and wm.user_id = (select auth.uid())
          and wm.status = 'active'
          and wm.role in ('owner', 'admin', 'member')
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = target_workspace_id
          and w.user_id = (select auth.uid())
      )
    );
$$;

revoke all on function private.can_edit_workspace(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_edit_workspace(text) to authenticated;

create table public.finance_profiles (
  workspace_id text primary key references public.workspaces(id) on delete cascade,
  entity_type text not null default 'business' check (entity_type in ('individual', 'organization', 'business')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  currency text not null default 'VND' check (currency in ('VND', 'USD', 'EUR')),
  enabled_tabs text[] not null default array['cashbook', 'invoices', 'debts', 'budgets', 'reports', 'ai-agent'],
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  bank text not null check (char_length(btrim(bank)) between 1 and 120),
  branch text not null default '',
  account_number text not null check (char_length(btrim(account_number)) between 1 and 80),
  balance numeric(20, 2) not null default 0,
  account_type text not null default 'Tài khoản thanh toán',
  color text not null default 'blue',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, account_number)
);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  code text not null,
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  category text not null check (char_length(btrim(category)) between 1 and 160),
  amount numeric(20, 2) not null check (amount > 0),
  transaction_date date not null default current_date,
  account_id uuid not null references public.finance_accounts(id),
  account_label text not null,
  partner text not null default '',
  receiver_or_payer text not null default '',
  address text not null default '',
  debit_account text not null default '',
  credit_account text not null default '',
  note text not null default '',
  status text not null default 'approved' check (status in ('approved', 'pending', 'draft')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code)
);

create table public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  code text not null,
  form_number text not null default '',
  serial_number text not null default '',
  invoice_type text not null check (invoice_type in ('out', 'in')),
  partner_name text not null check (char_length(btrim(partner_name)) between 1 and 200),
  tax_code text not null default '',
  address text not null default '',
  subtotal numeric(20, 2) not null default 0 check (subtotal >= 0),
  vat_rate numeric(5, 2) not null default 0 check (vat_rate between 0 and 100),
  vat_amount numeric(20, 2) not null default 0 check (vat_amount >= 0),
  total numeric(20, 2) not null default 0 check (total >= 0),
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'pending_verification' check (status in ('valid', 'pending_verification', 'cancelled', 'paid', 'overdue')),
  signed boolean not null default false,
  tct_code text,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code)
);

create table public.finance_debts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  partner_name text not null check (char_length(btrim(partner_name)) between 1 and 200),
  debt_type text not null check (debt_type in ('receivable', 'payable')),
  total_amount numeric(20, 2) not null check (total_amount >= 0),
  paid_amount numeric(20, 2) not null default 0 check (paid_amount >= 0 and paid_amount <= total_amount),
  due_date date not null,
  aging_bucket text not null default 'current' check (aging_bucket in ('current', '1-30', '31-60', 'over-60')),
  contact_phone text not null default '',
  contact_email text not null default '',
  status text not null default 'normal' check (status in ('normal', 'due_soon', 'overdue')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  department text not null check (char_length(btrim(department)) between 1 and 160),
  category text not null check (char_length(btrim(category)) between 1 and 160),
  allocated_amount numeric(20, 2) not null check (allocated_amount > 0),
  spent_amount numeric(20, 2) not null default 0 check (spent_amount >= 0),
  period_label text not null,
  manager text not null default '',
  status text not null default 'under' check (status in ('under', 'warning', 'exceeded')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index finance_transactions_workspace_date_idx on public.finance_transactions (workspace_id, transaction_date desc);
create index finance_invoices_workspace_date_idx on public.finance_invoices (workspace_id, issue_date desc);
create index finance_debts_workspace_due_idx on public.finance_debts (workspace_id, due_date);
create index finance_budgets_workspace_created_idx on public.finance_budgets (workspace_id, created_at desc);
create index finance_accounts_workspace_created_idx on public.finance_accounts (workspace_id, created_at);

create or replace function private.touch_finance_updated_at()
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

create trigger finance_profiles_touch_updated_at before update on public.finance_profiles
for each row execute function private.touch_finance_updated_at();
create trigger finance_accounts_touch_updated_at before update on public.finance_accounts
for each row execute function private.touch_finance_updated_at();
create trigger finance_transactions_touch_updated_at before update on public.finance_transactions
for each row execute function private.touch_finance_updated_at();
create trigger finance_invoices_touch_updated_at before update on public.finance_invoices
for each row execute function private.touch_finance_updated_at();
create trigger finance_debts_touch_updated_at before update on public.finance_debts
for each row execute function private.touch_finance_updated_at();
create trigger finance_budgets_touch_updated_at before update on public.finance_budgets
for each row execute function private.touch_finance_updated_at();

alter table public.finance_profiles enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_invoices enable row level security;
alter table public.finance_debts enable row level security;
alter table public.finance_budgets enable row level security;

create policy finance_profiles_select on public.finance_profiles for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy finance_profiles_insert on public.finance_profiles for insert to authenticated
with check (updated_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_profiles_update on public.finance_profiles for update to authenticated
using (private.can_edit_workspace(workspace_id))
with check (updated_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_profiles_delete on public.finance_profiles for delete to authenticated
using (private.is_workspace_admin(workspace_id));

create policy finance_accounts_select on public.finance_accounts for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy finance_accounts_insert on public.finance_accounts for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_accounts_update on public.finance_accounts for update to authenticated
using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy finance_accounts_delete on public.finance_accounts for delete to authenticated
using (private.can_edit_workspace(workspace_id));

create policy finance_transactions_select on public.finance_transactions for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy finance_transactions_insert on public.finance_transactions for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_transactions_update on public.finance_transactions for update to authenticated
using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy finance_transactions_delete on public.finance_transactions for delete to authenticated
using (private.can_edit_workspace(workspace_id));

create policy finance_invoices_select on public.finance_invoices for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy finance_invoices_insert on public.finance_invoices for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_invoices_update on public.finance_invoices for update to authenticated
using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy finance_invoices_delete on public.finance_invoices for delete to authenticated
using (private.can_edit_workspace(workspace_id));

create policy finance_debts_select on public.finance_debts for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy finance_debts_insert on public.finance_debts for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_debts_update on public.finance_debts for update to authenticated
using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy finance_debts_delete on public.finance_debts for delete to authenticated
using (private.can_edit_workspace(workspace_id));

create policy finance_budgets_select on public.finance_budgets for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy finance_budgets_insert on public.finance_budgets for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_edit_workspace(workspace_id));
create policy finance_budgets_update on public.finance_budgets for update to authenticated
using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy finance_budgets_delete on public.finance_budgets for delete to authenticated
using (private.can_edit_workspace(workspace_id));

grant select, insert, update, delete on public.finance_profiles to authenticated;
grant select, insert, update, delete on public.finance_accounts to authenticated;
grant select, insert, update, delete on public.finance_transactions to authenticated;
grant select, insert, update, delete on public.finance_invoices to authenticated;
grant select, insert, update, delete on public.finance_debts to authenticated;
grant select, insert, update, delete on public.finance_budgets to authenticated;
revoke all on public.finance_profiles, public.finance_accounts, public.finance_transactions,
  public.finance_invoices, public.finance_debts, public.finance_budgets from anon;

create or replace function public.record_finance_transaction(
  p_workspace_id text,
  p_account_id uuid,
  p_code text,
  p_transaction_type text,
  p_category text,
  p_amount numeric,
  p_transaction_date date,
  p_partner text,
  p_receiver_or_payer text,
  p_address text,
  p_debit_account text,
  p_credit_account text,
  p_note text
)
returns public.finance_transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_account public.finance_accounts;
  recorded_transaction public.finance_transactions;
begin
  if not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Permission denied';
  end if;
  if p_transaction_type not in ('income', 'expense') or p_amount <= 0 then
    raise exception 'Invalid transaction';
  end if;

  select * into selected_account
  from public.finance_accounts
  where id = p_account_id and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Finance account not found';
  end if;

  insert into public.finance_transactions (
    workspace_id, code, transaction_type, category, amount, transaction_date,
    account_id, account_label, partner, receiver_or_payer, address,
    debit_account, credit_account, note, status, created_by
  ) values (
    p_workspace_id, p_code, p_transaction_type, btrim(p_category), p_amount, p_transaction_date,
    p_account_id, selected_account.bank || ' (' || selected_account.account_number || ')',
    btrim(p_partner), btrim(p_receiver_or_payer), btrim(p_address),
    btrim(p_debit_account), btrim(p_credit_account), btrim(p_note), 'approved', (select auth.uid())
  ) returning * into recorded_transaction;

  update public.finance_accounts
  set balance = balance + case when p_transaction_type = 'income' then p_amount else -p_amount end
  where id = p_account_id;

  return recorded_transaction;
end;
$$;

revoke all on function public.record_finance_transaction(text, uuid, text, text, text, numeric, date, text, text, text, text, text, text) from public, anon;
grant execute on function public.record_finance_transaction(text, uuid, text, text, text, numeric, date, text, text, text, text, text, text) to authenticated;

alter publication supabase_realtime add table public.finance_profiles, public.finance_accounts,
  public.finance_transactions, public.finance_invoices, public.finance_debts, public.finance_budgets;
