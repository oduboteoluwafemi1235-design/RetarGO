import { createClient as createBrowserClient } from './client';

export type CartProduct = {
  id: string;
  title: string;
  price: number;
  images: string[];
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
    .select('id, product_id, quantity, products(id, title, price, images)')
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
    .select('id, status, quantity, title')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw new Error(productError.message);
  if (!product) throw new Error('Product no longer exists.');
  if (product.status !== 'active') throw new Error('This product is not available for purchase.');
  if (Number(product.quantity ?? 0) <= 0) throw new Error('This product is out of stock.');

  const userId = user.data.user.id;
  const { data: existing, error: existingError } = await (supabase.from('cart') as any)
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    const nextQuantity = Number(existing.quantity ?? 0) + quantity;
    if (nextQuantity > Number(product.quantity ?? 0)) {
      throw new Error('Not enough stock available for this quantity.');
    }
    const { data, error } = await (supabase.from('cart') as any)
      .update({ quantity: nextQuantity })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id, product_id, quantity, products(id, title, price, images)')
      .single();
    if (error) throw new Error(error.message);
    emitCartChanged();
    return data;
  }

  const { data, error } = await (supabase.from('cart') as any)
    .insert({ user_id: userId, product_id: productId, quantity })
    .select('id, product_id, quantity, products(id, title, price, images)')
    .single();
  if (error) throw new Error(error.message);
  emitCartChanged();
  return data;
}

export async function updateCartItemClient(id: string | number, quantity: number) {
  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Please sign in to update cart items.');

  const { data, error } = await (supabase.from('cart') as any)
    .update({ quantity })
    .eq('id', id)
    .select('id, product_id, quantity, products(id, title, price, images)');
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
