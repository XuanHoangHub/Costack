begin;

-- Older environments may already have billing_orders from before the native
-- VietQR checkout started persisting its safe return destination.
alter table public.billing_orders
  add column if not exists return_url text;

update public.billing_orders
set return_url = ''
where return_url is null;

alter table public.billing_orders
  alter column return_url set not null;

create index if not exists billing_orders_reusable_checkout_idx
  on public.billing_orders (user_id, plan, billing_cycle, return_url, expires_at desc)
  where status = 'pending' and checkout_url is not null;

comment on column public.billing_orders.return_url is
  'Validated same-origin PayOS success URL. Empty only for historical orders created before native checkout.';

-- The service role is the only writer; authenticated clients continue to see
-- only their own rows through the existing ownership SELECT policy.
grant select, insert, update on table public.billing_orders to service_role;

commit;
