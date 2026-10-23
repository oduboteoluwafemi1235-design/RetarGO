import { createClient as createServerClient } from './server';
import type { Database } from '@/types/supabase';
import { isInventoryTracked, resolveStockQuantity } from '@/lib/inventory';

export type AddressRow = Database['public']['Tables']['addresses']['Row'];
export type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderStatus = OrderRow['status'];

export type CheckoutTotals = {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
};

export type CreateOrderInput = {
  orderNumber: string;
  shippingAddressId: string | null;
  contactEmail: string;
  contactPhone: string;
  couponCode: string | null;
  checkoutToken: string;
  totals: CheckoutTotals;
};

export type CreatedOrderResult = {
  id: string;
  order_number: string;
  total: number;
  status: OrderStatus;
  created_at: string;
};

type AddressId = string | number;

export async function getAddressesForUser(userId: string): Promise<AddressRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AddressRow[];
}

export async function createAddressForUser(userId: string, address: Omit<AddressInsert, 'user_id'>) {
  const supabase = await createServerClient();
  if (address.is_default) {
    await (supabase.from('addresses') as any).update({ is_default: false }).eq('user_id', userId);
  }

  const { data, error } = await (supabase.from('addresses') as any)
    .insert({ ...address, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AddressRow;
}

export async function updateAddressForUser(userId: string, addressId: AddressId, updates: Partial<AddressInsert>) {
  const supabase = await createServerClient();
  if (updates.is_default) {
    await (supabase.from('addresses') as any).update({ is_default: false }).eq('user_id', userId);
  }

  const { data, error } = await (supabase.from('addresses') as any)
    .update(updates)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AddressRow;
}

export async function deleteAddressForUser(userId: string, addressId: AddressId) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('addresses').delete().eq('id', addressId).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function setDefaultAddressForUser(userId: string, addressId: AddressId) {
  const supabase = await createServerClient();
  await (supabase.from('addresses') as any).update({ is_default: false }).eq('user_id', userId);
  const { data, error } = await (supabase.from('addresses') as any)
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AddressRow;
}

export async function getOrdersForUser(userId: string): Promise<
  Array<Pick<OrderRow, 'id' | 'order_number' | 'subtotal' | 'shipping_cost' | 'tax_amount' | 'total' | 'status' | 'created_at' | 'shipping_address_id'>>
> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, subtotal, shipping_cost, tax_amount, total, status, created_at, shipping_address_id')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<
    Pick<OrderRow, 'id' | 'order_number' | 'subtotal' | 'shipping_cost' | 'tax_amount' | 'total' | 'status' | 'created_at' | 'shipping_address_id'>
  >;
}

export async function getOrderByNumber(userId: string, orderNumber: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, contact_email, contact_phone, subtotal, shipping_cost, tax_amount, coupon_code, total, status, created_at, shipping_address_id, shipping_address:shipping_address_id(*), order_items(id, quantity, unit_price, total, products(id, title, price, images))'
    )
    .eq('buyer_id', userId)
    .eq('order_number', orderNumber)
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}

export async function getOrderByNumberPublic(orderNumber: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, contact_email, contact_phone, subtotal, shipping_cost, tax_amount, coupon_code, total, status, created_at, shipping_address_id, shipping_address:shipping_address_id(*), order_items(id, quantity, unit_price, total, products(id, title, price, images))'
    )
    .eq('order_number', orderNumber)
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}

export async function getOrderByCheckoutToken(
  userId: string,
  checkoutToken: string
): Promise<Pick<OrderRow, 'id' | 'order_number' | 'total' | 'status' | 'created_at'> | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, total, status, created_at')
    .eq('buyer_id', userId)
    .eq('checkout_token', checkoutToken)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Pick<OrderRow, 'id' | 'order_number' | 'total' | 'status' | 'created_at'> | null;
}

export async function getNextOrderNumber() {
  const today = new Date();
  const prefix = `RTG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const timePart = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}${String(today.getSeconds()).padStart(2, '0')}${String(today.getMilliseconds()).padStart(3, '0')}`;
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timePart}${randomPart}`;
}

export async function createOrderFromCart(userId: string, input: CreateOrderInput): Promise<CreatedOrderResult> {
  const supabase = await createServerClient();

  // One database call: stock check, stock reduction, order, order items and
  // cart clearing all happen in a single transaction. If any step fails, the
  // database undoes all of it, including the stock change.
  const { data, error } = await (supabase as any).rpc('create_order_transaction', {
    buyer: userId,
    p_order_number: input.orderNumber,
    p_shipping_address_id: input.shippingAddressId,
    p_contact_email: input.contactEmail,
    p_contact_phone: input.contactPhone,
    p_subtotal: input.totals.subtotal,
    p_shipping_cost: input.totals.shippingCost,
    p_tax_amount: input.totals.taxAmount,
    p_total: input.totals.total,
    p_coupon_code: input.couponCode,
    p_checkout_token: input.checkoutToken,
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Order could not be created.');

  return row as CreatedOrderResult;
}