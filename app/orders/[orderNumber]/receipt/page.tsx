import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { createClient } from '@/lib/supabase/server';
import { getOrderByNumber } from '@/lib/supabase/orders.server';
import { getOrderPaymentSummary } from '@/lib/payments/payments.server';
import { formatCurrency } from '@/lib/checkout';

export default async function ReceiptPage({ params }: { params: Promise<{ orderNumber: string }> }) {
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
  const successfulPayment = payments.find((payment) => payment.status === 'successful') ?? null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Receipt</p>
            <h1 className="mt-2 text-3xl font-semibold">{order.order_number}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Issued: {new Date().toLocaleString()}</p>
          </div>
          <div className="text-sm text-right">
            <p className="font-semibold">RetarGO Marketplace</p>
            <p className="text-slate-600 dark:text-slate-300">support@retargo.com</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Billed to</p>
            <p className="mt-1 font-medium">{order.contact_email}</p>
            <p>{order.contact_phone}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Payment details</p>
            <p className="mt-1">Status: {successfulPayment ? 'Successful' : 'Pending'}</p>
            <p>Provider: {successfulPayment?.provider ?? 'N/A'}</p>
            <p>Reference: {successfulPayment?.provider_reference ?? 'N/A'}</p>
            <p>Receipt no: {successfulPayment?.receipt_number ?? 'Not issued'}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Quantity</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items?.map((item: any) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{item.product_title ?? item.products?.title ?? 'Product'}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unit_price) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto max-w-sm space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(Number(order.shipping_cost))}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(Number(order.tax_amount))}</span></div>
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(Number(order.total))}</span></div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="secondary" asChild><Link href={`/orders/${order.order_number}`}>Back to order</Link></Button>
          <Button asChild><Link href="/orders">My orders</Link></Button>
        </div>
      </div>
    </main>
  );
}
