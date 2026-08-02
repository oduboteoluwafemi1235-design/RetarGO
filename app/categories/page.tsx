import { getCategoriesWithCounts } from '@/lib/supabase/marketplace';
import { CategoryCard } from '@/components/category-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import type { Category } from '@/types/marketplace';

export default async function CategoriesPage() {
  let categories: Category[] = [];
  let errorMessage = '';

  try {
    categories = await getCategoriesWithCounts();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unable to load categories.';
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Shop by category</p>
        <h1 className="mt-2 text-3xl font-semibold">Browse marketplace categories</h1>
      </div>

      {errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="We’re still adding categories to the marketplace. Check back soon."
          actionLabel="View products"
          actionHref="/products"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={{
                name: category.name,
                description: `Explore ${category.product_count ?? 0} listings in ${category.name}.`,
                image: category.image,
                countLabel: `${category.product_count ?? 0} products`,
                href: `/category/${encodeURIComponent(category.name.toLowerCase())}`,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
