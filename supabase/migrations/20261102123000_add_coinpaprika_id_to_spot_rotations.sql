alter table public.spot_rotations
  add column if not exists coinpaprika_id text;

comment on column public.spot_rotations.coinpaprika_id is
  'CoinPaprika coin ID for manually selected assets; null for legacy or manually entered pairs.';
