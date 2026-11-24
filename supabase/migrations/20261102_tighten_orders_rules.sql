-- Orders: only sellers change an order's status (and only that column);
-- nobody deletes orders or inserts them directly (checkout uses
-- create_order_transaction, which runs with its own permissions).

drop policy if exists "Allow update orders" on public.orders;
drop policy if exists "Allow delete orders" on public.orders;
drop policy if exists "Sellers update own orders" on public.orders;

create policy "Sellers update own orders" on public.orders
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

revoke insert, update, delete on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;