begin;

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_plan_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_plan_check
  check (plan in ('starter', 'pro', 'business', 'enterprise')) not valid;

alter table public.billing_subscriptions
  validate constraint billing_subscriptions_plan_check;

comment on column public.billing_subscriptions.plan is
  'Paid Apexa plan: starter, pro, business, or enterprise. Free users have no active subscription row.';

commit;
