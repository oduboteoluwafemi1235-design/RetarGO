import { createClient as createServerClient } from './server';

export async function getCartForUser(userId?: string) {
  const supabase = await createServerClient();
  if (!userId) return [];
  const { data, error } = await supabase.from('cart').select('id, product_id, quantity, products(id, title, price, images)').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addToCartServer(userId: string, productId: string, quantity = 1) {
  const supabase = await createServerClient();
  const { data: existing, error: existingError } = await (supabase.from('cart') as any)
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    const nextQuantity = Number(existing.quantity ?? 0) + quantity;
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
