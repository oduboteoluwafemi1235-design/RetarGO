-- Fix checkout function for Postgres environments where min(uuid) is unavailable.
-- This migration is safe and idempotent because it only replaces the function body.

create or replace function public.create_order_transaction(
  buyer uuid,
  p_order_number text,
  p_shipping_address_id uuid,
  p_contact_email text,
  p_contact_phone text,
  p_subtotal numeric,
  p_shipping_cost numeric,
  p_tax_amount numeric,
  p_total numeric,
  p_coupon_code text,
  p_checkout_token text
)
returns table (
  id uuid,
  order_number text,
  total numeric,
  status text,
  created_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_order_id uuid;
  v_existing public.orders%rowtype;
  v_cart_subtotal numeric;
  v_first_seller uuid;
  v_seller_count integer;
  v_cart_item record;
  v_next_stock integer;
begin
  if auth.uid() is distinct from buyer then
    raise exception 'Unauthorized checkout attempt.';
  end if;

  if p_checkout_token is not null and length(trim(p_checkout_token)) > 0 then
    select *
    into v_existing
    from public.orders
    where buyer_id = buyer and checkout_token = p_checkout_token
    limit 1;

    if found then
      return query
      select v_existing.id, v_existing.order_number, v_existing.total, v_existing.status, v_existing.created_at;
      return;
    end if;
  end if;

  select count(distinct p.seller_id)
  into v_seller_count
  from public.cart c
  join public.products p on p.id = c.product_id
  where c.user_id = buyer;

  if v_seller_count = 0 then
    raise exception 'Cart is empty.';
  end if;

  if v_seller_count > 1 then
    raise exception 'Checkout supports products from one seller at a time.';
  end if;

  select p.seller_id
  into v_first_seller
  from public.cart c
  join public.products p on p.id = c.product_id
  where c.user_id = buyer
  limit 1;

  select coalesce(sum(c.quantity * p.price), 0)
  into v_cart_subtotal
  from public.cart c
  join public.products p on p.id = c.product_id
  where c.user_id = buyer;

  if v_cart_subtotal <= 0 then
    raise exception 'Cart is empty.';
  end if;

  if abs(v_cart_subtotal - p_subtotal) > 1 then
    raise exception 'Cart totals changed. Please refresh checkout.';
  end if;

  if abs((p_subtotal + p_shipping_cost + p_tax_amount) - p_total) > 1 then
    raise exception 'Invalid total amount.';
  end if;

  for v_cart_item in
    select
      c.product_id,
      c.quantity,
      p.price,
      p.title,
      coalesce(p.stock_quantity, p.quantity, 0) as stock_quantity,
      coalesce(p.track_inventory, true) as track_inventory
    from public.cart c
    join public.products p on p.id = c.product_id
    where c.user_id = buyer
    for update of p
  loop
    if v_cart_item.track_inventory and v_cart_item.quantity > v_cart_item.stock_quantity then
      raise exception 'Only % items left in stock.', v_cart_item.stock_quantity;
    end if;

    if v_cart_item.track_inventory then
      v_next_stock := greatest(v_cart_item.stock_quantity - v_cart_item.quantity, 0);

      update public.products
      set stock_quantity = v_next_stock,
          quantity = v_next_stock,
          status = case when v_next_stock <= 0 then 'sold' else status end
      where id = v_cart_item.product_id;
    end if;
  end loop;

  insert into public.orders (
    buyer_id,
    seller_id,
    order_number,
    shipping_address_id,
    contact_email,
    contact_phone,
    subtotal,
    shipping_cost,
    tax_amount,
    coupon_code,
    checkout_token,
    total,
    status
  )
  values (
    buyer,
    v_first_seller,
    p_order_number,
    p_shipping_address_id,
    p_contact_email,
    p_contact_phone,
    p_subtotal,
    p_shipping_cost,
    p_tax_amount,
    p_coupon_code,
    p_checkout_token,
    p_total,
    'pending'
  )
  returning orders.id into v_order_id;

  insert into public.order_items (order_id, product_id, product_title, quantity, unit_price, total)
  select v_order_id, c.product_id, p.title, c.quantity, p.price, c.quantity * p.price
  from public.cart c
  join public.products p on p.id = c.product_id
  where c.user_id = buyer;

  delete from public.cart where user_id = buyer;

  return query
  select o.id, o.order_number, o.total, o.status, o.created_at
  from public.orders o
  where o.id = v_order_id;
end;
$$;
