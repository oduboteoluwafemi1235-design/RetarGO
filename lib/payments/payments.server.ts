import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendPaymentConfirmationEmail } from '@/lib/notifications/email.server';
import type { PaymentProvider, PaymentVerificationResult } from './providers.server';

export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'cancelled';

export type PaymentRow = {
  id: string;
  order_id: string;
  buyer_id: string;
  provider: PaymentProvider;
  provider_reference: string;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_url: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

function isMissingPaymentsTableError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table 'public.payments'") || normalized.includes('relation "payments" does not exist');
}

function normalizeAmount(value: unknown): number {
  return Number(typeof value === 'number' ? value : Number(value ?? 0));
}

export function createPaymentReference(provider: PaymentProvider, orderNumber: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RTG-${provider.toUpperCase()}-${orderNumber}-${timestamp}-${random}`;
}

export async function createPaymentAttempt(input: {
  orderId: string;
  buyerId: string;
  provider: PaymentProvider;
  providerReference: string;
  amount: number;
  currency?: string;
  paymentUrl?: string | null;
  status?: PaymentStatus;
  receiptNumber?: string | null;
  paidAt?: string | null;
}) {
  const supabase = await createServerClient();

  const { data, error } = await (supabase.from('payments') as any)
    .insert({
      order_id: input.orderId,
      buyer_id: input.buyerId,
      provider: input.provider,
      provider_reference: input.providerReference,
      amount: input.amount,
      currency: input.currency ?? 'NGN',
      status: input.status ?? 'pending',
      payment_url: input.paymentUrl ?? null,
      receipt_number: input.receiptNumber ?? null,
      paid_at: input.paidAt ?? null,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingPaymentsTableError(error.message)) {
      if (input.status === 'successful') {
        await (supabase.from('orders') as any).update({ status: 'processing' }).eq('id', input.orderId);
      }

      return {
        id: `fallback-${input.providerReference}`,
        order_id: input.orderId,
        buyer_id: input.buyerId,
        provider: input.provider,
        provider_reference: input.providerReference,
        provider_payment_id: null,
        amount: input.amount,
        currency: input.currency ?? 'NGN',
        status: input.status ?? 'pending',
        payment_url: input.paymentUrl ?? null,
        receipt_number: input.receiptNumber ?? null,
        paid_at: input.paidAt ?? null,
        failure_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PaymentRow;
    }

    throw new Error(error.message);
  }
  return data as PaymentRow;
}

export async function getPaymentByReference(reference: string): Promise<PaymentRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.from('payments') as any)
    .select('*')
    .eq('provider_reference', reference)
    .maybeSingle();

  if (error) {
    if (isMissingPaymentsTableError(error.message)) return null;
    throw new Error(error.message);
  }
  return (data ?? null) as PaymentRow | null;
}

export async function getLatestPaymentForOrder(orderId: string): Promise<PaymentRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await (supabase.from('payments') as any)
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingPaymentsTableError(error.message)) return null;
    throw new Error(error.message);
  }
  return (data ?? null) as PaymentRow | null;
}

function createReceiptNumber(orderNumber: string) {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RCPT-${datePart}-${orderNumber}-${random}`;
}

export async function applyVerifiedPayment(params: {
  reference: string;
  provider: PaymentProvider;
  verification: PaymentVerificationResult;
  eventType: string;
  payload?: unknown;
}) {
  const supabase = createAdminClient();

  const payment = await getPaymentByReference(params.reference);
  if (!payment) {
    return { updated: false, reason: 'Payment reference not found.' } as const;
  }

  await (supabase.from('payment_events') as any).insert({
    payment_id: payment.id,
    provider_reference: payment.provider_reference,
    event_type: params.eventType,
    payload: params.payload ?? params.verification.raw,
    processed: true,
  });

  const nextStatus = params.verification.status;
  const becameSuccessful = payment.status !== 'successful' && nextStatus === 'successful';
  const receiptNumber = becameSuccessful ? payment.receipt_number ?? createReceiptNumber(`ORD-${payment.order_id.slice(0, 8)}`) : payment.receipt_number;

  const { error: paymentUpdateError } = await (supabase.from('payments') as any)
    .update({
      provider_payment_id: params.verification.providerPaymentId ?? payment.provider_payment_id,
      amount: normalizeAmount(params.verification.amount || payment.amount),
      currency: params.verification.currency || payment.currency,
      status: nextStatus,
      paid_at: nextStatus === 'successful' ? params.verification.paidAt ?? new Date().toISOString() : null,
      failure_reason: nextStatus === 'successful' ? null : params.verification.failureReason ?? payment.failure_reason,
      receipt_number: receiptNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  if (paymentUpdateError) {
    throw new Error(paymentUpdateError.message);
  }

  const orderStatus = nextStatus === 'successful' ? 'processing' : nextStatus === 'pending' ? 'pending' : 'cancelled';
  const { error: orderUpdateError } = await (supabase.from('orders') as any).update({ status: orderStatus }).eq('id', payment.order_id);
  if (orderUpdateError) {
    throw new Error(orderUpdateError.message);
  }

  if (becameSuccessful) {
    const { data: orderData } = await (supabase.from('orders') as any)
      .select('order_number, contact_email, total')
      .eq('id', payment.order_id)
      .maybeSingle();

    if (orderData?.contact_email && orderData?.order_number && receiptNumber) {
      await sendPaymentConfirmationEmail({
        to: String(orderData.contact_email),
        orderNumber: String(orderData.order_number),
        amount: normalizeAmount(orderData.total),
        provider: params.provider,
        receiptNumber,
        receiptUrl: `${APP_URL}/orders/${encodeURIComponent(String(orderData.order_number))}/receipt`,
      });
    }
  }

  return { updated: true } as const;
}

export async function getPaymentsForUser(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await (supabase.from('payments') as any)
    .select('id, provider, provider_reference, amount, currency, status, paid_at, created_at, receipt_number, failure_reason, orders(order_number, total)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingPaymentsTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as any[];
}

export async function getOrderPaymentSummary(orderId: string) {
  const supabase = await createServerClient();

  const { data, error } = await (supabase.from('payments') as any)
    .select('id, provider, provider_reference, amount, currency, status, paid_at, created_at, receipt_number, payment_url, failure_reason')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingPaymentsTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as any[];
}
