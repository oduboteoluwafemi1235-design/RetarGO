'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AddressRow } from '@/lib/supabase/orders.server';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast-provider';
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from './actions';

type AddressesPageClientProps = {
  initialAddresses: AddressRow[];
};

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
  isDefault: boolean;
};

type AddressId = string | number;

const emptyDraft: AddressDraft = {
  label: 'Home',
  fullName: '',
  phoneNumber: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Nigeria',
  isDefault: false,
};

function mapAddressToDraft(address: AddressRow): AddressDraft {
  return {
    label: address.label,
    fullName: address.full_name,
    phoneNumber: address.phone_number,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postal_code ?? '',
    country: address.country,
    isDefault: address.is_default,
  };
}

export default function AddressesPageClient({ initialAddresses }: AddressesPageClientProps) {
  const { pushToast } = useToast();
  const [addresses, setAddresses] = useState<AddressRow[]>(initialAddresses);
  const [editingId, setEditingId] = useState<AddressId | null>(null);
  const [form, setForm] = useState<AddressDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<AddressId | null>(null);
  const [defaultingId, setDefaultingId] = useState<AddressId | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyDraft);
    setErrors({});
  };

  const applyFieldErrors = (fieldErrors?: Record<string, string[]>) => {
    if (!fieldErrors) return;

    const nextErrors: Record<string, string> = {};
    for (const [field, values] of Object.entries(fieldErrors)) {
      if (values?.[0]) nextErrors[field] = values[0];
    }
    setErrors(nextErrors);
  };

  const refreshAddresses = async () => {
    const response = await fetch('/api/profile/addresses', { cache: 'no-store' });
    if (!response.ok) return;
    const data = (await response.json()) as { addresses: AddressRow[] };
    setAddresses(data.addresses ?? []);
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setErrors({});

    const payload = {
      label: form.label,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode || undefined,
      country: form.country,
      isDefault: form.isDefault,
    };

    const result = isEditing && editingId !== null
      ? await updateAddressAction({ id: editingId, ...payload })
      : await createAddressAction(payload);

    if (!result.ok) {
      applyFieldErrors(result.fieldErrors);
      pushToast(result.error ?? 'Unable to save address.', 'error');
      setSaving(false);
      return;
    }

    pushToast(isEditing ? 'Address updated successfully.' : 'Address added successfully.', 'success');
    await refreshAddresses();
    resetForm();
    setSaving(false);
  };

  const startEdit = (address: AddressRow) => {
    setEditingId(address.id);
    setForm(mapAddressToDraft(address));
    setErrors({});
  };

  const handleDelete = async (addressId: AddressId) => {
    if (deletingId || defaultingId) return;
    setDeletingId(addressId);

    const result = await deleteAddressAction(addressId);
    if (!result.ok) {
      pushToast(result.error ?? 'Unable to delete address.', 'error');
      setDeletingId(null);
      return;
    }

    pushToast('Address deleted.', 'success');
    await refreshAddresses();
    if (editingId === addressId) resetForm();
    setDeletingId(null);
  };

  const handleSetDefault = async (addressId: AddressId) => {
    if (defaultingId || deletingId) return;
    setDefaultingId(addressId);

    const result = await setDefaultAddressAction(addressId);
    if (!result.ok) {
      pushToast(result.error ?? 'Unable to set default address.', 'error');
      setDefaultingId(null);
      return;
    }

    pushToast('Default address updated.', 'success');
    await refreshAddresses();
    setDefaultingId(null);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Shipping addresses</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Save and manage delivery addresses for faster checkout.</p>
        </div>
        <Button variant="secondary" asChild><Link href="/checkout">Back to checkout</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <section className="space-y-4">
          {addresses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No addresses saved yet.
            </div>
          ) : (
            addresses.map((address) => (
              <article key={address.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{address.label}</p>
                    {address.is_default ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Default</p> : null}
                  </div>
                  <div className="flex gap-2">
                    {!address.is_default ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={defaultingId === address.id || deletingId === address.id}
                      >
                        {defaultingId === address.id ? 'Updating...' : 'Set default'}
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => startEdit(address)}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      disabled={deletingId === address.id || defaultingId === address.id}
                    >
                      {deletingId === address.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p>{address.full_name}</p>
                  <p>{address.phone_number}</p>
                  <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                  <p>{address.city}, {address.state} {address.postal_code ?? ''}</p>
                  <p>{address.country}</p>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">{isEditing ? 'Edit address' : 'Add new address'}</h2>
          <div className="mt-4 grid gap-3">
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Address label" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            {errors.label ? <p className="text-sm text-rose-600">{errors.label}</p> : null}
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Full name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            {errors.fullName ? <p className="text-sm text-rose-600">{errors.fullName}</p> : null}
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Phone number" value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
            {errors.phoneNumber ? <p className="text-sm text-rose-600">{errors.phoneNumber}</p> : null}
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Address line 1" value={form.line1} onChange={(event) => setForm((current) => ({ ...current, line1: event.target.value }))} />
            {errors.line1 ? <p className="text-sm text-rose-600">{errors.line1}</p> : null}
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Address line 2 (optional)" value={form.line2} onChange={(event) => setForm((current) => ({ ...current, line2: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="City" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
                {errors.city ? <p className="mt-1 text-sm text-rose-600">{errors.city}</p> : null}
              </div>
              <div>
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="State" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
                {errors.state ? <p className="mt-1 text-sm text-rose-600">{errors.state}</p> : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Postal code (optional)" value={form.postalCode} onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))} />
              <div>
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
                {errors.country ? <p className="mt-1 text-sm text-rose-600">{errors.country}</p> : null}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />
              Set as default address
            </label>

            <div className="mt-2 flex gap-2">
              <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEditing ? 'Update address' : 'Save address'}</Button>
              {isEditing ? <Button variant="secondary" onClick={resetForm}>Cancel</Button> : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
