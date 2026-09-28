create policy "Users can view their own exchange connections"
on public.exchange_connections
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own exchange connections"
on public.exchange_connections
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own exchange connections"
on public.exchange_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own exchange connections"
on public.exchange_connections
for delete
to authenticated
using (auth.uid() = user_id);