create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  source text not null default 'landing' check (char_length(source) between 1 and 64),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_length check (char_length(email) between 3 and 320),
  constraint newsletter_subscribers_email_format check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

alter table public.newsletter_subscribers enable row level security;

-- Subscriptions are written only by the server route with the secret key.
-- No anon/authenticated policy is intentionally defined.
revoke all on public.newsletter_subscribers from public, anon, authenticated;
revoke all on sequence public.newsletter_subscribers_id_seq from public, anon, authenticated;
