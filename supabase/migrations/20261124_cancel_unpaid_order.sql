-- Cancels an unpaid order (no payment record yet) and gives its stock back.
create or replace function public.cancel_unpaid_order(p_order_number text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where order_number = p_order_number
  for update;

  if not found then
    return false;
  end if;

  if auth.uid() is distinct from v_order.buyer_id
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not allowed to cancel this order.';
  end if;

  if v_order.status <> 'pending' then
    return false;
  end if;

  if exists (select 1 from public.payments p where p.order_id = v_order.id) then
    return false;
  end if;

  update public.products pr
  set stock_quantity = coalesce(pr.stock_quantity, pr.quantity, 0) + oi.qty,
      quantity = coalesce(pr.stock_quantity, pr.quantity, 0) + oi.qty,
      status = case when pr.status = 'sold' then 'active' else pr.status end
  from (
    select product_id, sum(quantity) as qty
    from public.order_items
    where order_id = v_order.id
    group by product_id
  ) oi
  where pr.id = oi.product_id
    and coalesce(pr.track_inventory, true);

  update public.orders set status = 'cancelled' where id = v_order.id;

  return true;
end;
$$;

revoke execute on function public.cancel_unpaid_order(text) from public, anon;
grant execute on function public.cancel_unpaid_order(text) to authenticated;

-- A payment record may only be created for an order that is still pending.
drop policy if exists "Buyers create own pending payments" on public.payments;
create policy "Buyers create own pending payments" on public.payments
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.buyer_id = auth.uid() and o.status = 'pending'
    )
  );
