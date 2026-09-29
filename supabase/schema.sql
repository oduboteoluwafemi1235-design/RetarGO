create extension if not exists pgcrypto;

-- Core tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role text default 'customer' check (role in ('customer', 'seller', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image text not null,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  category_id uuid not null,
  title text not null,
  description text not null,
  price numeric not null,
  quantity integer not null default 1,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  track_inventory boolean not null default true,
  images text[] not null,
  condition text not null check (condition in ('new', 'used', 'refurbished')),
  location text not null,
  status text not null check (status in ('active', 'sold', 'pending')),
  created_at timestamptz default now()
);

create table if not exists public.wishlist (
  id bigserial primary key,
  user_id uuid not null,
  product_id uuid not null
);

create table if not exists public.cart (
  id bigserial primary key,
  user_id uuid not null,
  product_id uuid not null,
  quantity integer not null default 1
);

create table if not exists public.reviews (
  id bigserial primary key,
  user_id uuid not null,
  product_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  full_name text not null,
  phone_number text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  seller_id uuid,
  shipping_address_id uuid,
  order_number text,
  contact_email text,
  contact_phone text,
  subtotal numeric,
  shipping_cost numeric,
  tax_amount numeric,
  coupon_code text,
  checkout_token text,
  total numeric not null,
  status text not null check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null,
  product_id uuid not null,
  product_title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  total numeric not null check (total >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  buyer_id uuid not null,
  provider text not null check (provider in ('paystack', 'flutterwave')),
  provider_reference text not null,
  provider_payment_id text,
  amount numeric not null,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'cancelled')),
  payment_url text,
  receipt_number text,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id bigserial primary key,
  payment_id uuid,
  provider_reference text,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Required columns for partially migrated databases
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.categories add column if not exists created_at timestamptz default now();

alter table public.products add column if not exists seller_id uuid;
alter table public.products add column if not exists category_id uuid;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists stock_quantity integer;
alter table public.products add column if not exists low_stock_threshold integer;
alter table public.products add column if not exists track_inventory boolean;

update public.products set stock_quantity = coalesce(stock_quantity, quantity, 0) where stock_quantity is null;
update public.products set low_stock_threshold = coalesce(low_stock_threshold, 5) where low_stock_threshold is null;
update public.products set track_inventory = coalesce(track_inventory, true) where track_inventory is null;

alter table public.products alter column stock_quantity set default 0;
alter table public.products alter column stock_quantity set not null;
alter table public.products alter column low_stock_threshold set default 5;
alter table public.products alter column low_stock_threshold set not null;
alter table public.products alter column track_inventory set default true;
alter table public.products alter column track_inventory set not null;

alter table public.products drop constraint if exists products_stock_quantity_check;
alter table public.products add constraint products_stock_quantity_check check (stock_quantity >= 0);
alter table public.products drop constraint if exists products_low_stock_threshold_check;
alter table public.products add constraint products_low_stock_threshold_check check (low_stock_threshold >= 0);

alter table public.wishlist add column if not exists user_id uuid;
alter table public.wishlist add column if not exists product_id uuid;

alter table public.cart add column if not exists user_id uuid;
alter table public.cart add column if not exists product_id uuid;
alter table public.cart add column if not exists quantity integer default 1;

alter table public.reviews add column if not exists user_id uuid;
alter table public.reviews add column if not exists product_id uuid;
alter table public.reviews add column if not exists created_at timestamptz default now();

alter table public.addresses add column if not exists user_id uuid;
alter table public.addresses add column if not exists label text;
alter table public.addresses add column if not exists full_name text;
alter table public.addresses add column if not exists phone_number text;
alter table public.addresses add column if not exists line1 text;
alter table public.addresses add column if not exists line2 text;
alter table public.addresses add column if not exists city text;
alter table public.addresses add column if not exists state text;
alter table public.addresses add column if not exists postal_code text;
alter table public.addresses add column if not exists country text;
alter table public.addresses add column if not exists is_default boolean;
alter table public.addresses add column if not exists created_at timestamptz default now();
update public.addresses set is_default = false where is_default is null;
alter table public.addresses alter column is_default set default false;
alter table public.addresses alter column is_default set not null;

alter table public.orders add column if not exists buyer_id uuid;
alter table public.orders add column if not exists seller_id uuid;
alter table public.orders add column if not exists shipping_address_id uuid;
alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists contact_email text;
alter table public.orders add column if not exists contact_phone text;
alter table public.orders add column if not exists subtotal numeric;
alter table public.orders add column if not exists shipping_cost numeric;
alter table public.orders add column if not exists tax_amount numeric;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists checkout_token text;
alter table public.orders add column if not exists created_at timestamptz default now();

alter table public.order_items add column if not exists order_id uuid;
alter table public.order_items add column if not exists product_id uuid;
alter table public.order_items add column if not exists product_title text;
alter table public.order_items add column if not exists quantity integer;
alter table public.order_items add column if not exists unit_price numeric;
alter table public.order_items add column if not exists total numeric;

alter table public.payments add column if not exists order_id uuid;
alter table public.payments add column if not exists buyer_id uuid;
alter table public.payments add column if not exists provider text;
alter table public.payments add column if not exists provider_reference text;
alter table public.payments add column if not exists provider_payment_id text;
alter table public.payments add column if not exists amount numeric;
alter table public.payments add column if not exists currency text;
alter table public.payments add column if not exists status text;
alter table public.payments add column if not exists payment_url text;
alter table public.payments add column if not exists receipt_number text;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists failure_reason text;
alter table public.payments add column if not exists created_at timestamptz default now();
alter table public.payments add column if not exists updated_at timestamptz default now();

alter table public.payment_events add column if not exists payment_id uuid;
alter table public.payment_events add column if not exists provider_reference text;
alter table public.payment_events add column if not exists event_type text;
alter table public.payment_events add column if not exists payload jsonb;
alter table public.payment_events add column if not exists processed boolean default false;
alter table public.payment_events add column if not exists created_at timestamptz default now();

update public.payments set currency = coalesce(currency, 'NGN') where currency is null;
update public.payments set status = coalesce(status, 'pending') where status is null;
update public.payments set updated_at = coalesce(updated_at, now()) where updated_at is null;
update public.payments set created_at = coalesce(created_at, now()) where created_at is null;

alter table public.payments alter column currency set default 'NGN';
alter table public.payments alter column status set default 'pending';
alter table public.payments alter column currency set not null;
alter table public.payments alter column status set not null;

-- Normalize nulls for non-null order pricing fields
update public.orders
set
  subtotal = coalesce(subtotal, total),
  shipping_cost = coalesce(shipping_cost, 0),
  tax_amount = coalesce(tax_amount, 0),
  contact_email = coalesce(contact_email, ''),
  contact_phone = coalesce(contact_phone, ''),
  order_number = coalesce(order_number, 'RTG-LEGACY-' || id::text)
where
  subtotal is null
  or shipping_cost is null
  or tax_amount is null
  or contact_email is null
  or contact_phone is null
  or order_number is null;

alter table public.orders alter column subtotal set default 0;
alter table public.orders alter column shipping_cost set default 0;
alter table public.orders alter column tax_amount set default 0;
alter table public.orders alter column order_number set not null;
alter table public.orders alter column contact_email set not null;
alter table public.orders alter column contact_phone set not null;
alter table public.orders alter column subtotal set not null;
alter table public.orders alter column shipping_cost set not null;
alter table public.orders alter column tax_amount set not null;

-- Best-effort UUID alignment (never hard-fail migration)
do $$
declare
  rec record;
begin
  for rec in
    select *
    from (
      values
        ('products', 'category_id'),
        ('products', 'seller_id'),
        ('wishlist', 'user_id'),
        ('wishlist', 'product_id'),
        ('cart', 'user_id'),
        ('cart', 'product_id'),
        ('reviews', 'user_id'),
        ('reviews', 'product_id'),
        ('addresses', 'user_id'),
        ('orders', 'buyer_id'),
        ('orders', 'seller_id'),
        ('orders', 'shipping_address_id'),
        ('order_items', 'order_id'),
        ('order_items', 'product_id')
    ) as t(table_name, column_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = rec.table_name
        and column_name = rec.column_name
        and udt_name <> 'uuid'
    ) then
      begin
        execute format(
          'alter table public.%I alter column %I type uuid using nullif(%I::text, '''')::uuid',
          rec.table_name,
          rec.column_name,
          rec.column_name
        );
      exception when others then
        raise notice 'Could not convert %.% to uuid automatically: %', rec.table_name, rec.column_name, sqlerrm;
      end;
    end if;
  end loop;
end $$;

-- Rebuild constraints safely
alter table public.products drop constraint if exists products_seller_id_fkey;
alter table public.products drop constraint if exists products_category_id_fkey;
alter table public.wishlist drop constraint if exists wishlist_user_id_fkey;
alter table public.wishlist drop constraint if exists wishlist_product_id_fkey;
alter table public.cart drop constraint if exists cart_user_id_fkey;
alter table public.cart drop constraint if exists cart_product_id_fkey;
alter table public.reviews drop constraint if exists reviews_user_id_fkey;
alter table public.reviews drop constraint if exists reviews_product_id_fkey;
alter table public.addresses drop constraint if exists addresses_user_id_fkey;
alter table public.orders drop constraint if exists orders_buyer_id_fkey;
alter table public.orders drop constraint if exists orders_seller_id_fkey;
alter table public.orders drop constraint if exists orders_shipping_address_id_fkey;
alter table public.order_items drop constraint if exists order_items_order_id_fkey;
alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.payments drop constraint if exists payments_order_id_fkey;
alter table public.payments drop constraint if exists payments_buyer_id_fkey;
alter table public.payment_events drop constraint if exists payment_events_payment_id_fkey;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='seller_id' and udt_name='uuid') then
    alter table public.products add constraint products_seller_id_fkey foreign key (seller_id) references auth.users(id) on delete cascade not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='category_id' and udt_name='uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='categories' and column_name='id' and udt_name='uuid') then
    alter table public.products add constraint products_category_id_fkey foreign key (category_id) references public.categories(id) on delete restrict not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='wishlist' and column_name='user_id' and udt_name='uuid') then
    alter table public.wishlist add constraint wishlist_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='wishlist' and column_name='product_id' and udt_name='uuid') then
    alter table public.wishlist add constraint wishlist_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='cart' and column_name='user_id' and udt_name='uuid') then
    alter table public.cart add constraint cart_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='cart' and column_name='product_id' and udt_name='uuid') then
    alter table public.cart add constraint cart_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reviews' and column_name='user_id' and udt_name='uuid') then
    alter table public.reviews add constraint reviews_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reviews' and column_name='product_id' and udt_name='uuid') then
    alter table public.reviews add constraint reviews_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='addresses' and column_name='user_id' and udt_name='uuid') then
    alter table public.addresses add constraint addresses_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='buyer_id' and udt_name='uuid') then
    alter table public.orders add constraint orders_buyer_id_fkey foreign key (buyer_id) references auth.users(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='seller_id' and udt_name='uuid') then
    alter table public.orders add constraint orders_seller_id_fkey foreign key (seller_id) references auth.users(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='shipping_address_id' and udt_name='uuid') then
    alter table public.orders add constraint orders_shipping_address_id_fkey foreign key (shipping_address_id) references public.addresses(id) on delete set null not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='order_items' and column_name='order_id' and udt_name='uuid') then
    alter table public.order_items add constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='order_items' and column_name='product_id' and udt_name='uuid') then
    alter table public.order_items add constraint order_items_product_id_fkey foreign key (product_id) references public.products(id) on delete restrict not valid;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='order_id' and udt_name='uuid') then
    alter table public.payments add constraint payments_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='buyer_id' and udt_name='uuid') then
    alter table public.payments add constraint payments_buyer_id_fkey foreign key (buyer_id) references auth.users(id) on delete cascade not valid;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payment_events' and column_name='payment_id' and udt_name='uuid') then
    alter table public.payment_events add constraint payment_events_payment_id_fkey foreign key (payment_id) references public.payments(id) on delete cascade not valid;
  end if;
exception when duplicate_object then
  null;
end $$;

update public.order_items oi
set product_title = coalesce(oi.product_title, p.title)
from public.products p
where oi.product_id = p.id
  and oi.product_title is null;

update public.order_items
set product_title = coalesce(product_title, 'Product')
where product_title is null;

update public.order_items
set total = coalesce(total, quantity * unit_price)
where total is null;

alter table public.order_items alter column product_title set default 'Product';
alter table public.order_items alter column product_title set not null;
alter table public.order_items alter column total set default 0;
alter table public.order_items alter column total set not null;

-- Indexes
create unique index if not exists idx_orders_order_number on public.orders(order_number);
create unique index if not exists idx_orders_checkout_token on public.orders(checkout_token) where checkout_token is not null;
create index if not exists idx_orders_buyer_created_at on public.orders(buyer_id, created_at desc);
create index if not exists idx_orders_seller_created_at on public.orders(seller_id, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_addresses_user_id on public.addresses(user_id);
create unique index if not exists idx_single_default_address_per_user on public.addresses(user_id) where is_default = true;
create unique index if not exists idx_payments_provider_reference on public.payments(provider_reference);
create index if not exists idx_payments_buyer_created_at on public.payments(buyer_id, created_at desc);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payment_events_payment_id on public.payment_events(payment_id);

-- Row level security enablement
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.wishlist enable row level security;
alter table public.cart enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

-- RLS policies
-- profiles
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

-- categories
drop policy if exists "Anyone can view categories" on public.categories;
create policy "Anyone can view categories" on public.categories for select using (true);

-- products
drop policy if exists "Anyone can view active products" on public.products;
drop policy if exists "Sellers can insert own products" on public.products;
drop policy if exists "Sellers can update own products" on public.products;
create policy "Anyone can view active products" on public.products for select using (status = 'active');
create policy "Sellers can insert own products" on public.products for insert with check (auth.uid() = seller_id);
create policy "Sellers can update own products" on public.products for update using (auth.uid() = seller_id);

-- wishlist/cart/reviews/addresses
drop policy if exists "Users manage own wishlist" on public.wishlist;
drop policy if exists "Users manage own cart" on public.cart;
drop policy if exists "Users manage own reviews" on public.reviews;
drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own wishlist" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own cart" on public.cart for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own reviews" on public.reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own addresses" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- orders/order_items
drop policy if exists "Buyers view own orders" on public.orders;
drop policy if exists "Buyers create own orders" on public.orders;
drop policy if exists "Buyers view own order items" on public.order_items;
drop policy if exists "Buyers create own order items" on public.order_items;
drop policy if exists "Sellers view related orders" on public.orders;
drop policy if exists "Sellers update related orders" on public.orders;
drop policy if exists "Sellers view own order items" on public.order_items;
create policy "Buyers view own orders" on public.orders for select using (auth.uid() = buyer_id);
create policy "Buyers create own orders" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "Sellers view related orders" on public.orders
  for select using (
    auth.uid() = seller_id
    or exists (
      select 1
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = orders.id and p.seller_id = auth.uid()
    )
  );
create policy "Sellers update related orders" on public.orders
  for update using (
    auth.uid() = seller_id
    or exists (
      select 1
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = orders.id and p.seller_id = auth.uid()
    )
  ) with check (
    auth.uid() = seller_id
    or exists (
      select 1
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = orders.id and p.seller_id = auth.uid()
    )
  );
create policy "Buyers view own order items" on public.order_items
  for select using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );
create policy "Buyers create own order items" on public.order_items
  for insert with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );
create policy "Sellers view own order items" on public.order_items
  for select using (
    exists (
      select 1
      from public.orders o
      join public.products p on p.id = order_items.product_id
      where o.id = order_items.order_id and p.seller_id = auth.uid()
    )
  );

drop policy if exists "Buyers view own payments" on public.payments;
drop policy if exists "Buyers create own payments" on public.payments;
drop policy if exists "Service role manage payments" on public.payments;
create policy "Buyers view own payments" on public.payments
  for select using (auth.uid() = buyer_id);
create policy "Buyers create own payments" on public.payments
  for insert with check (auth.uid() = buyer_id);
create policy "Service role manage payments" on public.payments
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Buyers view payment events for own payments" on public.payment_events;
drop policy if exists "Service role manage payment events" on public.payment_events;
create policy "Buyers view payment events for own payments" on public.payment_events
  for select using (
    exists (
      select 1
      from public.payments p
      where p.id = payment_events.payment_id and p.buyer_id = auth.uid()
    )
  );
create policy "Service role manage payment events" on public.payment_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Seed marketplace reference data and products safely.
-- Products are only inserted after binding them to real auth users and profile rows.
with seed_categories (id, name, image) as (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'Electronics', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'Phones', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80'),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'Fashion', 'https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=80'),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'Home', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'Beauty', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80'),
    ('10000000-0000-0000-0000-000000000006'::uuid, 'Sports', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80'),
    ('10000000-0000-0000-0000-000000000007'::uuid, 'Books', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80')
),
updated_categories as (
  update public.categories c
  set name = s.name, image = s.image
  from seed_categories s
  where lower(c.name) = lower(s.name)
  returning c.id
)
insert into public.categories (id, name, image)
select s.id, s.name, s.image
from seed_categories s
where not exists (
  select 1 from public.categories c where lower(c.name) = lower(s.name)
)
on conflict do nothing;

do $$
declare
  seller_pool_size integer;
begin
  insert into public.profiles (id, full_name, email, role)
  select
    u.id,
    coalesce(nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''), 'Marketplace Seller ' || row_number() over (order by u.created_at)),
    u.email,
    'seller'
  from auth.users u
  where not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  )
  on conflict (id) do nothing;

  update public.profiles
  set role = 'seller'
  where id in (
    select u.id
    from auth.users u
    order by u.created_at nulls last, u.id
    limit 8
  )
  and coalesce(role, '') not in ('seller', 'admin');

  select count(*)
  into seller_pool_size
  from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce(p.role, 'seller') in ('seller', 'admin');

  if seller_pool_size = 0 then
    raise notice 'Skipping marketplace product seed because no auth users exist to own products.';
    return;
  end if;

  with ranked_sellers as (
    select
      p.id,
      row_number() over (order by coalesce(p.updated_at, p.created_at) nulls last, p.id) as seller_rank
    from public.profiles p
    join auth.users u on u.id = p.id
    where coalesce(p.role, 'seller') in ('seller', 'admin')
  ),
  seed_products (id, seller_rank, category_name, title, description, price, quantity, images, condition, location, status) as (
    values
      ('20000000-0000-0000-0000-000000000001'::uuid, 1, 'Electronics', 'Sony WH-1000XM5 Headphones', 'Flagship over-ear headphones with excellent noise cancellation and all-day comfort.', 420000, 6, array['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'], 'new', 'Lagos', 'active'),
      ('20000000-0000-0000-0000-000000000002'::uuid, 2, 'Electronics', 'Marshall Emberton II Speaker', 'Portable speaker with warm audio, rugged design, and reliable battery life.', 195000, 8, array['https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80'], 'new', 'Abuja', 'active'),
      ('20000000-0000-0000-0000-000000000003'::uuid, 3, 'Phones', 'Samsung Galaxy S23', 'Factory unlocked smartphone with a bright AMOLED display and excellent cameras.', 610000, 5, array['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80'], 'new', 'Lagos', 'active'),
      ('20000000-0000-0000-0000-000000000004'::uuid, 4, 'Phones', 'iPhone 14', 'Clean pre-owned iPhone 14 with strong battery health and original box.', 690000, 3, array['https://images.unsplash.com/photo-1512499617640-c2f99912b91f?auto=format&fit=crop&w=1200&q=80'], 'used', 'Port Harcourt', 'active'),
      ('20000000-0000-0000-0000-000000000005'::uuid, 5, 'Fashion', 'Ankara Occasion Dress', 'Tailored Ankara dress with structured silhouette and premium finishing.', 58000, 10, array['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80'], 'new', 'Ibadan', 'active'),
      ('20000000-0000-0000-0000-000000000006'::uuid, 6, 'Fashion', 'Leather Weekend Loafers', 'Soft leather loafers built for comfort, office wear, and evenings out.', 47000, 12, array['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'], 'new', 'Enugu', 'active'),
      ('20000000-0000-0000-0000-000000000007'::uuid, 7, 'Home', 'Accent Lounge Chair', 'Modern upholstered lounge chair that adds warmth to living rooms and bedrooms.', 168000, 4, array['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'], 'new', 'Abuja', 'active'),
      ('20000000-0000-0000-0000-000000000008'::uuid, 8, 'Home', 'Ceramic Table Lamp', 'Minimal ceramic lamp with soft lighting for side tables and reading corners.', 36000, 9, array['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'], 'new', 'Benin City', 'active'),
      ('20000000-0000-0000-0000-000000000009'::uuid, 1, 'Beauty', 'Vitamin C Glow Serum', 'Brightening serum with vitamin C and niacinamide for a smoother skin tone.', 21500, 18, array['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80'], 'new', 'Lagos', 'active'),
      ('20000000-0000-0000-0000-000000000010'::uuid, 2, 'Beauty', 'Luxury Makeup Brush Set', 'Soft synthetic brushes in a travel-ready set for daily and pro use.', 27500, 14, array['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80'], 'new', 'Uyo', 'active'),
      ('20000000-0000-0000-0000-000000000011'::uuid, 3, 'Sports', 'Adjustable Kettlebell', 'Compact adjustable kettlebell suited for strength sessions at home.', 92000, 7, array['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'], 'new', 'Lagos', 'active'),
      ('20000000-0000-0000-0000-000000000012'::uuid, 4, 'Sports', 'Yoga Starter Kit', 'Mat, blocks, and strap bundle designed for stretching and recovery routines.', 34000, 11, array['https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80'], 'new', 'Abeokuta', 'active'),
      ('20000000-0000-0000-0000-000000000013'::uuid, 5, 'Books', 'Atomic Habits', 'Popular personal development hardcover in excellent condition.', 14500, 16, array['https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80'], 'new', 'Lagos', 'active'),
      ('20000000-0000-0000-0000-000000000014'::uuid, 6, 'Books', 'Half of a Yellow Sun', 'Bestselling novel in crisp paperback condition, suitable for collectors and readers.', 9500, 20, array['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80'], 'new', 'Nsukka', 'active')
  ),
  seller_pool as (
    select
      id,
      seller_rank as seller_slot
    from ranked_sellers
  )
  insert into public.products (id, seller_id, category_id, title, description, price, quantity, images, condition, location, status)
  select
    sp.id,
    seller_pool.id,
    c.id,
    sp.title,
    sp.description,
    sp.price,
    sp.quantity,
    sp.images,
    sp.condition,
    sp.location,
    sp.status
  from seed_products sp
  join seller_pool on seller_pool.seller_slot = (((sp.seller_rank - 1) % seller_pool_size) + 1)
  join public.categories c on lower(c.name) = lower(sp.category_name)
  on conflict (id) do update
  set
    seller_id = excluded.seller_id,
    category_id = excluded.category_id,
    title = excluded.title,
    description = excluded.description,
    price = excluded.price,
    quantity = excluded.quantity,
    images = excluded.images,
    condition = excluded.condition,
    location = excluded.location,
    status = excluded.status;
end $$;

-- Transactional order creation RPC
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
      update public.products
      set stock_quantity = greatest(v_cart_item.stock_quantity - v_cart_item.quantity, 0),
          quantity = greatest(v_cart_item.stock_quantity - v_cart_item.quantity, 0),
          status = case when greatest(v_cart_item.stock_quantity - v_cart_item.quantity, 0) <= 0 then 'sold' else status end
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

-- Lightweight consistency report (notice-only; never fails migration)
do $$
declare
  missing record;
begin
  for missing in
    select *
    from (
      values
        ('orders', 'shipping_address_id'),
        ('orders', 'created_at'),
        ('addresses', 'is_default'),
        ('cart', 'product_id'),
        ('reviews', 'product_id'),
        ('order_items', 'order_id')
    ) as t(table_name, column_name)
    where not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = t.table_name
        and c.column_name = t.column_name
    )
  loop
    raise notice 'Missing expected column public.%.%', missing.table_name, missing.column_name;
  end loop;
end $$;
