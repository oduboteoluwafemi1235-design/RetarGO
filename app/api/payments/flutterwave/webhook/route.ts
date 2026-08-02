import { NextResponse } from 'next/server';
import { applyVerifiedPayment } from '@/lib/payments/payments.server';
import { verifyFlutterwaveWebhookSignature, verifyProviderPayment } from '@/lib/payments/providers.server';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('verif-hash');

  if (!verifyFlutterwaveWebhookSignature(signature)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const reference = (payload?.data?.tx_ref as string | undefined) ?? (payload?.tx_ref as string | undefined);

  if (!reference) {
    return NextResponse.json({ ok: false, error: 'Missing payment reference' }, { status: 400 });
  }

  try {
    const verification = await verifyProviderPayment('flutterwave', reference);
    await applyVerifiedPayment({
      reference,
      provider: 'flutterwave',
      verification,
      eventType: String(payload?.event ?? 'flutterwave.webhook'),
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
