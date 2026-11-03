alter table public.spot_rotations
  add column if not exists coingecko_id text;

comment on column public.spot_rotations.coingecko_id is
  'CoinGecko coin ID for manually selected assets; null for legacy or manually entered pairs.';
