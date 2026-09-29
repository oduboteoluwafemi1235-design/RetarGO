-- Fixes order-time inventory decrement while preserving buyer-side RLS.
-- This function is intentionally security definer so the app can safely reduce
-- stock during checkout without granting buyers direct UPDATE rights on products.

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

grant execute on function public.decrement_product_inventory(uuid, integer) to authenticated;

-- No direct policy is added here because the expected buyer rule is enforced by
-- the existing product update policy, which only permits the owning seller.
