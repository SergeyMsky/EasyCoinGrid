create table public.spot_rotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  buy_order_id text,
  buy_price numeric(30, 12) not null check (buy_price > 0),
  buy_qty numeric(30, 12) not null check (buy_qty > 0),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  sell_order_id text,
  sell_price numeric(30, 12) check (sell_price > 0),
  sold_qty numeric(30, 12) not null default 0 check (sold_qty >= 0 and sold_qty <= buy_qty),
  fee_amount numeric(30, 12) not null default 0 check (fee_amount >= 0),
  realized_pnl_usd numeric(30, 12),
  realized_pnl_percent numeric(30, 12),
  match_type text not null check (match_type in ('AUTO_API', 'MANUAL')),
  created_at timestamptz not null default now(),
  constraint spot_rotations_closed_trade_fields check (
    status <> 'CLOSED'
    or ((match_type = 'MANUAL' or sell_order_id is not null) and sell_price is not null and sold_qty > 0)
  ),
  constraint spot_rotations_closed_pnl_fields check (
    status <> 'CLOSED'
    or (realized_pnl_usd is not null and realized_pnl_percent is not null)
  )
);

create index spot_rotations_user_status_idx
  on public.spot_rotations (user_id, status, created_at desc);

comment on column public.spot_rotations.buy_price is 'USD-denominated unit price.';
comment on column public.spot_rotations.sell_price is 'USD-denominated unit price.';
comment on column public.spot_rotations.fee_amount is 'Fees converted to USD; buy-side fees on open rows and total allocated fees on closed rows.';

alter table public.spot_rotations enable row level security;

create policy "Users can view their own spot rotations"
  on public.spot_rotations for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own spot rotations"
  on public.spot_rotations for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own spot rotations"
  on public.spot_rotations for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own spot rotations"
  on public.spot_rotations for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.close_spot_rotation(
  p_rotation_id uuid,
  p_sell_price numeric,
  p_sold_qty numeric,
  p_sell_fee_usd numeric
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rotation public.spot_rotations%rowtype;
  v_remaining_qty numeric;
  v_allocated_buy_fee numeric;
  v_remaining_fee numeric;
  v_total_fee numeric;
  v_realized_pnl numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if p_sell_price is null or p_sell_price <= 0 or p_sold_qty is null or p_sold_qty <= 0 or p_sell_fee_usd is null or p_sell_fee_usd < 0 then
    raise exception 'Sell price and quantity must be positive, and fees cannot be negative.';
  end if;

  select *
    into v_rotation
    from public.spot_rotations
    where id = p_rotation_id
      and user_id = auth.uid()
      and status = 'OPEN'
    for update;

  if not found then
    raise exception 'Open spot rotation not found.';
  end if;

  v_remaining_qty := v_rotation.buy_qty - v_rotation.sold_qty;
  if p_sold_qty > v_remaining_qty then
    raise exception 'Sell quantity exceeds the remaining rotation quantity.';
  end if;

  v_allocated_buy_fee := v_rotation.fee_amount * p_sold_qty / v_remaining_qty;
  v_remaining_fee := v_rotation.fee_amount - v_allocated_buy_fee;
  v_total_fee := v_allocated_buy_fee + p_sell_fee_usd;
  v_realized_pnl := (p_sell_price - v_rotation.buy_price) * p_sold_qty - v_total_fee;

  update public.spot_rotations
    set buy_qty = p_sold_qty,
        sold_qty = p_sold_qty,
        status = 'CLOSED',
        sell_order_id = null,
        sell_price = p_sell_price,
        fee_amount = v_total_fee,
        realized_pnl_usd = v_realized_pnl,
        realized_pnl_percent = v_realized_pnl / (v_rotation.buy_price * p_sold_qty) * 100,
        match_type = 'MANUAL'
    where id = p_rotation_id;

  if p_sold_qty < v_remaining_qty then
    insert into public.spot_rotations (
      user_id, symbol, buy_order_id, buy_price, buy_qty, status,
      sell_order_id, sell_price, sold_qty, fee_amount,
      realized_pnl_usd, realized_pnl_percent, match_type, created_at
    ) values (
      v_rotation.user_id, v_rotation.symbol, v_rotation.buy_order_id, v_rotation.buy_price,
      v_remaining_qty - p_sold_qty, 'OPEN', null, null, 0, v_remaining_fee,
      null, null, v_rotation.match_type, v_rotation.created_at
    );
  end if;
end;
$$;

revoke all on function public.close_spot_rotation(uuid, numeric, numeric, numeric) from public;
grant execute on function public.close_spot_rotation(uuid, numeric, numeric, numeric) to authenticated;
