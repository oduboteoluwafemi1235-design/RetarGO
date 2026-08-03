-- Align the live orders status constraint with the application and schema snapshot.
-- This preserves all existing order rows; it only replaces the check definition.

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Optional verification queries for manual use:
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.orders'::regclass
--   and conname = 'orders_status_check';
--
-- select status, count(*)
-- from public.orders
-- group by status
-- order by status;
