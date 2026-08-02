'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ActionResult<T = undefined> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type SellerContext = {
  userId: string;
  role: string | null;
};

type DbClient = Awaited<ReturnType<typeof createClient>>;

const uuidLikeSchema = z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Select a valid category');

const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, 'Product title is required').max(140, 'Product title is too long'),
  description: z.string().trim().min(10, 'Description is too short').max(3000, 'Description is too long'),
  categoryId: uuidLikeSchema,
  price: z.number().positive('Price must be greater than zero'),
  quantity: z.number().int('Quantity must be a whole number').min(0, 'Quantity cannot be negative'),
  condition: z.enum(['new', 'used', 'refurbished']),
  location: z.string().trim().min(2, 'Location is required').max(120, 'Location is too long'),
  images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1, 'Add at least one product image').max(8, 'Maximum 8 images'),
  removedImages: z.array(z.string().trim().url('Each removed image must be a valid URL')).default([]),
  status: z.enum(['active', 'pending', 'sold']).default('pending'),
});

const productIdSchema = z.string().trim().uuid('Invalid product id');

const orderStatusSchema = z.object({
  orderId: z.string().trim().uuid('Invalid order id'),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

const sellerProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required').max(120, 'Display name is too long'),
  storeName: z.string().trim().min(2, 'Store name is required').max(120, 'Store name is too long'),
  storeDescription: z.string().trim().max(500, 'Store description is too long').optional(),
  contactEmail: z.string().trim().email('Enter a valid contact email').optional(),
  contactPhone: z.string().trim().max(40, 'Contact phone is too long').optional(),
  avatarUrl: z.string().trim().url('Avatar URL must be valid').optional().or(z.literal('')),
});

const MAX_UPLOAD_FILES = 8;
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGE_BUCKET ?? 'product-images';
const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? 'avatars';

async function getSellerContext(): Promise<SellerContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profileResult = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profileResult?.data?.role ?? null;

  return {
    userId: user.id,
    role,
  };
}

function canManageSellerDashboard(role: string | null) {
  if (!role) return true;
  return role === 'seller' || role === 'admin';
}

async function getScopedDbClient(): Promise<{ client: any; usingAdmin: boolean }> {
  try {
    return { client: createAdminClient(), usingAdmin: true };
  } catch {
    return { client: await createClient(), usingAdmin: false };
  }
}

async function ensureBucket(client: any, bucketName: string) {
  const { data: bucket } = await client.storage.getBucket(bucketName);
  if (bucket) {
    return;
  }

  const { error } = await client.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: `${MAX_UPLOAD_SIZE_BYTES}`,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  });

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeImageUrls(urls: string[]) {
  return urls
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

function extractStoragePathFromPublicUrl(url: string, bucketName: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const bucketIndex = segments.findIndex((segment, index) => segment === bucketName && segments[index - 1] === 'public');

    if (bucketIndex === -1) {
      return null;
    }

    const objectPath = segments.slice(bucketIndex + 1).join('/');
    return objectPath.length > 0 ? objectPath : null;
  } catch {
    return null;
  }
}

async function deleteStorageObjects(client: any, bucketName: string, urls: string[]) {
  const objectPaths = urls
    .map((url) => extractStoragePathFromPublicUrl(url, bucketName))
    .filter((path): path is string => Boolean(path));

  if (objectPaths.length === 0) {
    return;
  }

  const { error } = await client.storage.from(bucketName).remove(objectPaths);
  if (error) {
    throw new Error(error.message);
  }
}

function revalidateSellerPaths() {
  revalidatePath('/seller-dashboard');
  revalidatePath('/products');
  revalidatePath('/');
}

export async function createSellerProductAction(payload: z.infer<typeof productSchema>): Promise<ActionResult<{ id: string }>> {
  console.log('[seller-product:create] submitted categoryId:', payload?.categoryId);
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid product details.',
    };
  }

  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to add a product.' };
  if (!canManageSellerDashboard(seller.role)) return { ok: false, error: 'Seller access is required.' };

  const { client } = await getScopedDbClient();
  const imageUrls = normalizeImageUrls(parsed.data.images);

  const { data, error } = await (client.from('products') as any)
    .insert({
      seller_id: seller.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      category_id: parsed.data.categoryId,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
      location: parsed.data.location,
      images: imageUrls,
      status: parsed.data.status,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSellerPaths();
  return { ok: true, data: { id: String(data.id) } };
}

export async function updateSellerProductAction(payload: z.infer<typeof productSchema>): Promise<ActionResult> {
  console.log('[seller-product:update] submitted categoryId:', payload?.categoryId);
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.id) {
    return { ok: false, error: 'Invalid product update payload.' };
  }

  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to edit products.' };
  if (!canManageSellerDashboard(seller.role)) return { ok: false, error: 'Seller access is required.' };

  const { client } = await getScopedDbClient();
  const nextImages = normalizeImageUrls(parsed.data.images);
  const removedImages = normalizeImageUrls(parsed.data.removedImages ?? []).filter((url) => !nextImages.includes(url));

  const { error } = await (client.from('products') as any)
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      category_id: parsed.data.categoryId,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
      location: parsed.data.location,
      images: nextImages,
      status: parsed.data.status,
    })
    .eq('id', parsed.data.id)
    .eq('seller_id', seller.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (removedImages.length > 0) {
    try {
      await deleteStorageObjects(client, PRODUCT_IMAGE_BUCKET, removedImages);
    } catch {
      // Keep the product update successful even if storage cleanup is unavailable.
    }
  }

  revalidateSellerPaths();
  return { ok: true };
}

export async function deleteSellerProductAction(productId: string): Promise<ActionResult> {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid product id.' };
  }

  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to delete products.' };
  if (!canManageSellerDashboard(seller.role)) return { ok: false, error: 'Seller access is required.' };

  const { client } = await getScopedDbClient();
  const { data: product } = await (client.from('products') as any)
    .select('images')
    .eq('id', parsed.data)
    .eq('seller_id', seller.userId)
    .maybeSingle();

  const productImages = Array.isArray(product?.images) ? normalizeImageUrls(product.images) : [];

  const { error } = await client
    .from('products')
    .delete()
    .eq('id', parsed.data)
    .eq('seller_id', seller.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (productImages.length > 0) {
    try {
      await deleteStorageObjects(client, PRODUCT_IMAGE_BUCKET, productImages);
    } catch {
      // Ignore storage cleanup failures to avoid losing the product delete.
    }
  }

  revalidateSellerPaths();
  return { ok: true };
}

export async function updateSellerProductStatusAction(productId: string, status: 'active' | 'pending' | 'sold'): Promise<ActionResult> {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid product id.' };
  }

  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to update listings.' };
  if (!canManageSellerDashboard(seller.role)) return { ok: false, error: 'Seller access is required.' };

  const { client } = await getScopedDbClient();
  const { error } = await (client.from('products') as any)
    .update({ status })
    .eq('id', parsed.data)
    .eq('seller_id', seller.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSellerPaths();
  return { ok: true };
}

export async function updateSellerOrderStatusAction(payload: z.infer<typeof orderStatusSchema>): Promise<ActionResult> {
  const parsed = orderStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid order status update.' };
  }

  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to update orders.' };
  if (!canManageSellerDashboard(seller.role)) return { ok: false, error: 'Seller access is required.' };

  const { client } = await getScopedDbClient();
  const { error } = await (client.from('orders') as any)
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.orderId)
    .eq('seller_id', seller.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/seller-dashboard');
  revalidatePath('/orders');
  return { ok: true };
}

export async function updateSellerProfileAction(payload: z.infer<typeof sellerProfileSchema>): Promise<ActionResult<{ warning?: string }>> {
  const parsed = sellerProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid profile details.' };
  }

  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to update your profile.' };

  const { client } = await getScopedDbClient();

  const fullPayload = {
    full_name: parsed.data.displayName,
    avatar_url: parsed.data.avatarUrl || null,
    email: parsed.data.contactEmail || null,
    store_name: parsed.data.storeName,
    store_description: parsed.data.storeDescription || null,
    contact_phone: parsed.data.contactPhone || null,
    contact_email: parsed.data.contactEmail || null,
    updated_at: new Date().toISOString(),
  };

  const updateResult = await (client.from('profiles') as any)
    .update(fullPayload)
    .eq('id', seller.userId);

  if (!updateResult.error) {
    revalidatePath('/seller-dashboard');
    revalidatePath('/profile');
    return { ok: true };
  }

  const fallbackResult = await (client.from('profiles') as any)
    .update({
      full_name: parsed.data.displayName,
      avatar_url: parsed.data.avatarUrl || null,
      email: parsed.data.contactEmail || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seller.userId);

  if (fallbackResult.error) {
    return { ok: false, error: fallbackResult.error.message };
  }

  revalidatePath('/seller-dashboard');
  revalidatePath('/profile');
  return {
    ok: true,
    data: {
      warning: 'Store description/contact fields were saved partially because those profile columns are not available yet.',
    },
  };
}

export async function uploadSellerProductImagesAction(formData: FormData): Promise<ActionResult<{ urls: string[] }>> {
  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to upload images.' };
  if (!canManageSellerDashboard(seller.role)) return { ok: false, error: 'Seller access is required.' };

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { ok: false, error: 'Select one or more image files.' };
  }

  if (files.length > MAX_UPLOAD_FILES) {
    return { ok: false, error: `You can upload up to ${MAX_UPLOAD_FILES} images at once.` };
  }

  const oversizedFile = files.find((file) => file.size > MAX_UPLOAD_SIZE_BYTES);
  if (oversizedFile) {
    return { ok: false, error: `${oversizedFile.name} exceeds the 5MB upload limit.` };
  }

  const { client, usingAdmin } = await getScopedDbClient();

  if (usingAdmin) {
    await ensureBucket(client, PRODUCT_IMAGE_BUCKET);
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const path = `${seller.userId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) {
      uploadedUrls.push(data.publicUrl);
    }
  }

  return { ok: true, data: { urls: uploadedUrls } };
}

export async function uploadSellerAvatarAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const seller = await getSellerContext();
  if (!seller) return { ok: false, error: 'Please sign in to upload an avatar.' };

  const candidate = formData.get('file');
  if (!(candidate instanceof File) || candidate.size === 0) {
    return { ok: false, error: 'Select an avatar image first.' };
  }

  if (candidate.size > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false, error: 'Avatar exceeds the 5MB upload limit.' };
  }

  const { client, usingAdmin } = await getScopedDbClient();

  if (usingAdmin) {
    await ensureBucket(client, AVATAR_BUCKET);
  }

  const safeName = candidate.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const path = `${seller.userId}/avatars/${Date.now()}-${safeName}`;

  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, candidate, { upsert: true, contentType: candidate.type || undefined });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, error: 'Unable to resolve avatar URL.' };
  }

  return { ok: true, data: { url: data.publicUrl } };
}
