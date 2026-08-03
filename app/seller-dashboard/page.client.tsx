'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast-provider';
import { formatCurrency } from '@/lib/checkout';
import { getFirstImageUrl } from '@/lib/product-images';
import type { SellerSection } from './data';
import {
  createSellerProductAction,
  deleteSellerProductAction,
  updateSellerOrderStatusAction,
  updateSellerProductAction,
  updateSellerProductStatusAction,
  updateSellerProfileAction,
  uploadSellerAvatarAction,
  uploadSellerProductImagesAction,
} from './actions';

type CategoryOption = {
  id: string;
  name: string;
};

type SellerProduct = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  quantity: number;
  images: string[];
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  status: 'active' | 'pending' | 'sold';
  createdAt: string;
};

type SellerOrderItem = {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
};

type SellerOrder = {
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

type AnalyticsPoint = {
  label: string;
  total: number;
};

type TopProductMetric = {
  productId: string;
  title: string;
  quantity: number;
  revenue: number;
};

type SellerAnalytics = {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  totalRevenue: number;
  recentSales: AnalyticsPoint[];
  topProducts: TopProductMetric[];
};

type SellerProfileDraft = {
  displayName: string;
  avatarUrl: string;
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
};

type ProductDraft = {
  id?: string;
  title: string;
  description: string;
  categoryId: string;
  price: string;
  quantity: string;
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  status: 'active' | 'pending' | 'sold';
  imageInput: string;
  images: string[];
  removedImages: string[];
  originalImages: string[];
};

type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'quantity_asc' | 'quantity_desc';

type SellerDashboardClientProps = {
  initialProducts: SellerProduct[];
  initialOrders: SellerOrder[];
  categories: CategoryOption[];
  analytics: SellerAnalytics;
  profile: SellerProfileDraft;
  usingPrivilegedClient: boolean;
  initialSection?: SellerSection;
  navigationMode?: 'tabs' | 'sidebar';
};

const emptyProductDraft = (defaultCategoryId: string): ProductDraft => ({
  title: '',
  description: '',
  categoryId: defaultCategoryId,
  price: '',
  quantity: '1',
  condition: 'new',
  location: '',
  status: 'pending',
  imageInput: '',
  images: [],
  removedImages: [],
  originalImages: [],
});

function statusBadgeClass(status: SellerOrder['status']) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'processing') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
  if (status === 'shipped') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (status === 'delivered') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
}

function listingStatusClass(status: SellerProduct['status']) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'pending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100';
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SellerDashboardClient({
  initialProducts,
  initialOrders,
  categories,
  analytics,
  profile,
  usingPrivilegedClient,
  initialSection = 'overview',
  navigationMode = 'tabs',
}: SellerDashboardClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  const [orders, setOrders] = useState<SellerOrder[]>(initialOrders);
  const [profileDraft, setProfileDraft] = useState<SellerProfileDraft>(profile);
  const [activeSection, setActiveSection] = useState<SellerSection>(initialSection);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft(categories[0]?.id ?? ''));
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | SellerProduct['status']>('all');
  const [productSort, setProductSort] = useState<ProductSort>('newest');
  const [productPage, setProductPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | SellerOrder['status']>('all');
  const [orderPage, setOrderPage] = useState(1);
  const pageSize = 6;
  const orderPageSize = 5;

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setProfileDraft(profile);
  }, [profile]);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const sellerNavItems: Array<{ key: SellerSection; label: string; href: string }> = [
    { key: 'overview', label: 'Dashboard', href: '/seller' },
    { key: 'products', label: 'Products', href: '/seller?tab=products' },
    { key: 'orders', label: 'Orders', href: '/seller?tab=orders' },
    { key: 'analytics', label: 'Analytics', href: '/seller?tab=analytics' },
    { key: 'profile', label: 'Profile', href: '/seller?tab=profile' },
  ];

  const dashboardOverview = useMemo(() => {
    const totalProducts = products.length;
    const activeListings = products.filter((product) => product.status === 'active').length;
    const pendingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'processing').length;
    const completedOrders = orders.filter((order) => order.status === 'delivered').length;

    return {
      totalProducts,
      activeListings,
      pendingOrders,
      completedOrders,
      totalRevenue: analytics.totalRevenue,
    };
  }, [products, orders, analytics.totalRevenue]);

  const filteredProducts = useMemo(() => {
    const search = productFilter.trim().toLowerCase();
    let nextProducts = products.filter((product) => {
      const matchesSearch = !search || (
        product.title.toLowerCase().includes(search) ||
        product.categoryName.toLowerCase().includes(search) ||
        product.location.toLowerCase().includes(search)
      );
      const matchesCategory = productCategoryFilter === 'all' || product.categoryId === productCategoryFilter;
      const matchesStatus = productStatusFilter === 'all' || product.status === productStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    nextProducts = [...nextProducts].sort((left, right) => {
      if (productSort === 'price_asc') return left.price - right.price;
      if (productSort === 'price_desc') return right.price - left.price;
      if (productSort === 'quantity_asc') return left.quantity - right.quantity;
      if (productSort === 'quantity_desc') return right.quantity - left.quantity;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    return nextProducts;
  }, [products, productFilter, productCategoryFilter, productStatusFilter, productSort]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = filteredProducts.slice((currentProductPage - 1) * pageSize, currentProductPage * pageSize);

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      const matchesSearch = !search || [
        order.orderNumber,
        order.buyerName,
        order.buyerEmail,
        order.contactEmail,
        order.contactPhone,
        ...order.items.map((item) => item.productTitle),
      ].some((value) => value.toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize));
  const currentOrderPage = Math.min(orderPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice((currentOrderPage - 1) * orderPageSize, currentOrderPage * orderPageSize);

  useEffect(() => {
    setProductPage(1);
  }, [productFilter, productCategoryFilter, productStatusFilter, productSort]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, orderStatusFilter]);

  const isEditingProduct = Boolean(productDraft.id);

  const startProductEdit = (product: SellerProduct) => {
    setActiveSection('products');
    setProductDraft({
      id: product.id,
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      price: String(product.price),
      quantity: String(product.quantity),
      condition: product.condition,
      location: product.location,
      status: product.status,
      imageInput: '',
      images: product.images,
      removedImages: [],
      originalImages: product.images,
    });
  };

  const clearProductDraft = () => {
    setProductDraft(emptyProductDraft(categories[0]?.id ?? ''));
    setSelectedImageFiles([]);
  };

  const addImageUrl = () => {
    const value = productDraft.imageInput.trim();
    if (!value) return;

    try {
      const parsed = new URL(value);
      setProductDraft((current) => ({
        ...current,
        imageInput: '',
        images: [...current.images, parsed.toString()],
      }));
    } catch {
      pushToast('Enter a valid image URL before adding.', 'error');
    }
  };

  const removeImageAt = (index: number) => {
    setProductDraft((current) => ({
      ...current,
      images: current.images.filter((_, itemIndex) => itemIndex !== index),
      removedImages: current.id
        ? [...new Set([
            ...current.removedImages,
            ...(current.images[index] && current.originalImages.includes(current.images[index]) ? [current.images[index]] : []),
          ])]
        : current.removedImages,
    }));
  };

  const handleImageUpload = async () => {
    if (selectedImageFiles.length === 0) {
      pushToast('Select one or more files to upload.', 'error');
      return;
    }

    const formData = new FormData();
    selectedImageFiles.forEach((file) => formData.append('files', file));

    setUploadingImages(true);
    const result = await uploadSellerProductImagesAction(formData);
    setUploadingImages(false);

    const uploadedUrls = result.data?.urls;
    if (!result.ok || !uploadedUrls) {
      pushToast(result.error ?? 'Unable to upload images.', 'error');
      return;
    }

    setProductDraft((current) => ({
      ...current,
      images: [...current.images, ...uploadedUrls],
    }));
    setSelectedImageFiles([]);
    pushToast('Product images uploaded.', 'success');
  };

  const handleSaveProduct = async () => {
    const parsedPrice = Number(productDraft.price);
    const parsedQuantity = Number(productDraft.quantity);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      pushToast('Enter a valid product price.', 'error');
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      pushToast('Enter a valid stock quantity.', 'error');
      return;
    }

    setSavingProduct(true);

    const payload = {
      id: productDraft.id,
      title: productDraft.title,
      description: productDraft.description,
      categoryId: productDraft.categoryId,
      price: parsedPrice,
      quantity: parsedQuantity,
      condition: productDraft.condition,
      location: productDraft.location,
      status: productDraft.status,
      images: productDraft.images,
      removedImages: productDraft.removedImages,
    };

    const result = isEditingProduct
      ? await updateSellerProductAction(payload)
      : await createSellerProductAction(payload);

    setSavingProduct(false);

    if (!result.ok) {
      pushToast(result.error ?? 'Unable to save product.', 'error');
      return;
    }

    pushToast(isEditingProduct ? 'Product updated.' : 'Product created.', 'success');
    clearProductDraft();
    router.refresh();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Delete this product listing permanently?')) {
      return;
    }

    setProcessingProductId(productId);
    const result = await deleteSellerProductAction(productId);
    setProcessingProductId(null);

    if (!result.ok) {
      pushToast(result.error ?? 'Unable to delete product.', 'error');
      return;
    }

    pushToast('Product deleted.', 'success');
    if (productDraft.id === productId) {
      clearProductDraft();
    }
    router.refresh();
  };

  const handleSetListingStatus = async (productId: string, status: SellerProduct['status']) => {
    setProcessingProductId(productId);
    const result = await updateSellerProductStatusAction(productId, status);
    setProcessingProductId(null);

    if (!result.ok) {
      pushToast(result.error ?? 'Unable to update listing status.', 'error');
      return;
    }

    pushToast(status === 'active' ? 'Listing published.' : status === 'pending' ? 'Listing unpublished.' : 'Listing updated.', 'success');
    router.refresh();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: SellerOrder['status']) => {
    setProcessingOrderId(orderId);
    const result = await updateSellerOrderStatusAction({ orderId, status });
    setProcessingOrderId(null);

    if (!result.ok) {
      pushToast(result.error ?? 'Unable to update order status.', 'error');
      return;
    }

    pushToast('Order status updated.', 'success');
    router.refresh();
  };

  const uploadProfileImage = async () => {
    if (!profileImageFile) {
      pushToast('Select a profile image first.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', profileImageFile);

    setUploadingProfileImage(true);
    const result = await uploadSellerAvatarAction(formData);
    setUploadingProfileImage(false);

    const avatarUrl = result.data?.url;
    if (!result.ok || !avatarUrl) {
      pushToast(result.error ?? 'Unable to upload profile image.', 'error');
      return;
    }

    setProfileDraft((current) => ({ ...current, avatarUrl }));
    setProfileImageFile(null);
    pushToast('Profile image uploaded.', 'success');
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const result = await updateSellerProfileAction(profileDraft);
    setSavingProfile(false);

    if (!result.ok) {
      pushToast(result.error ?? 'Unable to save seller profile.', 'error');
      return;
    }

    if (result.data?.warning) {
      pushToast(result.data.warning, 'error');
    } else {
      pushToast('Seller profile updated.', 'success');
    }

    router.refresh();
  };

  const content = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Seller dashboard</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Manage products, monitor orders, and track store performance.</p>
        </div>
        {navigationMode === 'tabs' ? (
          <div className="flex flex-wrap gap-2">
            {(['overview', 'products', 'orders', 'profile', 'analytics'] as const).map((section) => (
              <Button
                key={section}
                variant={activeSection === section ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveSection(section)}
              >
                {titleCase(section)}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {!usingPrivilegedClient ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
          SUPABASE_SERVICE_ROLE_KEY is not configured, so some seller order and deletion actions may be limited by RLS.
        </div>
      ) : null}

      {activeSection === 'overview' ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total products</p>
              <p className="mt-2 text-3xl font-semibold">{dashboardOverview.totalProducts}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Active listings</p>
              <p className="mt-2 text-3xl font-semibold">{dashboardOverview.activeListings}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending orders</p>
              <p className="mt-2 text-3xl font-semibold">{dashboardOverview.pendingOrders}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Completed orders</p>
              <p className="mt-2 text-3xl font-semibold">{dashboardOverview.completedOrders}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total revenue</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(dashboardOverview.totalRevenue)}</p>
            </article>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Recent sales</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Last 7 days revenue trend.</p>
            <div className="mt-6 grid grid-cols-7 gap-2">
              {analytics.recentSales.map((point) => {
                const maxValue = Math.max(...analytics.recentSales.map((item) => item.total), 1);
                const heightPercent = Math.max(8, Math.round((point.total / maxValue) * 100));
                return (
                  <div key={point.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end rounded-xl bg-slate-100 px-1 dark:bg-slate-800">
                      <div className="w-full rounded-lg bg-brand-600" style={{ height: `${heightPercent}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{point.label}</p>
                    <p className="text-xs font-semibold">{formatCurrency(point.total)}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      ) : null}

      {activeSection === 'products' ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                  placeholder="Search your listings"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                />
                <select
                  value={productCategoryFilter}
                  onChange={(event) => setProductCategoryFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <select
                  value={productStatusFilter}
                  onChange={(event) => setProductStatusFilter(event.target.value as 'all' | SellerProduct['status'])}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Published</option>
                  <option value="pending">Unpublished</option>
                  <option value="sold">Sold</option>
                </select>
                <select
                  value={productSort}
                  onChange={(event) => setProductSort(event.target.value as ProductSort)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="newest">Newest first</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="quantity_desc">Stock: high to low</option>
                  <option value="quantity_asc">Stock: low to high</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <p>{filteredProducts.length} matching products</p>
              <p>Page {currentProductPage} of {totalProductPages}</p>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                No listings found.
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <article key={product.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {(() => {
                    const primaryImage = getFirstImageUrl(product.images);

                    return (
                  <div className="mb-4 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {primaryImage ? (
                      <img src={primaryImage} alt={product.title} className="h-48 w-full object-cover" />
                    ) : (
                      <div className="flex h-48 items-center justify-center text-4xl text-slate-500">📦</div>
                    )}
                  </div>
                    );
                  })()}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{product.title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{product.categoryName} - {formatCurrency(product.price)}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Stock: {product.quantity} | {titleCase(product.condition)} | {product.location}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${listingStatusClass(product.status)}`}>
                        {titleCase(product.status)}
                      </span>
                      {product.quantity === 0 ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          Out of stock
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startProductEdit(product)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetListingStatus(product.id, product.status === 'active' ? 'pending' : 'active')}
                      disabled={processingProductId === product.id}
                    >
                      {product.status === 'active' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={processingProductId === product.id}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              ))
            )}
            {filteredProducts.length > pageSize ? (
              <div className="flex items-center justify-between gap-3">
                <Button variant="secondary" size="sm" onClick={() => setProductPage((current) => Math.max(1, current - 1))} disabled={currentProductPage <= 1}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setProductPage((current) => Math.min(totalProductPages, current + 1))} disabled={currentProductPage >= totalProductPages}>
                  Next
                </Button>
              </div>
            ) : null}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">{isEditingProduct ? 'Edit product' : 'Add product'}</h2>
            <div className="mt-4 grid gap-3">
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.title} onChange={(event) => setProductDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Product title" />
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.description} onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
              <select className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.categoryId} onChange={(event) => setProductDraft((current) => ({ ...current, categoryId: event.target.value }))}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.price} onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))} placeholder="Price" type="number" min="0" step="0.01" />
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.quantity} onChange={(event) => setProductDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder="Stock quantity" type="number" min="0" step="1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.condition} onChange={(event) => setProductDraft((current) => ({ ...current, condition: event.target.value as ProductDraft['condition'] }))}>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
                <select className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.status} onChange={(event) => setProductDraft((current) => ({ ...current, status: event.target.value as ProductDraft['status'] }))}>
                  <option value="pending">Unpublished (pending)</option>
                  <option value="active">Published (active)</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={productDraft.location} onChange={(event) => setProductDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm font-semibold">Images</p>
                <div className="mt-3 flex gap-2">
                  <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" value={productDraft.imageInput} onChange={(event) => setProductDraft((current) => ({ ...current, imageInput: event.target.value }))} placeholder="Paste image URL" />
                  <Button size="sm" variant="secondary" onClick={addImageUrl}>Add URL</Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) => setSelectedImageFiles(Array.from(event.target.files ?? []))}
                    className="text-sm"
                  />
                  <Button size="sm" variant="secondary" onClick={handleImageUpload} disabled={uploadingImages}>
                    {uploadingImages ? 'Uploading...' : 'Upload files'}
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {productDraft.images.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800">
                      <span className="line-clamp-1">{imageUrl}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeImageAt(index)}>Remove</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={handleSaveProduct} disabled={savingProduct}>{savingProduct ? 'Saving...' : isEditingProduct ? 'Update product' : 'Add product'}</Button>
                {isEditingProduct ? <Button variant="secondary" onClick={clearProductDraft}>Cancel</Button> : null}
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {activeSection === 'orders' ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <input
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Search order number, buyer, contact, or product"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              />
              <select
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value as SellerOrder['status'] | 'all')}
                className="rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button size="sm" variant="secondary" onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); }}>
                Clear filters
              </Button>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No seller orders yet.
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No orders match your search.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                <p>Showing {paginatedOrders.length} of {filteredOrders.length} orders</p>
                <p>Page {currentOrderPage} of {totalOrderPages}</p>
              </div>

              {paginatedOrders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
                    {titleCase(order.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Buyer</p>
                    <p className="mt-1 text-sm font-semibold">{order.buyerName}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{order.buyerEmail}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Contact</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{order.contactEmail || 'N/A'}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{order.contactPhone || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Order Total</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(order.total)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                      <span>{item.productTitle}</span>
                      <span className="text-slate-600 dark:text-slate-300">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} disabled={processingOrderId === order.id}>Mark shipped</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} disabled={processingOrderId === order.id}>Mark delivered</Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/seller-dashboard/orders/${order.orderNumber}`}>View details</Link>
                  </Button>
                  <select
                    value={order.status}
                    onChange={(event) => handleUpdateOrderStatus(order.id, event.target.value as SellerOrder['status'])}
                    className="rounded-full border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    disabled={processingOrderId === order.id}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </article>
              ))}

              {totalOrderPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button size="sm" variant="secondary" onClick={() => setOrderPage((current) => Math.max(1, current - 1))} disabled={currentOrderPage <= 1}>
                    Previous
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: totalOrderPages }, (_, index) => index + 1).map((pageNumber) => (
                      <Button key={pageNumber} size="sm" variant={pageNumber === currentOrderPage ? 'primary' : 'secondary'} onClick={() => setOrderPage(pageNumber)}>
                        {pageNumber}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setOrderPage((current) => Math.min(totalOrderPages, current + 1))} disabled={currentOrderPage >= totalOrderPages}>
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {activeSection === 'profile' ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Profile picture</h2>
            <div className="mt-4 flex items-center gap-4">
              {profileDraft.avatarUrl ? (
                <img src={profileDraft.avatarUrl} alt="Seller avatar" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-semibold text-white">
                  {profileDraft.storeName.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              <div className="space-y-2">
                <input type="file" accept="image/*" onChange={(event) => setProfileImageFile(event.target.files?.[0] ?? null)} className="text-sm" />
                <Button size="sm" variant="secondary" onClick={uploadProfileImage} disabled={uploadingProfileImage}>
                  {uploadingProfileImage ? 'Uploading...' : 'Upload profile picture'}
                </Button>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Seller profile</h2>
            <div className="mt-4 grid gap-3">
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={profileDraft.displayName} onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" />
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={profileDraft.storeName} onChange={(event) => setProfileDraft((current) => ({ ...current, storeName: event.target.value }))} placeholder="Store name" />
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={profileDraft.storeDescription} onChange={(event) => setProfileDraft((current) => ({ ...current, storeDescription: event.target.value }))} placeholder="Store description" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={profileDraft.contactEmail} onChange={(event) => setProfileDraft((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Contact email" type="email" />
                <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={profileDraft.contactPhone} onChange={(event) => setProfileDraft((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="Contact phone" />
              </div>
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={profileDraft.avatarUrl} onChange={(event) => setProfileDraft((current) => ({ ...current, avatarUrl: event.target.value }))} placeholder="Avatar URL" />
              <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</Button>
            </div>
          </article>
        </section>
      ) : null}

      {activeSection === 'analytics' ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Sales summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <span>Daily sales</span>
                <span className="font-semibold">{formatCurrency(analytics.dailySales)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <span>Weekly sales</span>
                <span className="font-semibold">{formatCurrency(analytics.weeklySales)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <span>Monthly sales</span>
                <span className="font-semibold">{formatCurrency(analytics.monthlySales)}</span>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Top selling products</h2>
            <div className="mt-4 space-y-3">
              {analytics.topProducts.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No product sales yet.</p>
              ) : (
                analytics.topProducts.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{item.quantity} units sold</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.revenue)}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}
    </>
  );

  if (navigationMode === 'sidebar') {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Seller menu</p>
              <nav className="mt-4 hidden gap-2 lg:flex lg:flex-col">
                {sellerNavItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${activeSection === item.key ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {sellerNavItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${activeSection === item.key ? 'bg-brand-600 text-white' : 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <Link href="/" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                  Back to Marketplace
                </Link>
              </div>
            </div>
          </aside>
          <section>{content}</section>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {content}
    </main>
  );
}
