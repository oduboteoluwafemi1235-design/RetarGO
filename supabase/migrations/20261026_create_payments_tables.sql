-- Payment tables used by checkout (Paystack / Flutterwave).

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
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
  payment_id uuid references public.payments(id) on delete cascade,
  provider_reference text,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_payments_provider_reference on public.payments (provider_reference);
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_payments_buyer_id on public.payments (buyer_id);
create index if not exists idx_payment_events_payment_id on public.payment_events (payment_id);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "Buyers view own payments" on public.payments;
create policy "Buyers view own payments" on public.payments
  for select to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "Buyers create own pending payments" on public.payments;
create policy "Buyers create own pending payments" on public.payments
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.orders o where o.id = payments.order_id and o.buyer_id = auth.uid())
  );

drop policy if exists "Buyers view events for own payments" on public.payment_events;
create policy "Buyers view events for own payments" on public.payment_events
  for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_events.payment_id and p.buyer_id = auth.uid()));

revoke all on public.payments, public.payment_events from anon, authenticated;
grant select, insert on public.payments to authenticated;
grant select on public.payment_events to authenticated;
grant all on public.payments, public.payment_events to service_role;
grant usage, select on sequence public.payment_events_id_seq to service_role;