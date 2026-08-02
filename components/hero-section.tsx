import Link from 'next/link';
import { Button } from './button';

export function HeroSection() {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-br from-brand-50 via-white to-slate-100 dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-4 w-fit rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300">New season launches</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Shop smarter with <span className="text-brand-600">RetarGO</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Discover premium products, enjoy fast checkout, and build your perfect cart in one beautiful storefront.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href="/products">Explore products</Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/checkout">Go to checkout</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-brand-50 p-5 dark:bg-brand-500/10">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Fast delivery</p>
              <p className="mt-2 text-3xl font-semibold">24h</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-800">
              <p className="text-sm font-semibold">Secure payments</p>
              <p className="mt-2 text-3xl font-semibold">100%</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-800 sm:col-span-2">
              <p className="text-sm font-semibold">Popular this week</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xl font-semibold">Smart speakers</span>
                <span className="text-xl font-semibold text-brand-600">$89</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
