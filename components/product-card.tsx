'use client';

import Link from 'next/link';
import { Button } from './button';
import { WishlistButton } from './wishlist-button';
import type { ProductWithCategory } from '@/types/marketplace';
import { getFirstImageUrl } from '@/lib/product-images';

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const primaryImage = getFirstImageUrl(product.images);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
        {primaryImage ? (
          <img src={primaryImage} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-slate-500">📦</div>
        )}
      </div>

      <div className="absolute right-4 top-4">
        <WishlistButton productId={product.id} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-brand-600">{product.category}</p>
          <h3 className="mt-1 text-lg font-semibold">{product.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
          {product.quantity <= 0 ? (
            <span className="mt-3 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              Out of stock
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4">
          <div>
              <div className="flex items-baseline gap-3">
                <p className="text-xl font-semibold">₦{product.price.toLocaleString()}</p>
                {product.discount ? <span className="text-sm text-red-500">-{product.discount}%</span> : null}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{product.location}</p>
              <p className="text-xs text-slate-400">{product.seller_name ?? 'Marketplace seller'}</p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/products/${product.id}`}>View</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
