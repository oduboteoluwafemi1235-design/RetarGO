import { createClient as createServerClient } from './server';

export async function getWishlistForUser(userId?: string) {
  const supabase = await createServerClient();
  if (!userId) return [];
  const { data, error } = await supabase.from('wishlist').select('id, product_id, products(id, title, price, images)').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function isProductInWishlist(userId: string, productId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.from('wishlist').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle();
  return !!data;
}
