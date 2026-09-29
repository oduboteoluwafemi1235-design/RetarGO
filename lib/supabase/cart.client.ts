import { createClient as createBrowserClient } from './client';
import { isInventoryTracked, resolveStockQuantity } from '@/lib/inventory';

export type CartProduct = {
  id: string;
  title: string;
  price: number;
  images: string[];
  stock_quantity?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  status?: string;
};

export type CartRow = {
  id: string | number;
  product_id: string;
  quantity: number;
  products: CartProduct | null;
};

const CART_CHANGED_EVENT = 'retargo:cart-changed';

function emitCartChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function getCartClient() {
  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) return [];

  const userId = user.data.user.id;
  const { data, error } = await (supabase.from('cart') as any)
    .select('id, product_id, quantity, products(id, title, price, images, status, stock_quantity, low_stock_threshold, track_inventory)')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addToCartClient(productId: string, quantity = 1) {
  console.log('Calling addToCart');
  console.log('Product ID:', productId);
  console.log('Product ID is valid UUID:', isUuid(productId));

  if (!isUuid(productId)) {
    throw new Error('Invalid product ID format.');
  }

  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Please sign in to add items to cart.');

  const { data: product, error: productError } = await (supabase.from('products') as any)
    .select('id, status, quantity, stock_quantity, low_stock_threshold, track_inventory, title')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw new Error(productError.message);
  if (!product) throw new Error('Product no longer exists.');
  if (product.status !== 'active') throw new Error('This product is not available for purchase.');

  const tracked = isInventoryTracked(product);
  const stockQuantity = resolveStockQuantity(product);
  if (tracked && stockQuantity <= 0) throw new Error('This product is out of stock.');

  const userId = user.data.user.id;
  const { data: existing, error: existingError } = await (supabase.from('cart') as any)
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    const nextQuantity = Number(existing.quantity ?? 0) + quantity;
    if (tracked && nextQuantity > stockQuantity) {
      throw new Error(`Only ${stockQuantity} items left in stock.`);
    }
    const { data, error } = await (supabase.from('cart') as any)
      .update({ quantity: nextQuantity })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id, product_id, quantity, products(id, title, price, images, status, stock_quantity, low_stock_threshold, track_inventory)')
      .single();
    if (error) throw new Error(error.message);
    emitCartChanged();
    return data;
  }

  const { data, error } = await (supabase.from('cart') as any)
    .insert({ user_id: userId, product_id: productId, quantity })
    .select('id, product_id, quantity, products(id, title, price, images, status, stock_quantity, low_stock_threshold, track_inventory)')
    .single();
  if (error) throw new Error(error.message);
  emitCartChanged();
  return data;
}

export async function updateCartItemClient(id: string | number, quantity: number) {
  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Please sign in to update cart items.');

  const { data: existing, error: existingError } = await (supabase.from('cart') as any)
    .select('id, product_id')
    .eq('id', id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (!existing?.product_id) throw new Error('Cart item no longer exists.');

  const { data: product, error: productError } = await (supabase.from('products') as any)
    .select('id, status, quantity, stock_quantity, low_stock_threshold, track_inventory')
    .eq('id', existing.product_id)
    .maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product) throw new Error('Product no longer exists.');
  if (product.status !== 'active') throw new Error('This product is not available for purchase.');

  if (isInventoryTracked(product)) {
    const stockQuantity = resolveStockQuantity(product);
    if (quantity > stockQuantity) {
      throw new Error(`Only ${stockQuantity} items left in stock.`);
    }
  }

  const { data, error } = await (supabase.from('cart') as any)
    .update({ quantity })
    .eq('id', id)
    .select('id, product_id, quantity, products(id, title, price, images, status, stock_quantity, low_stock_threshold, track_inventory)');
  if (error) throw new Error(error.message);
  emitCartChanged();
  return data ?? [];
}

export async function removeCartItemClient(id: string | number) {
  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Please sign in to remove cart items.');

  const { error } = await (supabase.from('cart') as any)
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  emitCartChanged();
  return true;
}

export async function clearCartClient() {
  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Please sign in to clear cart.');

  const { error } = await (supabase.from('cart') as any)
    .delete()
    .eq('user_id', user.data.user.id);
  if (error) throw new Error(error.message);
  emitCartChanged();
  return [];
}

export async function mergeGuestCart(userId: string) {
  void userId;
}
