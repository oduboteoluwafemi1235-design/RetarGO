import Link from 'next/link';
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
        <Link href="/products" className="text-sm font-semibold text-coral-600 transition hover:text-coral-700">
          See all &rarr;
        </Link>
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

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-8 text-white shadow-soft sm:p-10">
          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-100">Fresh on RetarGO</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Find something new today</h2>
            <p className="mt-3 text-brand-50">Browse the latest listings from sellers across the marketplace.</p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-full bg-coral-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-coral-700"
            >
              Shop now
            </Link>
          </div>
          <div aria-hidden="true" className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-coral-500/30 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-white/10" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Browse by category</p>
            <h2 className="text-2xl font-semibold">Popular departments</h2>
          </div>
          <Link href="/categories" className="text-sm font-semibold text-coral-600 transition hover:text-coral-700">
            See all &rarr;
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.slice(0, 6).map((category) => (
            <CategoryCard
              key={category.id}
              category={{
                name: category.name,
                description:
                  (category.product_count ?? 0) === 0
                    ? 'No listings yet.'
                    : `Explore ${category.product_count} live listings in ${category.name}.`,
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