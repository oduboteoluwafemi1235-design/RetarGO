import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAddressesForUser } from '@/lib/supabase/orders.server';
import AddressesPageClient from './page.client';

export default async function AddressesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  const addresses = await getAddressesForUser(user.id);

  return <AddressesPageClient initialAddresses={addresses} />;
}
