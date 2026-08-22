alter table public.finance_invoices
add column paid_amount numeric(20, 2) not null default 0;

update public.finance_invoices
set paid_amount = total
where status = 'paid';

alter table public.finance_invoices
add constraint finance_invoices_paid_amount_check
check (paid_amount >= 0 and paid_amount <= total);

alter table public.finance_invoices
drop constraint finance_invoices_status_check;

alter table public.finance_invoices
add constraint finance_invoices_status_check
check (status in ('valid', 'pending_verification', 'partially_paid', 'cancelled', 'paid', 'overdue'));

create table public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  debt_id uuid references public.finance_debts(id) on delete cascade,
  invoice_id uuid references public.finance_invoices(id) on delete cascade,
  amount numeric(20, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'bank_transfer'
    check (payment_method in ('bank_transfer', 'cash', 'card', 'other')),
  reference_code text not null default '',
  note text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint finance_payments_single_target_check check (
    ((debt_id is not null)::integer + (invoice_id is not null)::integer) = 1
  )
);

create index finance_payments_workspace_created_idx
on public.finance_payments (workspace_id, created_at desc);

create index finance_payments_debt_date_idx
on public.finance_payments (debt_id, payment_date desc)
where debt_id is not null;

create index finance_payments_invoice_date_idx
on public.finance_payments (invoice_id, payment_date desc)
where invoice_id is not null;

alter table public.finance_payments enable row level security;

create policy finance_payments_select
on public.finance_payments for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy finance_payments_insert
on public.finance_payments for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.can_edit_workspace(workspace_id)
);

grant select, insert on public.finance_payments to authenticated;
revoke all on public.finance_payments from anon;

create or replace function private.apply_finance_payment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_total numeric(20, 2);
  target_paid numeric(20, 2);
  target_status text;
  next_paid numeric(20, 2);
begin
  if new.created_by is distinct from (select auth.uid())
    or not private.can_edit_workspace(new.workspace_id) then
    raise exception 'Permission denied';
  end if;

  if new.debt_id is not null then
    select total_amount, paid_amount
      into target_total, target_paid
    from public.finance_debts
    where id = new.debt_id and workspace_id = new.workspace_id
    for update;

    if not found then
      raise exception 'Finance debt not found';
    end if;

    next_paid := target_paid + new.amount;
    if next_paid > target_total then
      raise exception 'Payment exceeds remaining debt amount';
    end if;

    update public.finance_debts
    set paid_amount = next_paid,
        status = case
          when next_paid = target_total then 'normal'
          when due_date < current_date then 'overdue'
          when due_date <= current_date + 7 then 'due_soon'
          else 'normal'
        end
    where id = new.debt_id;
  else
    select total, paid_amount, status
      into target_total, target_paid, target_status
    from public.finance_invoices
    where id = new.invoice_id and workspace_id = new.workspace_id
    for update;

    if not found then
      raise exception 'Finance invoice not found';
    end if;

    if target_status in ('pending_verification', 'cancelled') then
      raise exception 'Invoice must be verified before payment';
    end if;

    next_paid := target_paid + new.amount;
    if next_paid > target_total then
      raise exception 'Payment exceeds remaining invoice amount';
    end if;

    update public.finance_invoices
    set paid_amount = next_paid,
        status = case when next_paid = target_total then 'paid' else 'partially_paid' end
    where id = new.invoice_id;
  end if;

  return new;
end;
$$;

create trigger finance_payments_apply_progress
before insert on public.finance_payments
for each row execute function private.apply_finance_payment();

create or replace function public.record_finance_payment(
  p_workspace_id text,
  p_debt_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_reference_code text,
  p_note text
)
returns public.finance_payments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recorded_payment public.finance_payments;
begin
  insert into public.finance_payments (
    workspace_id, debt_id, invoice_id, amount, payment_date,
    payment_method, reference_code, note, created_by
  ) values (
    p_workspace_id, p_debt_id, p_invoice_id, p_amount, p_payment_date,
    p_payment_method, btrim(p_reference_code), btrim(p_note), (select auth.uid())
  )
  returning * into recorded_payment;

  return recorded_payment;
end;
$$;

revoke all on function public.record_finance_payment(text, uuid, uuid, numeric, date, text, text, text)
from public, anon;
grant execute on function public.record_finance_payment(text, uuid, uuid, numeric, date, text, text, text)
to authenticated;

alter publication supabase_realtime add table public.finance_payments;
