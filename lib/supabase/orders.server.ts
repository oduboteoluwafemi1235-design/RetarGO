import { createClient as createServerClient } from './server';
import type { Database } from '@/types/supabase';

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
  const supabase = await createServerClient();
  const today = new Date();
  const prefix = `RTG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const { data, error } = await (supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `${prefix}-%`)
    .order('order_number', { ascending: false })
    .limit(1)) as { data: Array<{ order_number: string }> | null; error: { message: string } | null };

  if (error) throw new Error(error.message);
  const lastOrder = data?.[0]?.order_number;
  const nextSequence = lastOrder ? Number(lastOrder.split('-').pop() ?? '0') + 1 : 1;
  return `${prefix}-${String(nextSequence).padStart(6, '0')}`;
}

export async function createOrderFromCart(userId: string, input: CreateOrderInput): Promise<CreatedOrderResult> {
  const supabase = await createServerClient();
  const rpcResult = await (supabase as any).rpc('create_order_transaction', {
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

  if (!rpcResult.error && rpcResult.data?.length) {
    return rpcResult.data[0] as CreatedOrderResult;
  }

  const rpcErrorMessage = `${rpcResult.error?.message ?? ''}`.toLowerCase();
  const shouldFallback = rpcErrorMessage.includes('order_items') || rpcErrorMessage.includes('column "total"') || rpcErrorMessage.includes('null value in column');
  if (!shouldFallback) {
    throw new Error(rpcResult.error?.message ?? 'Unable to create order.');
  }

  const { data: cartRows, error: cartError } = await (supabase.from('cart') as any)
    .select('product_id, quantity, products(id, seller_id, price, title, quantity)')
    .eq('user_id', userId);

  if (cartError) throw new Error(cartError.message);
  if (!cartRows || cartRows.length === 0) throw new Error('Cart is empty.');

  const sellerIds = [...new Set(cartRows.map((row: any) => row.products?.seller_id).filter(Boolean))];
  if (sellerIds.length > 1) {
    throw new Error('Checkout supports products from one seller at a time. Please remove items from other sellers.');
  }

  const insufficientStockItem = cartRows.find((row: any) => Number(row.quantity ?? 0) > Number(row.products?.quantity ?? 0));
  if (insufficientStockItem) {
    throw new Error(`Insufficient stock for ${insufficientStockItem.products?.title ?? 'one of the items'}.`);
  }

  for (const row of cartRows as any[]) {
    const quantity = Number(row.quantity ?? 0);
    const stockQuantity = Number(row.products?.quantity ?? 0);

    if (quantity > stockQuantity) {
      throw new Error(`Insufficient stock for ${row.products?.title ?? 'one of the items'}.`);
    }

    const nextQuantity = stockQuantity - quantity;
    const updatePayload: Record<string, unknown> = { quantity: nextQuantity };
    if (nextQuantity <= 0) {
      updatePayload.status = 'sold';
    }

    const { error: stockUpdateError } = await (supabase.from('products') as any)
      .update(updatePayload)
      .eq('id', row.product_id);

    if (stockUpdateError) {
      throw new Error(stockUpdateError.message);
    }
  }

  const firstSeller = cartRows.find((row: any) => row.products?.seller_id)?.products?.seller_id ?? null;
  const { data: insertedOrder, error: insertOrderError } = await (supabase.from('orders') as any)
    .insert({
      buyer_id: userId,
      seller_id: firstSeller,
      order_number: input.orderNumber,
      shipping_address_id: input.shippingAddressId,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      subtotal: input.totals.subtotal,
      shipping_cost: input.totals.shippingCost,
      tax_amount: input.totals.taxAmount,
      coupon_code: input.couponCode,
      checkout_token: input.checkoutToken,
      total: input.totals.total,
      status: 'pending',
    })
    .select('id, order_number, total, status, created_at')
    .single();

  if (insertOrderError) throw new Error(insertOrderError.message);

  const orderItemsPayload = cartRows.map((row: any) => {
    const unitPrice = Number(row.products?.price ?? 0);
    const quantity = Number(row.quantity ?? 0);
    return {
      order_id: insertedOrder.id,
      product_id: row.product_id,
      quantity,
      unit_price: unitPrice,
      total: unitPrice * quantity,
    };
  });

  const { error: insertItemsError } = await (supabase.from('order_items') as any).insert(orderItemsPayload);
  if (insertItemsError) throw new Error(insertItemsError.message);

  const { error: clearCartError } = await (supabase.from('cart') as any).delete().eq('user_id', userId);
  if (clearCartError) throw new Error(clearCartError.message);

  return insertedOrder as CreatedOrderResult;
}
