import type { Database } from '@/types/supabase';
import type { Category, ProductWithCategory, Review } from '@/types/marketplace';
import { toSignedImageUrls } from '@/lib/product-images';
import { createClient } from './server';

export type ProductFilters = {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  ratingMin?: number;
  available?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_rated' | 'popular';
};

type HomepageCollections = {
  featuredProducts: ProductWithCategory[];
  newArrivals: ProductWithCategory[];
  trendingProducts: ProductWithCategory[];
  recommendedProducts: ProductWithCategory[];
};

const HOMEPAGE_QUERY_TIMEOUT_MS = 5000;

async function withTimeoutFallback<T>(promiseFactory: () => Promise<T>, fallback: T, timeoutMs = HOMEPAGE_QUERY_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  const guardedPromise = Promise.resolve()
    .then(promiseFactory)
    .catch(() => fallback);

  try {
    return await Promise.race([guardedPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function mapProduct(item: any, sellerNames?: Map<string, string | null>): ProductWithCategory {
  return {
    id: item.id,
    seller_id: item.seller_id,
    category_id: item.category_id,
    title: item.title,
    description: item.description,
    price: Number(item.price),
    quantity: item.quantity,
    images: item.images,
    condition: item.condition,
    location: item.location,
    status: item.status,
    created_at: item.created_at,
    category: item.categories?.name ?? 'Unknown',
    seller_name: sellerNames?.get(item.seller_id) ?? null,
  };
}

async function getSellerNames(sellerIds: string[]): Promise<Map<string, string | null>> {
  if (sellerIds.length === 0) {
    return new Map();
  }

  return withTimeoutFallback(async () => {
    const supabase = await createClient();
    const { data, error } = (await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', sellerIds)) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null; error: any };

    if (error) {
      return new Map();
    }

    return new Map(
      (data ?? []).map((profile) => [
        profile.id,
        profile.full_name ?? profile.email ?? 'Marketplace seller',
      ])
    );
  }, new Map());
}

async function enrichProducts(items: any[]): Promise<ProductWithCategory[]> {
  const sellerIds = [...new Set((items ?? []).map((item) => item.seller_id).filter(Boolean))];
  const [sellerNames, supabase] = await Promise.all([getSellerNames(sellerIds), createClient()]);

  return Promise.all((items ?? []).map(async (item) => {
    const mapped = mapProduct(item, sellerNames);
    const signedImages = await toSignedImageUrls(supabase, mapped.images);

    return {
      ...mapped,
      images: signedImages,
    };
  }));
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = (await supabase.from('categories').select('id, name, image, created_at').order('name')) as { data: any[] | null; error: any };

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getCategoriesWithCounts(): Promise<Category[]> {
  return withTimeoutFallback(async () => {
    const supabase = await createClient();
    const { data, error } = (await supabase
      .from('categories')
      .select('id, name, image, created_at, products(count)')
      .order('name')) as { data: any[] | null; error: any };

    if (error) {
      return [];
    }

    return (data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      image: category.image,
      created_at: category.created_at,
      product_count: Array.isArray(category.products) ? Number(category.products[0]?.count ?? 0) : 0,
    }));
  }, []);
}

export async function getProducts(filters: ProductFilters = {}): Promise<ProductWithCategory[]> {
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, seller_id, category_id, title, description, price, quantity, images, condition, location, status, created_at, categories(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.query) {
    const search = `%${filters.query.trim()}%`;
    query = query.or(`title.ilike.${search},description.ilike.${search}`);
  }

  if (typeof filters.categoryId === 'string' && filters.categoryId.length > 0) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (typeof filters.minPrice === 'number' && !Number.isNaN(filters.minPrice)) {
    query = query.gte('price', filters.minPrice);
  }

  if (typeof filters.maxPrice === 'number' && !Number.isNaN(filters.maxPrice)) {
    query = query.lte('price', filters.maxPrice);
  }

  const { data, error } = (await query) as { data: any[] | null; error: any };

  if (error) {
    throw new Error(error.message);
  }

  return enrichProducts(data ?? []);
}

export async function getProductsPaged(
  filters: ProductFilters = {},
  page = 1,
  perPage = 12
): Promise<{ data: ProductWithCategory[]; total: number }> {
  const supabase = await createClient();
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const selectFields = 'id, seller_id, category_id, title, description, price, quantity, images, condition, location, status, created_at, categories(name)';
  let query: any = supabase
    .from('products')
    .select(selectFields, { count: 'exact' });

  // ensure we only return active products
  query = query.eq('status', 'active');

  // sorting
  if (filters.sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (filters.sort === 'price_desc') query = query.order('price', { ascending: false });
  else if (filters.sort === 'popular') query = query.order('quantity', { ascending: false }).order('created_at', { ascending: false });
  else if (filters.sort === 'best_rated') query = query.order('created_at', { ascending: false });
  else if (filters.sort === 'newest') query = query.order('created_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  if (filters.query) {
    const search = `%${filters.query.trim()}%`;
    query = query.or(`title.ilike.${search},description.ilike.${search}`);
  }

  if (typeof filters.categoryId === 'string' && filters.categoryId.length > 0) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (typeof filters.minPrice === 'number' && !Number.isNaN(filters.minPrice)) {
    query = query.gte('price', filters.minPrice);
  }

  if (typeof filters.maxPrice === 'number' && !Number.isNaN(filters.maxPrice)) {
    query = query.lte('price', filters.maxPrice);
  }

  if (filters.brand) {
    // assume brand column exists; if not, ignore by catching later
    try {
      query = (query as any).eq('brand', filters.brand);
    } catch (e) {
      // ignore
    }
  }

  if (filters.available) {
    query = query.gte('quantity', 1);
  }

  const { data, error, count } = (await query.range(start, end)) as any;

  if (error) {
    throw new Error(error.message);
  }

  const mapped = await enrichProducts(data ?? []);

  return { data: mapped, total: typeof count === 'number' ? count : mapped.length };
}

export async function getHomepageCollections(): Promise<HomepageCollections> {
  const [featuredProducts, newArrivals, trendingProducts, recommendedProducts] = await Promise.all([
    withTimeoutFallback(() => getProductsPaged({ sort: 'popular', available: true }, 1, 4), { data: [], total: 0 }),
    withTimeoutFallback(() => getProductsPaged({ sort: 'newest' }, 1, 4), { data: [], total: 0 }),
    withTimeoutFallback(() => getProductsPaged({ sort: 'price_desc', available: true }, 1, 4), { data: [], total: 0 }),
    withTimeoutFallback(() => getProductsPaged({ sort: 'price_asc', available: true }, 1, 4), { data: [], total: 0 }),
  ]);

  return {
    featuredProducts: featuredProducts.data,
    newArrivals: newArrivals.data,
    trendingProducts: trendingProducts.data,
    recommendedProducts: recommendedProducts.data,
  };
}

export async function getProductById(id: string): Promise<ProductWithCategory | null> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    return null;
  }

  const supabase = await createClient();
  const selectStatements = [
    `
      *,
      categories(*),
      profiles(*),
      product_images(*),
      reviews(*)
    `,
    `
      *,
      categories(*),
      product_images(*),
      reviews(*)
    `,
    `
      *,
      categories(*),
      reviews(*)
    `,
    `
      *,
      categories(*)
    `,
  ];

  let data: any | null = null;
  let lastError: any = null;

  for (const statement of selectStatements) {
    const result = (await supabase
      .from('products')
      .select(statement)
      .eq('id', id)
      .single()) as { data: any | null; error: any };

    if (!result.error) {
      data = result.data;
      lastError = null;
      break;
    }

    const errorMessage = `${result.error.message ?? ''}`.toLowerCase();
    if (result.error.code === 'PGRST116' || errorMessage.includes('no rows')) {
      return null;
    }

    lastError = result.error;
    const isRelationshipError = errorMessage.includes('could not find a relationship between');
    if (!isRelationshipError) {
      break;
    }
  }

  if (lastError) {
    throw new Error(lastError.message);
  }

  if (!data) {
    return null;
  }

  const sellerRecord = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const nestedReviews = Array.isArray(data.reviews) ? data.reviews : [];
  const nestedImages = Array.isArray(data.product_images) ? data.product_images : [];

  let reviews: Review[] = nestedReviews.map((review: any) => ({
    id: review.id,
    user_id: review.user_id,
    product_id: review.product_id ?? id,
    rating: Number(review.rating),
    comment: review.comment ?? null,
    created_at: review.created_at,
    author_name: 'Customer',
  }));

  if (reviews.length > 0) {
    const reviewerIds = [...new Set(reviews.map((review) => review.user_id))];
    const { data: reviewerProfiles } = (await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', reviewerIds)) as { data: Array<{ id: string; full_name: string | null; email: string | null }> | null; error: any };
    const reviewerNames = new Map((reviewerProfiles ?? []).map((profile) => [profile.id, profile.full_name ?? profile.email ?? 'Customer']));
    reviews = reviews.map((review) => ({
      ...review,
      author_name: reviewerNames.get(review.user_id) ?? 'Customer',
    }));
  }

  // related products (same category)
  let related: ProductWithCategory[] = [];
  try {
    const rel = await supabase
      .from('products')
      .select('id, seller_id, category_id, title, description, price, quantity, images, condition, location, status, created_at, categories(name)')
      .eq('category_id', data.category_id)
      .neq('id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6);
    if (!rel.error && rel.data) related = await enrichProducts(rel.data);
  } catch (e) {
    // ignore
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length : null;
  const sellerNames = await getSellerNames([data.seller_id]);

  const galleryImages = nestedImages
    .map((image: any) => image.image_url ?? image.url ?? image.src)
    .filter(Boolean);
  const productImages = galleryImages.length > 0 ? galleryImages : data.images;
  const signedImages = await toSignedImageUrls(supabase, productImages);

  return {
    ...mapProduct({
      ...data,
      images: signedImages,
      categories: Array.isArray(data.categories) ? data.categories[0] : data.categories,
    }, sellerNames),
    seller_name: sellerRecord?.full_name ?? sellerRecord?.email ?? sellerNames.get(data.seller_id) ?? null,
    rating: avgRating,
    specs: null,
    // @ts-ignore
    _related: related,
    // @ts-ignore
    _reviews: reviews,
  };
}
