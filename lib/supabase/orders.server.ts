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
  // Use explicit application-side order creation to guarantee inventory updates
  // across partially migrated database functions.

  const { data: cartRows, error: cartError } = await (supabase.from('cart') as any)
    .select('product_id, quantity, products(id, seller_id, price, title, quantity, stock_quantity, low_stock_threshold, track_inventory, status)')
    .eq('user_id', userId);

  if (cartError) throw new Error(cartError.message);
  if (!cartRows || cartRows.length === 0) throw new Error('Cart is empty.');

  const sellerIds = [...new Set(cartRows.map((row: any) => row.products?.seller_id).filter(Boolean))];
  if (sellerIds.length > 1) {
    throw new Error('Checkout supports products from one seller at a time. Please remove items from other sellers.');
  }

  const insufficientStockItem = cartRows.find((row: any) => {
    if (!row.products || !isInventoryTracked(row.products)) return false;
    return Number(row.quantity ?? 0) > resolveStockQuantity(row.products);
  });
  if (insufficientStockItem) {
    throw new Error(`Only ${resolveStockQuantity(insufficientStockItem.products ?? {})} items left in stock.`);
  }

  for (const row of cartRows as any[]) {
    const quantity = Number(row.quantity ?? 0);
    const stockQuantity = resolveStockQuantity(row.products ?? {});
    const tracked = isInventoryTracked(row.products ?? {});

    if (tracked && quantity > stockQuantity) {
      throw new Error(`Only ${stockQuantity} items left in stock.`);
    }

    if (tracked) {
      const { error: stockUpdateError } = await (supabase as any)
        .rpc('decrement_product_inventory', {
          p_product_id: row.product_id,
          p_quantity: quantity,
        });

      if (stockUpdateError) {
        throw new Error(stockUpdateError.message);
      }
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
      product_title: row.products?.title ?? 'Product',
      quantity,
      unit_price: unitPrice,
      total: unitPrice * quantity,
    };
  });

  const { error: insertItemsError } = await (supabase.from('order_items') as any).insert(orderItemsPayload);
  if (insertItemsError) {
    const missingProductTitleColumn = insertItemsError.message.toLowerCase().includes('product_title') && insertItemsError.message.toLowerCase().includes('does not exist');

    if (!missingProductTitleColumn) {
      throw new Error(insertItemsError.message);
    }

    // Compatibility fallback for legacy databases that do not have order_items.product_title yet.
    const legacyOrderItemsPayload = orderItemsPayload.map((item: Record<string, unknown>) => {
      const { product_title, ...rest } = item;
      return rest;
    });
    const { error: legacyInsertItemsError } = await (supabase.from('order_items') as any).insert(legacyOrderItemsPayload);
    if (legacyInsertItemsError) {
      throw new Error(legacyInsertItemsError.message);
    }
  }

  const { error: clearCartError } = await (supabase.from('cart') as any).delete().eq('user_id', userId);
  if (clearCartError) throw new Error(clearCartError.message);

  return insertedOrder as CreatedOrderResult;
}
