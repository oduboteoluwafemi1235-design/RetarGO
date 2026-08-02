import SellerDashboardClient from './page.client';
import { loadSellerDashboardData } from './data';

export default async function SellerDashboardPage() {
  const data = await loadSellerDashboardData();

  return (
    <SellerDashboardClient
      initialProducts={data.initialProducts}
      initialOrders={data.initialOrders}
      categories={data.categories}
      analytics={data.analytics}
      usingPrivilegedClient={data.usingPrivilegedClient}
      profile={data.profile}
    />
  );
}
