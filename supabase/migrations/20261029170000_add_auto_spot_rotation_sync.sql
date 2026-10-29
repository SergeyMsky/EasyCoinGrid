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
    user_id, symbol, buy_order_id, buy_price, buy_qty, status,
    sell_order_id, sell_price, sold_qty, fee_amount,
    realized_pnl_usd, realized_pnl_percent, match_type
  )
  select
    auth.uid(), rows.symbol, rows.buy_order_id, rows.buy_price, rows.buy_qty, rows.status,
    rows.sell_order_id, rows.sell_price, rows.sold_qty, rows.fee_amount,
    rows.realized_pnl_usd, rows.realized_pnl_percent, 'AUTO_API'
  from jsonb_to_recordset(p_rotations) as rows(
    symbol text,
    buy_order_id text,
    buy_price numeric,
    buy_qty numeric,
    status text,
    sell_order_id text,
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
