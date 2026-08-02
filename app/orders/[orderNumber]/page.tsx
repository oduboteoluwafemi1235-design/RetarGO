import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/checkout';
import { getOrderByNumber } from '@/lib/supabase/orders.server';
import { getOrderPaymentSummary } from '@/lib/payments/payments.server';

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

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  let order: any;
  try {
    order = await getOrderByNumber(user.id, orderNumber);
  } catch {
    notFound();
  }

  if (!order) {
    notFound();
  }

  const payments = await getOrderPaymentSummary(String(order.id));
  const latestPayment = payments[0] ?? null;
  const hasReceipt = Boolean(payments.find((payment) => payment.status === 'successful' && payment.receipt_number));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Order details</p>
          <h1 className="text-3xl font-semibold">{order.order_number}</h1>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClassMap[order.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
          {titleCaseStatus(order.status)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">Items</h2>
          <div className="mt-4 space-y-4">
            {order.order_items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <img src={item.products?.images?.[0] ?? ''} alt={item.products?.title ?? 'Product'} className="h-14 w-14 rounded-xl object-cover" />
                  <div>
                    <p className="font-semibold">{item.products?.title ?? 'Product'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Qty {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(Number(item.unit_price) * item.quantity)}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Delivery details</h2>
            <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p>Email: {order.contact_email}</p>
              <p>Phone: {order.contact_phone}</p>
              {order.shipping_address ? (
                <>
                  <p className="pt-2 font-medium text-slate-800 dark:text-slate-200">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.phone_number}</p>
                  <p>{order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code ?? ''}</p>
                  <p>{order.shipping_address.country}</p>
                </>
              ) : (
                <p className="pt-2">No shipping address available.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Order totals</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(Number(order.shipping_cost))}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(Number(order.tax_amount))}</span></div>
              <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-white"><span>Total</span><span>{formatCurrency(Number(order.total))}</span></div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Payment</h2>
            {latestPayment ? (
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Status: <span className="font-medium capitalize">{latestPayment.status}</span></p>
                <p>Provider: <span className="font-medium capitalize">{latestPayment.provider}</span></p>
                <p>Reference: <span className="font-medium">{latestPayment.provider_reference}</span></p>
                {latestPayment.failure_reason ? <p className="text-rose-600 dark:text-rose-400">Reason: {latestPayment.failure_reason}</p> : null}
                {latestPayment.status === 'pending' && latestPayment.payment_url ? (
                  <Button size="sm" asChild>
                    <Link href={latestPayment.payment_url}>Resume payment</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No payment records yet.</p>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {hasReceipt ? (
          <Button variant="secondary" asChild><Link href={`/orders/${order.order_number}/receipt`}>View receipt</Link></Button>
        ) : null}
        <Button variant="secondary" asChild><Link href="/orders">Back to my orders</Link></Button>
        <Button asChild><Link href="/products">Continue shopping</Link></Button>
      </div>
    </main>
  );
}
