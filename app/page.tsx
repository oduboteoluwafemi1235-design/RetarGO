import { HeroSection } from '@/components/hero-section';
import { CategoryCard } from '@/components/category-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { getCategoriesWithCounts, getHomepageCollections } from '@/lib/supabase/marketplace';

function ProductSection({
  eyebrow,
  title,
  products,
}: {
  eyebrow: string;
  title: string;
  products: Awaited<ReturnType<typeof getHomepageCollections>>['featuredProducts'];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">{eyebrow}</p>
          <h2 className="text-2xl font-semibold">{title}</h2>
        </div>
      </div>
      {products.length === 0 ? (
        <EmptyState
          title="No products available yet"
          description="Marketplace products will appear here as soon as sellers publish listings."
          actionLabel="Browse categories"
          actionHref="/categories"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  try {
    const [categories, collections] = await Promise.all([
      getCategoriesWithCounts(),
      getHomepageCollections(),
    ]);

  return (
    <main>
      <HeroSection />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Browse by category</p>
            <h2 className="text-2xl font-semibold">Popular departments</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.slice(0, 6).map((category) => (
            <CategoryCard
              key={category.id}
              category={{
                name: category.name,
                description: `Explore ${category.product_count ?? 0} live listings in ${category.name}.`,
                image: category.image,
                countLabel: `${category.product_count ?? 0} products`,
                href: `/category/${encodeURIComponent(category.name.toLowerCase())}`,
              }}
            />
          ))}
        </div>
      </section>

      <ProductSection eyebrow="Featured Products" title="Top marketplace picks" products={collections.featuredProducts} />
      <ProductSection eyebrow="New Arrivals" title="Freshly listed items" products={collections.newArrivals} />
      <ProductSection eyebrow="Trending Products" title="What shoppers are watching" products={collections.trendingProducts} />
      <ProductSection eyebrow="Recommended Products" title="Handpicked for quick discovery" products={collections.recommendedProducts} />
    </main>
  );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load marketplace homepage.';
    return (
      <main>
        <HeroSection />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <ErrorState message={message} />
        </div>
      </main>
    );
  }
}
