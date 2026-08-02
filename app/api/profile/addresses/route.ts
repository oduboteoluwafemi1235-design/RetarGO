import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAddressesForUser } from '@/lib/supabase/orders.server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const addresses = await getAddressesForUser(user.id);
    return NextResponse.json({ addresses });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load addresses.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
