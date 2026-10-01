-- Restricts decrement_product_inventory: callers must be the signed-in buyer
-- with the product in their own cart (or the service role), and anonymous
-- access is removed.

create or replace function public.decrement_product_inventory(
  p_product_id uuid,
  p_quantity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stock integer;
  v_next_stock integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  if coalesce(auth.role(), '') <> 'service_role' then
    if auth.uid() is null or not exists (
      select 1 from public.cart c
      where c.user_id = auth.uid()
        and c.product_id = p_product_id
        and c.quantity >= p_quantity
    ) then
      raise exception 'Not allowed to reduce stock for this product.';
    end if;
  end if;

  select coalesce(stock_quantity, quantity, 0)
  into v_current_stock
  from public.products
  where id = p_product_id
  for update;

  if v_current_stock is null then
    raise exception 'Product not found.';
  end if;

  if v_current_stock < p_quantity then
    raise exception 'Only % items left in stock.', v_current_stock;
  end if;

  v_next_stock := greatest(v_current_stock - p_quantity, 0);

  update public.products
  set
    stock_quantity = v_next_stock,
    quantity = v_next_stock,
    status = case when v_next_stock <= 0 then 'sold' else status end
  where id = p_product_id;

  return true;
end;
$$;

revoke execute on function public.decrement_product_inventory(uuid, integer) from public, anon;
grant execute on function public.decrement_product_inventory(uuid, integer) to authenticated;