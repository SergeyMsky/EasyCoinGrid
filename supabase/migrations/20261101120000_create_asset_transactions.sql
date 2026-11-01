create table public.asset_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (length(btrim(source)) > 0),
  external_id text not null,
  group_id text,
  event_type text not null check (length(btrim(event_type)) > 0),
  direction text not null check (direction in ('IN', 'OUT', 'INTERNAL')),
  asset text not null,
  amount numeric(38, 18) not null check (amount > 0),
  fee_amount numeric(38, 18) not null default 0 check (fee_amount >= 0),
  fee_asset text,
  occurred_at timestamptz not null,
  status text not null,
  network text,
  transaction_id text,
  source_wallet text,
  target_wallet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_transactions_user_source_external_key unique (user_id, source, external_id)
);

create index asset_transactions_user_time_idx
  on public.asset_transactions (user_id, occurred_at desc, id desc);

comment on table public.asset_transactions is
  'Canonical per-asset movement ledger. Amounts are positive; direction describes the flow, and group_id links related movement legs.';

alter table public.asset_transactions enable row level security;

create policy "Users can view their own asset transactions"
  on public.asset_transactions for select to authenticated
  using (auth.uid() = user_id);
