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
