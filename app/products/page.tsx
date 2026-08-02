import { Suspense } from 'react';
import { getCategories, getProductsPaged } from '@/lib/supabase/marketplace';
import { ProductCard } from '@/components/product-card';
import { ProductFilters } from '@/components/product-filters';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import type { ProductWithCategory } from '@/types/marketplace';

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

type ResolvedProductsPageProps = {
  searchParams?: {
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
    perPage?: string;
    sort?: string;
  };
};

async function ProductList({ searchParams }: ResolvedProductsPageProps) {
  const categories = await getCategories();
  const selectedCategory = categories.find((category) => category.name === searchParams?.category);
  const filters = {
    query: searchParams?.q,
    categoryId: selectedCategory ? String(selectedCategory.id) : undefined,
    minPrice: searchParams?.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams?.maxPrice ? Number(searchParams.maxPrice) : undefined,
  };

  const page = searchParams?.page ? Number(searchParams.page) : 1;
  const perPage = searchParams?.perPage ? Number(searchParams.perPage) : 12;
  const sort = (searchParams?.sort as any) ?? undefined;

  let products: ProductWithCategory[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await getProductsPaged({ ...filters, sort }, page, perPage);
    products = res.data;
    total = res.total;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to load products.';
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Marketplace</p>
          <h1 className="text-3xl font-semibold">Discover new products</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ProductFilters
          categories={categories}
          initialQuery={searchParams?.q ?? ''}
          initialCategory={searchParams?.category ?? ''}
          initialMinPrice={searchParams?.minPrice ?? ''}
          initialMaxPrice={searchParams?.maxPrice ?? ''}
        />

        <div className="space-y-6">
          {error ? (
            <ErrorState message={error} />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try another search or broaden your filters to find items in the marketplace."
              actionLabel="Browse categories"
              actionHref="/categories"
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-600">Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} of {total} results</p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <a href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams ?? {}).map(([k,v])=>[k,String(v||'')])) , page: String(page-1), perPage: String(perPage) })}`} className="btn">Previous</a>
                  ) : null}
                  {page * perPage < total ? (
                    <a href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams ?? {}).map(([k,v])=>[k,String(v||'')])) , page: String(page+1), perPage: String(perPage) })}`} className="btn">Next</a>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="p-2">
                <div className="h-48 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="mt-4 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductList searchParams={resolvedSearchParams} />
    </Suspense>
  );
}
