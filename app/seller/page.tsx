import SellerDashboardClient from '@/app/seller-dashboard/page.client';
import { loadSellerDashboardData, type SellerSection } from '@/app/seller-dashboard/data';

const validSections = new Set<SellerSection>(['overview', 'products', 'orders', 'analytics', 'profile']);

function normalizeSection(tabValue: string | undefined): SellerSection {
  if (!tabValue) return 'overview';
  const lower = tabValue.toLowerCase();
  return validSections.has(lower as SellerSection) ? (lower as SellerSection) : 'overview';
}

export default async function SellerPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const section = normalizeSection(params?.tab);
  const data = await loadSellerDashboardData();

  return (
    <SellerDashboardClient
      initialProducts={data.initialProducts}
      initialOrders={data.initialOrders}
      categories={data.categories}
      analytics={data.analytics}
      usingPrivilegedClient={data.usingPrivilegedClient}
      profile={data.profile}
      initialSection={section}
      navigationMode="sidebar"
    />
  );
}
