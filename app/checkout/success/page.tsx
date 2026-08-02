import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { createClient } from '@/lib/supabase/server';
import { getOrderByNumber } from '@/lib/supabase/orders.server';
import { formatCurrency } from '@/lib/checkout';

function getEstimatedDeliveryDate(fromDate: Date) {
  const delivery = new Date(fromDate);
  delivery.setDate(delivery.getDate() + 5);
  return delivery;
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const params = await searchParams;
  const orderNumber = params.order;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  if (!orderNumber) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-3xl font-semibold">Order complete</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Your order has been placed successfully.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild><Link href="/products">Continue shopping</Link></Button>
            <Button variant="secondary" asChild><Link href="/orders">View orders</Link></Button>
          </div>
        </div>
      </main>
    );
  }

  const order = await getOrderByNumber(user.id, orderNumber);
  const estimatedDelivery = getEstimatedDeliveryDate(new Date(order.created_at));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-soft dark:border-emerald-900 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">Success</p>
        <h1 className="mt-2 text-3xl font-semibold">Order created</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Your order has been saved. Payment verification will update the final status automatically.</p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">Order number</p>
          <p className="text-xl font-semibold">{order.order_number}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Estimated delivery: {estimatedDelivery.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            {order.order_items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.products?.title ?? 'Product'}</p>
                  <p className="text-slate-500 dark:text-slate-400">Qty {item.quantity}</p>
                </div>
                <p className="font-medium">{formatCurrency(Number(item.unit_price) * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(Number(order.shipping_cost))}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(Number(order.tax_amount))}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(Number(order.total))}</span></div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link href="/products">Continue shopping</Link></Button>
          <Button variant="secondary" asChild><Link href="/orders">View orders</Link></Button>
        </div>
      </div>
    </main>
  );
}
