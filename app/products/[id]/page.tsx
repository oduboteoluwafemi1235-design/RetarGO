import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/supabase/marketplace';
import { Button } from '@/components/button';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { BuyNowButton } from '@/components/buy-now-button';
import { getFirstImageUrl, normalizeImageList } from '@/lib/product-images';
import { getStockStatusLabel, isInventoryTracked, resolveLowStockThreshold, resolveStockQuantity } from '@/lib/inventory';

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const related = (product as any)._related ?? [];
  const reviews = (product as any)._reviews ?? [];
  const productImages = normalizeImageList(product.images);
  const primaryImage = getFirstImageUrl(productImages);
  const stockQuantity = resolveStockQuantity(product);
  const lowStockThreshold = resolveLowStockThreshold(product);
  const tracked = isInventoryTracked(product);
  const stockStatus = getStockStatusLabel(product);
  const outOfStock = stockStatus === 'out';
  const lowStock = stockStatus === 'low';

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_120px]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              {primaryImage ? (
                <div className="space-y-4">
                  <img src={primaryImage} alt={product.title} className="w-full rounded-3xl object-cover" />
                  <div className="flex gap-2 overflow-x-auto">
                    {productImages.map((img, i) => (
                      <img key={i} src={img} alt={`${product.title} ${i}`} className="h-20 w-20 flex-none rounded-xl object-cover" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-3xl bg-slate-200 text-5xl text-slate-500 dark:bg-slate-800 dark:text-slate-400">📦</div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Price</p>
              <p className="mt-2 text-4xl font-semibold text-slate-900 dark:text-white">₦{product.price.toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-500">{product.seller_name ?? 'Marketplace seller'}</p>
              <div className="mt-3 space-y-2">
                {tracked ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">Stock: {stockQuantity}</p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">Inventory tracking disabled</p>
                )}
                {outOfStock ? (
                  <p className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                    Out of Stock
                  </p>
                ) : null}
                {lowStock ? (
                  <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Only {stockQuantity} left in stock.
                  </p>
                ) : null}
                {!outOfStock && !lowStock ? (
                  <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    In Stock
                  </p>
                ) : null}
                {tracked ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Low-stock alert threshold: {lowStockThreshold}</p>
                ) : null}
              </div>
              <div className="mt-6 grid gap-3">
                <AddToCartButton productId={String(product.id)} outOfStock={outOfStock} />
                <BuyNowButton productId={String(product.id)} outOfStock={outOfStock} />
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/cart">View cart</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Product details</p>
              <h1 className="text-3xl font-semibold">{product.title}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Category</p>
                <p className="mt-1 text-base font-medium">{product.category}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Location</p>
                <p className="mt-1 text-base font-medium">{product.location}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Condition</p>
                <p className="mt-1 text-base font-medium capitalize">{product.condition}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Quantity</p>
                <p className="mt-1 text-base font-medium">{stockQuantity}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Reviews</p>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Be the first to review this product.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((r: any) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{r.author_name ?? 'Customer'}</p>
                      <p className="text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
                    <p className="mt-2 text-xs text-slate-500">Rating: {r.rating}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Seller</p>
            <p className="mt-2 text-base font-medium">{product.seller_name ?? 'Verified marketplace seller'}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Orders are fulfilled by our trusted sellers across Nigeria. No payment processing is built yet.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Related</p>
            <div className="mt-4 space-y-3">
              {related.length === 0 ? (
                <p className="text-sm text-slate-500">No related products found.</p>
              ) : (
                related.map((r: any) => (
                  <Link key={r.id} href={`/products/${String(r.id)}`} className="flex items-center gap-3">
                    <img src={getFirstImageUrl(r.images) ?? ''} alt={r.title} className="h-12 w-12 rounded object-cover" />
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-slate-500">₦{Number(r.price).toLocaleString()}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};

  return {
    title: `${product.title} — RetarGO Marketplace`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.title,
      description: product.description.slice(0, 160),
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  } as any;
}
