import crypto from 'crypto';

export type PaymentProvider = 'paystack' | 'flutterwave';

export type PaymentInitializationInput = {
  provider: PaymentProvider;
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type PaymentInitializationResult = {
  authorizationUrl: string;
  providerReference: string;
  providerPaymentId?: string | null;
  raw: unknown;
};

export type PaymentVerificationResult = {
  status: 'successful' | 'failed' | 'cancelled' | 'pending';
  amount: number;
  currency: string;
  providerReference: string;
  providerPaymentId?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  raw: unknown;
};

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3';

function isTestPaymentMode() {
  return process.env.RETARGO_ENABLE_TEST_PAYMENTS === 'true';
}

function isSecretMissingError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes('PAYSTACK_SECRET_KEY is not configured.') || error.message.includes('FLUTTERWAVE_SECRET_KEY is not configured.');
}

function ensureProviderSecret(provider: PaymentProvider) {
  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
    return secret;
  }

  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error('FLUTTERWAVE_SECRET_KEY is not configured.');
  return secret;
}

export async function initializeProviderPayment(input: PaymentInitializationInput): Promise<PaymentInitializationResult> {
  try {
    if (input.provider === 'paystack') {
      return initializePaystackPayment(input);
    }

    return initializeFlutterwavePayment(input);
  } catch (error) {
    if (!isTestPaymentMode() || !isSecretMissingError(error)) {
      throw error;
    }

    const callback = new URL(input.callbackUrl);
    callback.searchParams.set('reference', input.reference);
    callback.searchParams.set('test', '1');

    return {
      authorizationUrl: callback.toString(),
      providerReference: input.reference,
      providerPaymentId: null,
      raw: { test_mode: true, provider: input.provider },
    };
  }
}

async function initializePaystackPayment(input: PaymentInitializationInput): Promise<PaymentInitializationResult> {
  const secret = ensureProviderSecret('paystack');

  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amount * 100),
      currency: input.currency ?? 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const result = await response.json();
  if (!response.ok || !result?.status || !result?.data?.authorization_url) {
    throw new Error(result?.message ?? 'Unable to initialize Paystack payment.');
  }

  return {
    authorizationUrl: result.data.authorization_url as string,
    providerReference: input.reference,
    providerPaymentId: null,
    raw: result,
  };
}

async function initializeFlutterwavePayment(input: PaymentInitializationInput): Promise<PaymentInitializationResult> {
  const secret = ensureProviderSecret('flutterwave');

  const response = await fetch(`${FLUTTERWAVE_API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: Number(input.amount.toFixed(2)),
      currency: input.currency ?? 'NGN',
      redirect_url: input.callbackUrl,
      customer: {
        email: input.email,
      },
      customizations: {
        title: 'RetarGO Marketplace Payment',
        description: 'Complete your order securely on RetarGO.',
      },
      meta: input.metadata ?? {},
    }),
  });

  const result = await response.json();
  if (!response.ok || result?.status !== 'success' || !result?.data?.link) {
    throw new Error(result?.message ?? 'Unable to initialize Flutterwave payment.');
  }

  return {
    authorizationUrl: result.data.link as string,
    providerReference: input.reference,
    providerPaymentId: null,
    raw: result,
  };
}

export async function verifyProviderPayment(provider: PaymentProvider, reference: string): Promise<PaymentVerificationResult> {
  if (isTestPaymentMode()) {
    const hasSecret = provider === 'paystack' ? Boolean(process.env.PAYSTACK_SECRET_KEY) : Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
    if (!hasSecret) {
      return {
        status: 'successful',
        amount: 0,
        currency: 'NGN',
        providerReference: reference,
        providerPaymentId: `test-${reference}`,
        failureReason: null,
        paidAt: new Date().toISOString(),
        raw: { test_mode: true, provider },
      };
    }
  }

  if (provider === 'paystack') {
    return verifyPaystackPayment(reference);
  }

  return verifyFlutterwavePayment(reference);
}

async function verifyPaystackPayment(reference: string): Promise<PaymentVerificationResult> {
  const secret = ensureProviderSecret('paystack');

  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result?.status || !result?.data) {
    throw new Error(result?.message ?? 'Unable to verify Paystack payment.');
  }

  const data = result.data as any;
  const status = data.status as string;

  return {
    status: status === 'success' ? 'successful' : status === 'abandoned' ? 'cancelled' : status === 'failed' ? 'failed' : 'pending',
    amount: Number(data.amount ?? 0) / 100,
    currency: String(data.currency ?? 'NGN'),
    providerReference: String(data.reference ?? reference),
    providerPaymentId: data.id ? String(data.id) : null,
    failureReason: data.gateway_response ? String(data.gateway_response) : null,
    paidAt: data.paid_at ? String(data.paid_at) : null,
    raw: result,
  };
}

async function verifyFlutterwavePayment(reference: string): Promise<PaymentVerificationResult> {
  const secret = ensureProviderSecret('flutterwave');

  const response = await fetch(`${FLUTTERWAVE_API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const result = await response.json();
  if (!response.ok || result?.status !== 'success' || !result?.data) {
    throw new Error(result?.message ?? 'Unable to verify Flutterwave payment.');
  }

  const data = result.data as any;
  const status = String(data.status ?? '').toLowerCase();

  return {
    status: status === 'successful' ? 'successful' : status === 'cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : 'pending',
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? 'NGN'),
    providerReference: String(data.tx_ref ?? reference),
    providerPaymentId: data.id ? String(data.id) : null,
    failureReason: data.processor_response ? String(data.processor_response) : null,
    paidAt: data.created_at ? String(data.created_at) : null,
    raw: result,
  };
}

export function verifyPaystackWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signatureHeader) return false;

  const digest = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return digest === signatureHeader;
}

export function verifyFlutterwaveWebhookSignature(signatureHeader: string | null): boolean {
  const webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  if (!webhookSecret || !signatureHeader) return false;
  return webhookSecret === signatureHeader;
}
