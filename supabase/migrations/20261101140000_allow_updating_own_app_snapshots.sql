create policy "Users can update their own observed Spot portfolio snapshots"
  on public.spot_portfolio_snapshots for update to authenticated
  using (auth.uid() = user_id and source = 'APP_OBSERVED')
  with check (auth.uid() = user_id and source = 'APP_OBSERVED');
