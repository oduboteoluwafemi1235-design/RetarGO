import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { toSignedImageUrl, toSignedImageUrls } from '@/lib/product-images';
import { isLowStock, isOutOfStock, resolveLowStockThreshold, resolveStockQuantity } from '@/lib/inventory';

export type SellerSection = 'overview' | 'products' | 'orders' | 'analytics' | 'profile';

export type SellerDashboardProduct = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  quantity: number;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  images: string[];
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  status: 'active' | 'pending' | 'sold';
  createdAt: string;
};

export type SellerOrderItem = {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
};

export type SellerOrder = {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  contactEmail: string;
  contactPhone: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  items: SellerOrderItem[];
};

export type SellerAnalytics = {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  totalRevenue: number;
  recentSales: Array<{ label: string; total: number }>;
  topProducts: Array<{ productId: string; title: string; quantity: number; revenue: number }>;
};

export type SellerDashboardData = {
  initialProducts: SellerDashboardProduct[];
  initialOrders: SellerOrder[];
  categories: Array<{ id: string; name: string }>;
  lowStockProducts: SellerDashboardProduct[];
  outOfStockProducts: SellerDashboardProduct[];
  analytics: SellerAnalytics;
  usingPrivilegedClient: boolean;
  profile: {
    displayName: string;
    avatarUrl: string;
    storeName: string;
    storeDescription: string;
    contactEmail: string;
    contactPhone: string;
  };
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getSalesInRange(orders: SellerOrder[], fromInclusive: Date) {
  return orders
    .filter((order) => new Date(order.createdAt).getTime() >= fromInclusive.getTime() && order.status === 'delivered')
    .reduce((sum, order) => sum + order.total, 0);
}

function buildRecentSalesSeries(orders: SellerOrder[]) {
  const points: Array<{ label: string; total: number }> = [];
  const now = new Date();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - dayOffset);

    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const total = orders
      .filter((order) => {
        const orderTime = new Date(order.createdAt).getTime();
        return order.status === 'delivered' && orderTime >= date.getTime() && orderTime < nextDate.getTime();
      })
      .reduce((sum, order) => sum + order.total, 0);

    points.push({ label: getDateLabel(date), total });
  }

  return points;
}

function buildTopProducts(orders: SellerOrder[]) {
  const map = new Map<string, { productId: string; title: string; quantity: number; revenue: number }>();

  orders
    .filter((order) => order.status === 'delivered')
    .forEach((order) => {
      order.items.forEach((item) => {
        const existing = map.get(item.productId) ?? {
          productId: item.productId,
          title: item.productTitle,
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.quantity * item.unitPrice;
        map.set(item.productId, existing);
      });
    });

  return [...map.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

export async function loadSellerDashboardData(): Promise<SellerDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirected=true');
  }

  const profileResult = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const profileData = profileResult.data ?? {};
  const role = (profileData.role as string | null) ?? null;

  if (role === 'customer') {
    redirect('/profile');
  }

  let dataClient: any = supabase;
  let usingPrivilegedClient = false;

  try {
    dataClient = createAdminClient();
    usingPrivilegedClient = true;
  } catch {
    dataClient = supabase;
  }

  const [categoriesResult, productsResult, ordersResult] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    (dataClient.from('products') as any)
      .select('id, title, description, category_id, price, quantity, stock_quantity, low_stock_threshold, track_inventory, images, condition, location, status, created_at, categories(name)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
    (dataClient.from('orders') as any)
      .select('id, order_number, buyer_id, contact_email, contact_phone, total, status, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const categoryRows = (categoriesResult.data ?? []) as Array<{ id: string; name: string }>;

  const productRows = (productsResult.data ?? []) as Array<{
    id: string;
    title: string;
    description: string;
    category_id: string;
    price: number;
    quantity: number;
    stock_quantity: number | null;
    low_stock_threshold: number | null;
    track_inventory: boolean | null;
    images: string[];
    condition: 'new' | 'used' | 'refurbished';
    location: string;
    status: 'active' | 'pending' | 'sold';
    created_at: string;
    categories?: { name?: string | null } | null;
  }>;

  const products: SellerDashboardProduct[] = await Promise.all(productRows.map(async (row) => {
    const stockQuantity = resolveStockQuantity(row);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? 'Uncategorized',
      price: toNumber(row.price),
      quantity: stockQuantity,
      stockQuantity,
      lowStockThreshold: resolveLowStockThreshold(row),
      trackInventory: row.track_inventory !== false,
      images: await toSignedImageUrls(supabase, row.images),
      condition: row.condition,
      location: row.location,
      status: row.status,
      createdAt: row.created_at,
    };
  }));

  const lowStockProducts = products.filter((product) => isLowStock({
    stock_quantity: product.stockQuantity,
    low_stock_threshold: product.lowStockThreshold,
    track_inventory: product.trackInventory,
  }));

  const outOfStockProducts = products.filter((product) => isOutOfStock({
    stock_quantity: product.stockQuantity,
    track_inventory: product.trackInventory,
  }));

  const orderRows = (ordersResult.data ?? []) as Array<{
    id: string;
    order_number: string;
    buyer_id: string;
    contact_email: string | null;
    contact_phone: string | null;
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    created_at: string;
  }>;

  const orderIds = orderRows.map((order) => order.id);
  const buyerIds = [...new Set(orderRows.map((order) => order.buyer_id).filter(Boolean))];

  const [orderItemsResult, buyersResult] = await Promise.all([
    orderIds.length
      ? (dataClient.from('order_items') as any)
            .select('id, order_id, product_id, quantity, unit_price, total, products(title, images)')
          .in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    buyerIds.length
      ? (dataClient.from('profiles') as any)
          .select('id, full_name, email')
          .in('id', buyerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const buyerMap = new Map<string, { fullName: string; email: string }>();
  ((buyersResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).forEach((buyer) => {
    buyerMap.set(buyer.id, {
      fullName: buyer.full_name ?? 'Buyer',
      email: buyer.email ?? 'N/A',
    });
  });

  const orderItemsRows = (orderItemsResult.data ?? []) as Array<{
    id: number | string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total: number | null;
    products?: { title?: string | null; images?: string[] | null } | null;
  }>;

  const itemsByOrderId = new Map<string, SellerOrderItem[]>();
  await Promise.all(orderItemsRows.map(async (row) => {
    const current = itemsByOrderId.get(row.order_id) ?? [];

    const primaryOrderImage = Array.isArray(row.products?.images) && row.products?.images.length > 0
      ? await toSignedImageUrl(supabase, row.products.images[0])
      : null;

    current.push({
      id: String(row.id),
      productId: row.product_id,
      productTitle: row.products?.title ?? 'Product',
      productImage: primaryOrderImage,
      quantity: Number(row.quantity ?? 0),
      unitPrice: toNumber(row.unit_price),
    });
    itemsByOrderId.set(row.order_id, current);
  }));

  const orders: SellerOrder[] = orderRows.map((row) => {
    const buyer = buyerMap.get(row.buyer_id);
    return {
      id: row.id,
      orderNumber: row.order_number,
      buyerId: row.buyer_id,
      buyerName: buyer?.fullName ?? 'Buyer',
      buyerEmail: buyer?.email ?? 'N/A',
      contactEmail: row.contact_email ?? '',
      contactPhone: row.contact_phone ?? '',
      total: toNumber(row.total),
      status: row.status,
      createdAt: row.created_at,
      items: itemsByOrderId.get(row.id) ?? [],
    };
  });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(startOfDay);
  sevenDaysAgo.setDate(startOfDay.getDate() - 6);

  const monthAgo = new Date(startOfDay);
  monthAgo.setDate(startOfDay.getDate() - 29);

  const analytics: SellerAnalytics = {
    dailySales: getSalesInRange(orders, startOfDay),
    weeklySales: getSalesInRange(orders, sevenDaysAgo),
    monthlySales: getSalesInRange(orders, monthAgo),
    totalRevenue: orders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0),
    recentSales: buildRecentSalesSeries(orders),
    topProducts: buildTopProducts(orders),
  };

  return {
    initialProducts: products,
    initialOrders: orders,
    categories: categoryRows,
    lowStockProducts,
    outOfStockProducts,
    analytics,
    usingPrivilegedClient,
    profile: {
      displayName: (profileData.full_name as string | null) ?? '',
      avatarUrl: (profileData.avatar_url as string | null) ?? '',
      storeName: (profileData.store_name as string | null) ?? (profileData.full_name as string | null) ?? '',
      storeDescription: (profileData.store_description as string | null) ?? '',
      contactEmail: (profileData.contact_email as string | null) ?? (profileData.email as string | null) ?? '',
      contactPhone: (profileData.contact_phone as string | null) ?? '',
    },
  };
}
