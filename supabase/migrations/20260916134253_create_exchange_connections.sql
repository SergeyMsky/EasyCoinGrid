create table public.exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exchange text not null check (exchange = 'binance'),
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  status text not null default 'connected'
    check (status in ('connected', 'error', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, exchange)
);

alter table public.exchange_connections enable row level security;