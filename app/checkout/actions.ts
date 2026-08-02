'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateCheckoutTotals } from '@/lib/checkout';
import {
  createAddressForUser,
  createOrderFromCart,
  getAddressesForUser,
  getNextOrderNumber,
  getOrderByCheckoutToken,
} from '@/lib/supabase/orders.server';
import { createPaymentAttempt, createPaymentReference, getLatestPaymentForOrder } from '@/lib/payments/payments.server';
import { initializeProviderPayment, type PaymentProvider } from '@/lib/payments/providers.server';

function isTestPaymentMode() {
  return process.env.RETARGO_ENABLE_TEST_PAYMENTS === 'true';
}

const addressSchema = z.object({
  label: z.string().trim().min(2, 'Address label is required').max(60, 'Address label is too long'),
  fullName: z.string().trim().min(2, 'Full name is required').max(120, 'Full name is too long'),
  phoneNumber: z.string().trim().min(7, 'Phone number is required').max(30, 'Phone number is too long'),
  line1: z.string().trim().min(3, 'Address line is required').max(180, 'Address line is too long'),
  line2: z.string().trim().max(180, 'Address line 2 is too long').optional(),
  city: z.string().trim().min(2, 'City is required').max(80, 'City is too long'),
  state: z.string().trim().min(2, 'State is required').max(80, 'State is too long'),
  postalCode: z.string().trim().max(20, 'Postal code is too long').optional(),
  country: z.string().trim().min(2, 'Country is required').max(80, 'Country is too long'),
  setAsDefault: z.boolean().optional(),
});

const checkoutSchema = z
  .object({
    contactEmail: z.string().trim().email('Enter a valid email address'),
    contactPhone: z.string().trim().min(7, 'Phone number is required').max(30, 'Phone number is too long'),
    couponCode: z.string().trim().max(40, 'Coupon code is too long').optional(),
    selectedAddressId: z.string().trim().min(1, 'Invalid shipping address.').optional(),
    newAddress: addressSchema.optional(),
    checkoutToken: z.string().trim().min(12, 'Invalid checkout token').max(120, 'Invalid checkout token'),
    paymentProvider: z.enum(['paystack', 'flutterwave']),
  })
  .superRefine((value, ctx) => {
    if (!value.selectedAddressId && !value.newAddress) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a saved address or enter a new delivery address.', path: ['newAddress'] });
    }
  });

export type CheckoutPayload = z.infer<typeof checkoutSchema>;

export type CheckoutActionResult = {
  ok: boolean;
  orderNumber?: string;
  paymentUrl?: string;
  paymentReference?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function placeOrderAction(payload: CheckoutPayload): Promise<CheckoutActionResult> {
  const parsed = checkoutSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please correct the highlighted fields and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: 'Please sign in to complete checkout.' };
    }

    const existingOrder = await getOrderByCheckoutToken(user.id, data.checkoutToken);
    if (existingOrder) {
      const existingPayment = await getLatestPaymentForOrder(String(existingOrder.id));
      if (existingPayment?.status === 'pending' && existingPayment.payment_url) {
        return {
          ok: true,
          orderNumber: existingOrder.order_number,
          paymentUrl: existingPayment.payment_url,
          paymentReference: existingPayment.provider_reference,
        };
      }

      return { ok: true, orderNumber: existingOrder.order_number };
    }

    const { data: cartRows, error: cartError } = await supabase
      .from('cart')
      .select('id, quantity, products(price)')
      .eq('user_id', user.id);

    if (cartError) {
      return { ok: false, error: cartError.message };
    }

    if (!cartRows || cartRows.length === 0) {
      return { ok: false, error: 'Your cart is empty. Add items before checkout.' };
    }

    const totals = calculateCheckoutTotals(cartRows as Array<{ quantity: number; products: { price: number } | null }>);

    if (totals.total <= 0) {
      return { ok: false, error: 'Order total is invalid. Please review your cart.' };
    }

    let shippingAddressId: string | null = null;

    if (data.selectedAddressId) {
      const addresses = await getAddressesForUser(user.id);
      const selectedAddress = addresses.find((address) => String(address.id) === data.selectedAddressId);
      if (!selectedAddress) {
        return { ok: false, error: 'The selected shipping address is no longer available.' };
      }
      shippingAddressId = String(selectedAddress.id);
    } else if (data.newAddress) {
      const createdAddress = await createAddressForUser(user.id, {
        label: data.newAddress.label,
        full_name: data.newAddress.fullName,
        phone_number: data.newAddress.phoneNumber,
        line1: data.newAddress.line1,
        line2: data.newAddress.line2 ?? null,
        city: data.newAddress.city,
        state: data.newAddress.state,
        postal_code: data.newAddress.postalCode ?? null,
        country: data.newAddress.country,
        is_default: Boolean(data.newAddress.setAsDefault),
      });
      shippingAddressId = String(createdAddress.id);
    }

    const orderNumber = await getNextOrderNumber();
    const createdOrder = await createOrderFromCart(user.id, {
      orderNumber,
      shippingAddressId,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      couponCode: data.couponCode ? data.couponCode : null,
      checkoutToken: data.checkoutToken,
      totals,
    });

    const provider = data.paymentProvider as PaymentProvider;
    const paymentReference = createPaymentReference(provider, createdOrder.order_number);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const callbackUrl = `${appUrl}/payment/callback?provider=${provider}&order=${encodeURIComponent(createdOrder.order_number)}`;

    const runningTestFallback =
      isTestPaymentMode() &&
      ((provider === 'paystack' && !process.env.PAYSTACK_SECRET_KEY) ||
        (provider === 'flutterwave' && !process.env.FLUTTERWAVE_SECRET_KEY));

    if (runningTestFallback) {
      const paidAt = new Date().toISOString();
      await createPaymentAttempt({
        orderId: String(createdOrder.id),
        buyerId: user.id,
        provider,
        providerReference: paymentReference,
        amount: totals.total,
        currency: 'NGN',
        paymentUrl: `${callbackUrl}&reference=${encodeURIComponent(paymentReference)}&test=1`,
        status: 'successful',
        receiptNumber: `RCPT-TEST-${createdOrder.order_number}`,
        paidAt,
      });

      return {
        ok: true,
        orderNumber: createdOrder.order_number,
        paymentUrl: `${callbackUrl}&reference=${encodeURIComponent(paymentReference)}&test=1`,
        paymentReference,
      };
    }

    const initialized = await initializeProviderPayment({
      provider,
      email: data.contactEmail,
      amount: totals.total,
      reference: paymentReference,
      callbackUrl,
      metadata: {
        order_number: createdOrder.order_number,
        order_id: createdOrder.id,
        buyer_id: user.id,
      },
    });

    await createPaymentAttempt({
      orderId: String(createdOrder.id),
      buyerId: user.id,
      provider,
      providerReference: initialized.providerReference,
      amount: totals.total,
      currency: 'NGN',
      paymentUrl: initialized.authorizationUrl,
    });

    return {
      ok: true,
      orderNumber: createdOrder.order_number,
      paymentUrl: initialized.authorizationUrl,
      paymentReference: initialized.providerReference,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete your checkout right now.';
    return { ok: false, error: message };
  }
}
