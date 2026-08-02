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

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  const orders = await getOrdersForUser(user.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">My orders</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Track your order history and delivery progress.</p>
        </div>
        <Button asChild><Link href="/products">Continue shopping</Link></Button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold">No orders yet</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">When you place an order, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
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
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
