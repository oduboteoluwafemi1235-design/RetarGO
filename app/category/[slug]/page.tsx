import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCategories, getProductsPaged } from '@/lib/supabase/marketplace';
import { ProductCard } from '@/components/product-card';
import type { ProductWithCategory } from '@/types/marketplace';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.name.toLowerCase() === decodeURIComponent(slug).toLowerCase());

  if (!category) return notFound();

  let products: ProductWithCategory[] = [];
  let total = 0;
  try {
    const res = await getProductsPaged({ categoryId: String(category.id) }, 1, 24);
    products = res.data;
    total = res.total;
  } catch (e) {
    products = [];
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Category</p>
        <h1 className="mt-2 text-3xl font-semibold">{category.name}</h1>
        <p className="mt-2 text-sm text-slate-600">{total} items</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
