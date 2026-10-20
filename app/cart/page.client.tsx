'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast-provider';
import { getCartClient, removeCartItemClient, updateCartItemClient, clearCartClient, type CartRow } from '@/lib/supabase/cart.client';
import { formatCurrency } from '@/lib/checkout';

export default function CartPageClient() {
  const toast = useToast();
  const [cart, setCart] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCart = async () => {
    setLoading(true);
    try {
      const data = await getCartClient();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load cart.');
      toast.pushToast('Unable to load cart.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.products?.price ?? 0) * item.quantity, 0), [cart]);
  const shipping = subtotal > 0 ? 1000 : 0;
  const tax = Math.round(subtotal * 0.075);
  const total = subtotal + shipping + tax;

  const updateQuantity = async (item: CartRow, quantity: number) => {
    if (quantity < 1) return;
    const itemKey = String(item.id);
    setItemLoading((current) => ({ ...current, [itemKey]: true }));
    try {
      const result = await updateCartItemClient(item.id, quantity);
      if (Array.isArray(result)) setCart(result);
      else setCart((current) => current.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, quantity } : cartItem)));
      toast.pushToast('Quantity updated.', 'success');
    } catch (err) {
      toast.pushToast(err instanceof Error ? err.message : 'Unable to update item.', 'error');
    } finally {
      setItemLoading((current) => ({ ...current, [itemKey]: false }));
    }
  };

  const removeItem = async (item: CartRow) => {
    const itemKey = String(item.id);
    setItemLoading((current) => ({ ...current, [itemKey]: true }));
    try {
      await removeCartItemClient(item.id);
      setCart((current) => current.filter((cartItem) => cartItem.id !== item.id));
      toast.pushToast('Item removed from cart.', 'success');
    } catch (err) {
      toast.pushToast(err instanceof Error ? err.message : 'Unable to remove item.', 'error');
    } finally {
      setItemLoading((current) => ({ ...current, [itemKey]: false }));
    }
  };

  const clearCart = async () => {
    setGlobalLoading(true);
    try {
      await clearCartClient();
      setCart([]);
      toast.pushToast('Cart cleared.', 'success');
    } catch (err) {
      toast.pushToast(err instanceof Error ? err.message : 'Unable to clear cart.', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold mb-6">Shopping cart</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-32 rounded-3xl border bg-slate-100 p-4 dark:bg-slate-900" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Shopping cart</h1>
        <Button variant="secondary" onClick={clearCart} disabled={cart.length === 0 || globalLoading}>
          {globalLoading ? 'Clearing…' : 'Clear cart'}
        </Button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">{error}</div>
      ) : cart.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-4xl">🛒</p>
          <p className="mt-3 text-lg font-semibold">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Find something you like and it will show up here.</p>
          <Link
            href="/products"
            className="mt-5 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {cart.map((item) => {
              const busy = Boolean(itemLoading[String(item.id)]);
              const unitPrice = item.products?.price ?? 0;
              const image = item.products?.images?.[0];
              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {image ? (
                      <img src={image} alt={item.products?.title ?? 'Product'} className="h-24 w-24 rounded-3xl object-cover" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-3xl dark:bg-slate-800">📦</div>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{item.products?.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatCurrency(unitPrice)}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                            disabled={busy || item.quantity <= 1}
                            className="h-10 w-10 rounded-full text-lg font-semibold text-slate-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200"
                          >
                            &minus;
                          </button>
                          <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                            disabled={busy}
                            className="h-10 w-10 rounded-full text-lg font-semibold text-slate-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          disabled={busy}
                          className="text-sm font-semibold text-coral-600 transition hover:text-coral-700 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Item total</p>
                      <p className="text-lg font-bold">{formatCurrency(unitPrice * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-xl font-semibold">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">Subtotal<span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between">Shipping<span>{formatCurrency(shipping)}</span></div>
              <div className="flex justify-between">Tax<span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-white">Total<span>{formatCurrency(total)}</span></div>
            </div>
            <Button className="mt-6 w-full" variant="primary" disabled={cart.length === 0} asChild>
              <Link href="/checkout">Proceed to checkout</Link>
            </Button>
          </aside>
        </div>
      )}
    </main>
  );
}