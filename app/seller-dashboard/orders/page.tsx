import SellerDashboardClient from '@/app/seller-dashboard/page.client';
import { loadSellerDashboardData } from '@/app/seller-dashboard/data';

export default async function SellerOrdersPage() {
  const data = await loadSellerDashboardData();

  return (
    <SellerDashboardClient
      initialProducts={data.initialProducts}
      initialOrders={data.initialOrders}
      categories={data.categories}
      analytics={data.analytics}
      usingPrivilegedClient={data.usingPrivilegedClient}
      profile={data.profile}
      initialSection="orders"
      navigationMode="sidebar"
    />
  );
}