drop policy if exists "Users can create their own spot rotations" on public.spot_rotations;
drop policy if exists "Users can update their own spot rotations" on public.spot_rotations;
drop policy if exists "Users can delete their own spot rotations" on public.spot_rotations;

create policy "Users can create their own manual spot rotations"
  on public.spot_rotations for insert to authenticated
  with check (auth.uid() = user_id and match_type = 'MANUAL');

create policy "Users can update their own manual spot rotations"
  on public.spot_rotations for update to authenticated
  using (auth.uid() = user_id and match_type = 'MANUAL')
  with check (auth.uid() = user_id and match_type = 'MANUAL');

create policy "Users can delete their own manual spot rotations"
  on public.spot_rotations for delete to authenticated
  using (auth.uid() = user_id and match_type = 'MANUAL');

drop function if exists public.sync_auto_spot_rotations(text[], jsonb);

create function public.sync_auto_spot_rotations(
  p_user_id uuid,
  p_symbols text[],
  p_rotations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Automatic spot rotation sync is only available to the server.';
  end if;
  if p_user_id is null or p_symbols is null or p_rotations is null or jsonb_typeof(p_rotations) <> 'array' then
    raise exception 'Invalid automatic rotation sync payload.';
  end if;
  if cardinality(p_symbols) > 100 then
    raise exception 'Automatic rotation sync is limited to 100 symbols.';
  end if;
  if pg_catalog.array_position(p_symbols, null) is not null
    or exists (
      select 1
      from pg_catalog.unnest(p_symbols) as requested(symbol)
      where requested.symbol !~ '^[A-Z0-9]{1,40}$'
    )
    or cardinality(p_symbols) <> (
      select count(distinct requested.symbol)
      from pg_catalog.unnest(p_symbols) as requested(symbol)
    ) then
    raise exception 'Automatic rotation sync contains invalid or duplicate symbols.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_rotations) as rows(
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
    where rows.symbol is null
      or rows.symbol !~ '^[A-Z0-9]{1,40}$'
      or not (rows.symbol = any(p_symbols))
      or rows.buy_order_id is null
      or rows.buy_order_id = ''
      or rows.buy_trade_id is null
      or rows.buy_trade_id = ''
      or rows.buy_time is null
      or rows.buy_price is null
      or rows.buy_price::text in ('NaN', 'Infinity', '-Infinity')
      or rows.buy_price <= 0
      or rows.buy_qty is null
      or rows.buy_qty::text in ('NaN', 'Infinity', '-Infinity')
      or rows.buy_qty <= 0
      or rows.status is null
      or rows.status not in ('OPEN', 'CLOSED')
      or rows.sold_qty is null
      or rows.sold_qty::text in ('NaN', 'Infinity', '-Infinity')
      or rows.sold_qty < 0
      or rows.sold_qty > rows.buy_qty
      or rows.fee_amount is null
      or rows.fee_amount::text in ('NaN', 'Infinity', '-Infinity')
      or rows.fee_amount < 0
      or (
        rows.status = 'CLOSED'
        and (
          rows.sell_order_id is null
          or rows.sell_trade_id is null
          or rows.sell_time is null
          or rows.sell_price is null
          or rows.sell_price::text in ('NaN', 'Infinity', '-Infinity')
          or rows.sell_price <= 0
          or rows.sold_qty <= 0
          or rows.realized_pnl_usd is null
          or rows.realized_pnl_usd::text in ('NaN', 'Infinity', '-Infinity')
          or rows.realized_pnl_percent is null
          or rows.realized_pnl_percent::text in ('NaN', 'Infinity', '-Infinity')
        )
      )
      or (
        rows.status = 'OPEN'
        and (
          rows.sell_order_id is not null
          or rows.sell_trade_id is not null
          or rows.sell_time is not null
          or rows.sell_price is not null
          or rows.sold_qty <> 0
          or rows.realized_pnl_usd is not null
          or rows.realized_pnl_percent is not null
        )
      )
  ) then
    raise exception 'Automatic rotation sync contains invalid trade data.';
  end if;

  if cardinality(p_symbols) = 0 then
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text));

  delete from public.spot_rotations
    where user_id = p_user_id
      and match_type = 'AUTO_API'
      and symbol = any(p_symbols);

  insert into public.spot_rotations (
    user_id, symbol, buy_order_id, buy_trade_id, buy_time, buy_price, buy_qty, status,
    sell_order_id, sell_trade_id, sell_time, sell_price, sold_qty, fee_amount,
    realized_pnl_usd, realized_pnl_percent, match_type
  )
  select
    p_user_id, rows.symbol, rows.buy_order_id, rows.buy_trade_id, rows.buy_time, rows.buy_price, rows.buy_qty, rows.status,
    rows.sell_order_id, rows.sell_trade_id, rows.sell_time, rows.sell_price, rows.sold_qty, rows.fee_amount,
    rows.realized_pnl_usd, rows.realized_pnl_percent, 'AUTO_API'
  from pg_catalog.jsonb_to_recordset(p_rotations) as rows(
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
  );
end;
$$;

revoke all on function public.sync_auto_spot_rotations(uuid, text[], jsonb) from public, anon, authenticated;
grant execute on function public.sync_auto_spot_rotations(uuid, text[], jsonb) to service_role;
