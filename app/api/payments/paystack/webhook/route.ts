import { NextResponse } from 'next/server';
import { applyVerifiedPayment } from '@/lib/payments/payments.server';
import { verifyPaystackWebhookSignature, verifyProviderPayment } from '@/lib/payments/providers.server';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const reference = payload?.data?.reference as string | undefined;

  if (!reference) {
    return NextResponse.json({ ok: false, error: 'Missing payment reference' }, { status: 400 });
  }

  try {
    const verification = await verifyProviderPayment('paystack', reference);
    await applyVerifiedPayment({
      reference,
      provider: 'paystack',
      verification,
      eventType: String(payload?.event ?? 'paystack.webhook'),
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
