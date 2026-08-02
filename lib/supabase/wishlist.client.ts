import { createClient as createBrowserClient } from './client';

export async function toggleWishlistClient(productId: string) {
  const supabase = createBrowserClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Not authenticated');
  const userId = user.data.user.id;

  // check existing
  const { data } = await (supabase.from('wishlist') as any).select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle();
  if (data) {
    await supabase.from('wishlist').delete().eq('id', data.id);
    return { removed: true };
  }

  const insert = await (supabase.from('wishlist') as any).insert({ user_id: userId, product_id: productId }).select();
  if (insert.error) throw new Error(insert.error.message);
  return { added: true };
}
