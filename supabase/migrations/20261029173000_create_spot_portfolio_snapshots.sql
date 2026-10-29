create table public.spot_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_at timestamptz not null,
  total_value_usd numeric(30, 8) not null check (total_value_usd >= 0),
  source text not null check (source in ('BINANCE_DAILY', 'APP_OBSERVED')),
  source_snapshot_id text,
  created_at timestamptz not null default now()
);

create unique index spot_portfolio_snapshots_source_idx
  on public.spot_portfolio_snapshots (user_id, source_snapshot_id);

create index spot_portfolio_snapshots_user_time_idx
  on public.spot_portfolio_snapshots (user_id, snapshot_at desc);

alter table public.spot_portfolio_snapshots enable row level security;

create policy "Users can view their own Spot portfolio snapshots"
  on public.spot_portfolio_snapshots for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own Spot portfolio snapshots"
  on public.spot_portfolio_snapshots for insert to authenticated
  with check (auth.uid() = user_id);
