import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPaymentsForUser } from '@/lib/payments/payments.server';
import { formatCurrency } from '@/lib/checkout';

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  successful: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  cancelled: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};

export default async function PaymentHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  const payments = await getPaymentsForUser(user.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Payment history</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Track successful, pending, failed, and cancelled transactions.</p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold">No payments yet</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Your transaction history will appear here after checkout.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{new Date(payment.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {payment.orders?.order_number ? (
                      <Link className="font-semibold text-brand-600" href={`/orders/${payment.orders.order_number}`}>
                        {payment.orders.order_number}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{payment.provider}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(payment.amount))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[payment.status] ?? statusBadge.pending}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {payment.receipt_number && payment.orders?.order_number ? (
                      <Link className="font-semibold text-brand-600" href={`/orders/${payment.orders.order_number}/receipt`}>
                        {payment.receipt_number}
                      </Link>
                    ) : (
                      'Pending'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
