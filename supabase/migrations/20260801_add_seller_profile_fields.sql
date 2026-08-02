-- Add seller-specific profile fields without affecting existing data.
alter table public.profiles
  add column if not exists store_name text,
  add column if not exists store_description text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;
