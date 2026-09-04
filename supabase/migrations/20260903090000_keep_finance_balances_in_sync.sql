-- Keep account balances consistent for every transaction write path, including
-- direct Data API inserts/updates/deletes and the record_finance_transaction RPC.

create or replace function private.sync_finance_transaction_balance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_account public.finance_accounts;
begin
  if tg_op = 'INSERT' then
    if not private.can_edit_workspace(new.workspace_id) then
      raise exception 'Permission denied';
    end if;

    select * into selected_account
    from public.finance_accounts
    where id = new.account_id
      and workspace_id = new.workspace_id
    for update;

    if not found then
      raise exception 'Finance account not found in this workspace';
    end if;

    new.account_label := selected_account.bank || ' (' || selected_account.account_number || ')';
    if new.status = 'approved' then
      update public.finance_accounts
      set balance = balance + case when new.transaction_type = 'income' then new.amount else -new.amount end
      where id = new.account_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if not private.can_edit_workspace(old.workspace_id)
      or not private.can_edit_workspace(new.workspace_id) then
      raise exception 'Permission denied';
    end if;

    perform 1
    from public.finance_accounts
    where (id = old.account_id and workspace_id = old.workspace_id)
       or (id = new.account_id and workspace_id = new.workspace_id)
    order by id
    for update;

    select * into selected_account
    from public.finance_accounts
    where id = new.account_id
      and workspace_id = new.workspace_id;

    if not found then
      raise exception 'Finance account not found in this workspace';
    end if;

    new.account_label := selected_account.bank || ' (' || selected_account.account_number || ')';
    if old.status = 'approved' then
      update public.finance_accounts
      set balance = balance - case when old.transaction_type = 'income' then old.amount else -old.amount end
      where id = old.account_id;
    end if;
    if new.status = 'approved' then
      update public.finance_accounts
      set balance = balance + case when new.transaction_type = 'income' then new.amount else -new.amount end
      where id = new.account_id;
    end if;
    return new;
  end if;

  if not private.can_edit_workspace(old.workspace_id) then
    raise exception 'Permission denied';
  end if;

  perform 1
  from public.finance_accounts
  where id = old.account_id
    and workspace_id = old.workspace_id
  for update;

  if not found then
    raise exception 'Finance account not found in this workspace';
  end if;

  if old.status = 'approved' then
    update public.finance_accounts
    set balance = balance - case when old.transaction_type = 'income' then old.amount else -old.amount end
    where id = old.account_id;
  end if;
  return old;
end;
$$;

drop trigger if exists finance_transactions_sync_balance on public.finance_transactions;
create trigger finance_transactions_sync_balance
before insert or update or delete on public.finance_transactions
for each row execute function private.sync_finance_transaction_balance();

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
  recorded_transaction public.finance_transactions;
begin
  if not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Permission denied';
  end if;
  if p_transaction_type not in ('income', 'expense') or p_amount <= 0 then
    raise exception 'Invalid transaction';
  end if;

  insert into public.finance_transactions (
    workspace_id, code, transaction_type, category, amount, transaction_date,
    account_id, account_label, partner, receiver_or_payer, address,
    debit_account, credit_account, note, status, created_by
  ) values (
    p_workspace_id, p_code, p_transaction_type, btrim(p_category), p_amount, p_transaction_date,
    p_account_id, '', btrim(p_partner), btrim(p_receiver_or_payer), btrim(p_address),
    btrim(p_debit_account), btrim(p_credit_account), btrim(p_note), 'approved', (select auth.uid())
  ) returning * into recorded_transaction;

  return recorded_transaction;
end;
$$;

revoke all on function public.record_finance_transaction(text, uuid, text, text, text, numeric, date, text, text, text, text, text, text)
from public, anon;
grant execute on function public.record_finance_transaction(text, uuid, text, text, text, numeric, date, text, text, text, text, text, text)
to authenticated;
