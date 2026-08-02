import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAddressesForUser } from '@/lib/supabase/orders.server';
import { getCartForUser } from '@/lib/supabase/cart.server';
import CheckoutPageClient from './page.client';

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  const [cart, addresses] = await Promise.all([getCartForUser(user.id), getAddressesForUser(user.id)]);

  return <CheckoutPageClient initialCart={cart} initialAddresses={addresses} userEmail={user.email ?? ''} />;
}
