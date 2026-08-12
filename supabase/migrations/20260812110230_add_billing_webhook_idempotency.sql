create table if not exists public.billing_webhook_events (
  provider text not null default 'stripe',
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload_version text,
  primary key (provider, event_id)
);

alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from anon, authenticated;
