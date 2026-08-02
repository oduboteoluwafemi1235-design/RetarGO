'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast-provider';
import type { CartRow } from '@/lib/supabase/cart.client';
import type { AddressRow } from '@/lib/supabase/orders.server';
import { calculateCheckoutTotals, formatCurrency } from '@/lib/checkout';
import { placeOrderAction } from './actions';

type CheckoutPageClientProps = {
  initialCart: CartRow[];
  initialAddresses: AddressRow[];
  userEmail: string;
};

type PaymentProvider = 'paystack' | 'flutterwave';

type AddressDraft = {
  label: string;
  fullName: string;
  phoneNumber: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  setAsDefault: boolean;
};

const emptyAddressDraft: AddressDraft = {
  label: 'Home',
  fullName: '',
  phoneNumber: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Nigeria',
  setAsDefault: false,
};

function generateCheckoutToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function CheckoutPageClient({ initialCart, initialAddresses, userEmail }: CheckoutPageClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [cart] = useState<CartRow[]>(initialCart);
  const [addresses] = useState<AddressRow[]>(initialAddresses);
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [contactPhone, setContactPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(initialAddresses.length === 0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAddresses.find((address) => address.is_default)?.id
      ? String(initialAddresses.find((address) => address.is_default)?.id)
      : initialAddresses[0]?.id
        ? String(initialAddresses[0]?.id)
        : null
  );
  const [newAddress, setNewAddress] = useState<AddressDraft>(emptyAddressDraft);
  const [checkoutToken] = useState(generateCheckoutToken);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('paystack');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totals = useMemo(() => calculateCheckoutTotals(cart), [cart]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!contactEmail.trim()) {
      nextErrors.contactEmail = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(contactEmail)) {
      nextErrors.contactEmail = 'Enter a valid email address.';
    }

    if (!contactPhone.trim()) {
      nextErrors.contactPhone = 'Phone number is required.';
    }

    if (!useNewAddress && !selectedAddressId) {
      nextErrors.selectedAddressId = 'Please select a shipping address.';
    }

    if (useNewAddress) {
      if (!newAddress.label.trim()) nextErrors.addressLabel = 'Address label is required.';
      if (!newAddress.fullName.trim()) nextErrors.addressFullName = 'Recipient full name is required.';
      if (!newAddress.phoneNumber.trim()) nextErrors.addressPhone = 'Recipient phone number is required.';
      if (!newAddress.line1.trim()) nextErrors.addressLine1 = 'Delivery address is required.';
      if (!newAddress.city.trim()) nextErrors.addressCity = 'City is required.';
      if (!newAddress.state.trim()) nextErrors.addressState = 'State is required.';
      if (!newAddress.country.trim()) nextErrors.addressCountry = 'Country is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const placeOrder = async () => {
    if (submitting) return;

    if (cart.length === 0) {
      pushToast('Your cart is empty. Add items before checkout.', 'error');
      return;
    }

    if (!validate()) {
      pushToast('Please fill all required checkout fields.', 'error');
      return;
    }

    setSubmitting(true);
    setErrors({});

    const result = await placeOrderAction({
      contactEmail,
      contactPhone,
      couponCode,
      selectedAddressId: useNewAddress ? undefined : selectedAddressId ?? undefined,
      newAddress: useNewAddress
        ? {
            label: newAddress.label,
            fullName: newAddress.fullName,
            phoneNumber: newAddress.phoneNumber,
            line1: newAddress.line1,
            line2: newAddress.line2 || undefined,
            city: newAddress.city,
            state: newAddress.state,
            postalCode: newAddress.postalCode || undefined,
            country: newAddress.country,
            setAsDefault: newAddress.setAsDefault,
          }
        : undefined,
      checkoutToken,
      paymentProvider,
    });

    if (!result.ok) {
      if (result.fieldErrors) {
        const firstErrors: Record<string, string> = {};
        for (const [field, fieldErrors] of Object.entries(result.fieldErrors)) {
          const firstError = fieldErrors?.[0];
          if (firstError) {
            firstErrors[field] = firstError;
          }
        }
        setErrors(firstErrors);
      }
      pushToast(result.error ?? 'Unable to place order.', 'error');
      setSubmitting(false);
      return;
    }

    if (result.paymentUrl) {
      pushToast('Redirecting to secure payment gateway...', 'success');
      window.location.assign(result.paymentUrl);
      return;
    }

    pushToast('Order placed. Awaiting payment confirmation.', 'success');
    router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber ?? '')}`);
  };

  if (cart.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-3xl font-semibold">Checkout</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Your cart is empty. Add products before checkout.</p>
          <Button className="mt-6" asChild>
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-3xl font-semibold">Checkout</h1>

          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Contact information</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                  />
                  {errors.contactEmail ? <p className="mt-1 text-sm text-rose-600">{errors.contactEmail}</p> : null}
                </div>
                <div>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Phone number"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                  />
                  {errors.contactPhone ? <p className="mt-1 text-sm text-rose-600">{errors.contactPhone}</p> : null}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Delivery address</h2>
                {addresses.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setUseNewAddress((current) => !current)}
                    className="text-sm font-semibold text-brand-600"
                  >
                    {useNewAddress ? 'Use saved address' : 'Add new address'}
                  </button>
                ) : null}
              </div>

              {!useNewAddress && addresses.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {addresses.map((address) => {
                    const selected = selectedAddressId === String(address.id);
                    return (
                      <button
                        type="button"
                        key={address.id}
                        onClick={() => setSelectedAddressId(String(address.id))}
                        className={`w-full rounded-2xl border p-4 text-left transition ${selected ? 'border-brand-600 bg-brand-50/40 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{address.label}</p>
                          {address.is_default ? <span className="text-xs font-semibold text-brand-600">Default</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{address.full_name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{address.phone_number}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{address.city}, {address.state} {address.postal_code ?? ''}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{address.country}</p>
                      </button>
                    );
                  })}
                  {errors.selectedAddressId ? <p className="text-sm text-rose-600">{errors.selectedAddressId}</p> : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Address label (Home, Office)"
                      value={newAddress.label}
                      onChange={(event) => setNewAddress((current) => ({ ...current, label: event.target.value }))}
                    />
                    {errors.addressLabel ? <p className="mt-1 text-sm text-rose-600">{errors.addressLabel}</p> : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Recipient full name"
                      value={newAddress.fullName}
                      onChange={(event) => setNewAddress((current) => ({ ...current, fullName: event.target.value }))}
                    />
                    {errors.addressFullName ? <p className="mt-1 text-sm text-rose-600">{errors.addressFullName}</p> : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Recipient phone number"
                      value={newAddress.phoneNumber}
                      onChange={(event) => setNewAddress((current) => ({ ...current, phoneNumber: event.target.value }))}
                    />
                    {errors.addressPhone ? <p className="mt-1 text-sm text-rose-600">{errors.addressPhone}</p> : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Country"
                      value={newAddress.country}
                      onChange={(event) => setNewAddress((current) => ({ ...current, country: event.target.value }))}
                    />
                    {errors.addressCountry ? <p className="mt-1 text-sm text-rose-600">{errors.addressCountry}</p> : null}
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Address line 1"
                      value={newAddress.line1}
                      onChange={(event) => setNewAddress((current) => ({ ...current, line1: event.target.value }))}
                    />
                    {errors.addressLine1 ? <p className="mt-1 text-sm text-rose-600">{errors.addressLine1}</p> : null}
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Address line 2 (optional)"
                      value={newAddress.line2}
                      onChange={(event) => setNewAddress((current) => ({ ...current, line2: event.target.value }))}
                    />
                  </div>
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(event) => setNewAddress((current) => ({ ...current, city: event.target.value }))}
                    />
                    {errors.addressCity ? <p className="mt-1 text-sm text-rose-600">{errors.addressCity}</p> : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="State"
                      value={newAddress.state}
                      onChange={(event) => setNewAddress((current) => ({ ...current, state: event.target.value }))}
                    />
                    {errors.addressState ? <p className="mt-1 text-sm text-rose-600">{errors.addressState}</p> : null}
                  </div>
                  <div>
                    <input
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Postal code (optional)"
                      value={newAddress.postalCode}
                      onChange={(event) => setNewAddress((current) => ({ ...current, postalCode: event.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newAddress.setAsDefault}
                      onChange={(event) => setNewAddress((current) => ({ ...current, setAsDefault: event.target.checked }))}
                    />
                    Set as default address
                  </label>
                </div>
              )}

              <div className="mt-4 text-sm">
                <Link href="/profile/addresses" className="font-semibold text-brand-600">Manage saved addresses</Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{item.products?.title ?? 'Product'}</p>
                  <p className="text-slate-500 dark:text-slate-400">Qty {item.quantity}</p>
                </div>
                <p className="font-medium">{formatCurrency((item.products?.price ?? 0) * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(totals.shippingCost)}</span></div>
            <div className="flex justify-between"><span>Tax (7.5%)</span><span>{formatCurrency(totals.taxAmount)}</span></div>
            <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-white"><span>Grand total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Coupon code (UI only for now)</label>
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Enter coupon code"
            />
          </div>

          <div className="mt-5">
            <p className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment method</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <input
                  type="radio"
                  name="payment-provider"
                  checked={paymentProvider === 'paystack'}
                  onChange={() => setPaymentProvider('paystack')}
                />
                Paystack
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <input
                  type="radio"
                  name="payment-provider"
                  checked={paymentProvider === 'flutterwave'}
                  onChange={() => setPaymentProvider('flutterwave')}
                />
                Flutterwave
              </label>
            </div>
          </div>

          {errors.newAddress ? <p className="mt-3 text-sm text-rose-600">{errors.newAddress}</p> : null}

          <Button className="mt-6 w-full" variant="primary" onClick={placeOrder} disabled={submitting}>
            {submitting ? 'Preparing payment...' : 'Proceed to payment'}
          </Button>
        </aside>
      </div>
    </main>
  );
}
