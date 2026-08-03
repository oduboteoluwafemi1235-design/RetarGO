import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { createClient } from '@/lib/supabase/server';
import { getOrdersForUser } from '@/lib/supabase/orders.server';
import { formatCurrency } from '@/lib/checkout';

const statusClassMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  processing: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

function titleCaseStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const statusOrder = ['pending', 'processing', 'shipped', 'delivered'] as const;

function getProgressIndex(status: string) {
  if (status === 'cancelled') {
    return -1;
  }

  const index = statusOrder.indexOf(status as (typeof statusOrder)[number]);
  return index === -1 ? 0 : index;
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = (firstQueryValue(params.q) ?? '').trim().toLowerCase();
  const pageSize = 6;
  const requestedPage = Number(firstQueryValue(params.page) ?? '1');
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  const orders = await getOrdersForUser(user.id);
  const filteredOrders = orders.filter((order) => {
    if (!search) {
      return true;
    }

    return (
      order.order_number.toLowerCase().includes(search) ||
      order.status.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">My orders</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Track your order history and delivery progress.</p>
        </div>
        <Button asChild><Link href="/products">Continue shopping</Link></Button>
      </div>

      <form className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_auto]" method="get">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search orders by number or status"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Search</Button>
          {search ? (
            <Button variant="secondary" asChild>
              <Link href="/orders">Clear</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold">No orders yet</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">When you place an order, it will appear here.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold">No matching orders</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
            <p>Showing {paginatedOrders.length} of {filteredOrders.length} orders</p>
            <p>Page {page} of {totalPages}</p>
          </div>

          {paginatedOrders.map((order) => {
            const progressIndex = getProgressIndex(order.status);

            return (
            <Link
              key={order.id}
              href={`/orders/${order.order_number}`}
              className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Order</p>
                  <p className="mt-1 text-lg font-semibold">{order.order_number}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Placed on {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[order.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {titleCaseStatus(order.status)}
                  </span>
                  <p className="mt-3 text-lg font-semibold">{formatCurrency(Number(order.total))}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {statusOrder.map((status, index) => (
                  <div key={status} className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${progressIndex >= index ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}>
                    {titleCaseStatus(status)}
                  </div>
                ))}
              </div>
            </Link>
            );
          })}

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button variant="secondary" asChild disabled={page <= 1}>
                <Link href={`/orders${buildQueryString({ q: search, page: page - 1 > 1 ? page - 1 : undefined })}`}>Previous</Link>
              </Button>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <Button key={pageNumber} variant={pageNumber === page ? 'primary' : 'secondary'} asChild>
                    <Link href={`/orders${buildQueryString({ q: search, page: pageNumber === 1 ? undefined : pageNumber })}`}>{pageNumber}</Link>
                  </Button>
                ))}
              </div>
              <Button variant="secondary" asChild disabled={page >= totalPages}>
                <Link href={`/orders${buildQueryString({ q: search, page: page + 1 <= totalPages ? page + 1 : undefined })}`}>Next</Link>
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
