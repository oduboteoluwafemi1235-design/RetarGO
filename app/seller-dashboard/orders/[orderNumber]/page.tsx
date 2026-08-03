import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/button';
import { formatCurrency } from '@/lib/checkout';
import { loadSellerDashboardData } from '@/app/seller-dashboard/data';

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

export default async function SellerOrderDetailsPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const data = await loadSellerDashboardData();
  const order = data.initialOrders.find((entry) => entry.orderNumber === orderNumber);

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Seller order details</p>
          <h1 className="text-3xl font-semibold">{order.orderNumber}</h1>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClassMap[order.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
          {titleCaseStatus(order.status)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">Items</h2>
          <div className="mt-4 space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <img src={item.productImage ?? ''} alt={item.productTitle} className="h-14 w-14 rounded-xl object-cover" />
                  <div>
                    <p className="font-semibold">{item.productTitle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Qty {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(Number(item.unitPrice) * item.quantity)}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Buyer information</h2>
            <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p>Name: {order.buyerName}</p>
              <p>Email: {order.buyerEmail}</p>
              <p>Contact email: {order.contactEmail || 'N/A'}</p>
              <p>Contact phone: {order.contactPhone || 'N/A'}</p>
              <p className="pt-2 text-slate-500 dark:text-slate-400">Placed on {new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Totals</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Status</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Update this order from the seller dashboard orders page.</p>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" asChild><Link href="/seller-dashboard/orders">Back to seller orders</Link></Button>
        <Button asChild><Link href="/seller-dashboard">Back to dashboard</Link></Button>
      </div>
    </main>
  );
}