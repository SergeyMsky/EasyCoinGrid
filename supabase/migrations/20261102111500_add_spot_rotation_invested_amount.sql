alter table public.spot_rotations
  add column invested_amount numeric(30, 12) check (invested_amount is null or invested_amount > 0);

comment on column public.spot_rotations.invested_amount is
  'User-entered invested amount in USD; NULL for older or imported rows without a recorded stake.';
