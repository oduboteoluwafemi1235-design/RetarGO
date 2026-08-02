-- Marketplace seed data
-- Safe to re-run. Products are inserted only when real auth users exist.

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
    select id, seller_rank as seller_slot
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