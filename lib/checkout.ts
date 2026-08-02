export type CheckoutLineItem = {
  quantity: number;
  products: {
    price: number;
  } | null;
};

export type CheckoutTotals = {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
};

const SHIPPING_FLAT_RATE = 1000;
const TAX_RATE = 0.075;

export function roundCurrency(value: number) {
  return Math.round(value);
}

export function calculateCheckoutTotals(items: CheckoutLineItem[]): CheckoutTotals {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + (item.products?.price ?? 0) * item.quantity, 0)
  );
  const shippingCost = subtotal > 0 ? SHIPPING_FLAT_RATE : 0;
  const taxAmount = roundCurrency(subtotal * TAX_RATE);

  return {
    subtotal,
    shippingCost,
    taxAmount,
    total: subtotal + shippingCost + taxAmount,
  };
}

export function formatCurrency(value: number) {
  return `₦${value.toLocaleString()}`;
}
