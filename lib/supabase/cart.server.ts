import { createClient as createServerClient } from './server';
import { isInventoryTracked, resolveStockQuantity } from '@/lib/inventory';

export async function getCartForUser(userId?: string) {
  const supabase = await createServerClient();
  if (!userId) return [];
  const { data, error } = await supabase.from('cart').select('id, product_id, quantity, products(id, title, price, images, status, stock_quantity, low_stock_threshold, track_inventory)').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addToCartServer(userId: string, productId: string, quantity = 1) {
  const supabase = await createServerClient();

  const { data: product, error: productError } = await (supabase.from('products') as any)
    .select('id, status, quantity, stock_quantity, low_stock_threshold, track_inventory')
    .eq('id', productId)
    .maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product) throw new Error('Product no longer exists.');
  if (product.status !== 'active') throw new Error('This product is not available for purchase.');

  const tracked = isInventoryTracked(product);
  const stockQuantity = resolveStockQuantity(product);
  if (tracked && stockQuantity <= 0) throw new Error('This product is out of stock.');

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
      .select();
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  const { data, error } = await (supabase.from('cart') as any)
    .insert({ user_id: userId, product_id: productId, quantity })
    .select();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function updateCartItemServer(id: number, quantity: number) {
  const supabase = await createServerClient();

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

  const { data, error } = await (supabase.from('cart') as any).update({ quantity }).eq('id', id).select();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function removeCartItemServer(id: number) {
  const supabase = await createServerClient();
  const { error } = await (supabase.from('cart') as any).delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
