alter table public.spot_rotations
  add column buy_trade_id text,
  add column buy_time timestamptz,
  add column sell_trade_id text,
  add column sell_time timestamptz;

drop function if exists public.close_spot_rotation(uuid, numeric, numeric, numeric);

create or replace function public.close_spot_rotation(
  p_rotation_id uuid,
  p_sell_price numeric,
  p_sold_qty numeric,
  p_sell_fee_usd numeric,
  p_sell_trade_id text,
  p_sell_time timestamptz
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
  if p_sell_price is null or p_sell_price <= 0 or p_sold_qty is null or p_sold_qty <= 0
    or p_sell_fee_usd is null or p_sell_fee_usd < 0 or p_sell_time is null then
    raise exception 'Sell price and quantity must be positive, and execution time and valid fee are required.';
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
  if v_rotation.match_type = 'AUTO_API' then
    raise exception 'Binance rotations are closed automatically from trade history.';
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
        sell_trade_id = p_sell_trade_id,
        sell_time = p_sell_time,
        sell_price = p_sell_price,
        fee_amount = v_total_fee,
        realized_pnl_usd = v_realized_pnl,
        realized_pnl_percent = v_realized_pnl / (v_rotation.buy_price * p_sold_qty) * 100,
        match_type = 'MANUAL'
    where id = p_rotation_id;

  if p_sold_qty < v_remaining_qty then
    insert into public.spot_rotations (
      user_id, symbol, buy_order_id, buy_trade_id, buy_time, buy_price, buy_qty, status,
      sell_order_id, sell_trade_id, sell_time, sell_price, sold_qty, fee_amount,
      realized_pnl_usd, realized_pnl_percent, match_type, created_at
    ) values (
      v_rotation.user_id, v_rotation.symbol, v_rotation.buy_order_id, v_rotation.buy_trade_id,
      v_rotation.buy_time, v_rotation.buy_price, v_remaining_qty - p_sold_qty, 'OPEN',
      null, null, null, null, 0, v_remaining_fee,
      null, null, v_rotation.match_type, v_rotation.created_at
    );
  end if;
end;
$$;

revoke all on function public.close_spot_rotation(uuid, numeric, numeric, numeric, text, timestamptz) from public;
grant execute on function public.close_spot_rotation(uuid, numeric, numeric, numeric, text, timestamptz) to authenticated;

create or replace function public.sync_auto_spot_rotations(
  p_symbols text[],
  p_rotations jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if p_symbols is null or p_rotations is null or jsonb_typeof(p_rotations) <> 'array' then
    raise exception 'Invalid automatic rotation sync payload.';
  end if;
  if cardinality(p_symbols) > 100 then
    raise exception 'Automatic rotation sync is limited to 100 symbols.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(auth.uid()::text));

  delete from public.spot_rotations
    where user_id = auth.uid()
      and match_type = 'AUTO_API'
      and symbol = any(p_symbols);

  insert into public.spot_rotations (
    user_id, symbol, buy_order_id, buy_trade_id, buy_time, buy_price, buy_qty, status,
    sell_order_id, sell_trade_id, sell_time, sell_price, sold_qty, fee_amount,
    realized_pnl_usd, realized_pnl_percent, match_type
  )
  select
    auth.uid(), rows.symbol, rows.buy_order_id, rows.buy_trade_id, rows.buy_time, rows.buy_price, rows.buy_qty, rows.status,
    rows.sell_order_id, rows.sell_trade_id, rows.sell_time, rows.sell_price, rows.sold_qty, rows.fee_amount,
    rows.realized_pnl_usd, rows.realized_pnl_percent, 'AUTO_API'
  from jsonb_to_recordset(p_rotations) as rows(
    symbol text,
    buy_order_id text,
    buy_trade_id text,
    buy_time timestamptz,
    buy_price numeric,
    buy_qty numeric,
    status text,
    sell_order_id text,
    sell_trade_id text,
    sell_time timestamptz,
    sell_price numeric,
    sold_qty numeric,
    fee_amount numeric,
    realized_pnl_usd numeric,
    realized_pnl_percent numeric
  )
  where rows.symbol = any(p_symbols);
end;
$$;

revoke all on function public.sync_auto_spot_rotations(text[], jsonb) from public;
grant execute on function public.sync_auto_spot_rotations(text[], jsonb) to authenticated;
