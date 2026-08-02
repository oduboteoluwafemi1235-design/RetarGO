import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 px-4 py-10 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">RetarGO</p>
          <p className="mt-2 max-w-xl">A polished marketplace experience built with Next.js, React, TypeScript, and Tailwind CSS.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/products" className="hover:text-brand-600">Products</Link>
          <Link href="/cart" className="hover:text-brand-600">Cart</Link>
          <Link href="/profile" className="hover:text-brand-600">Profile</Link>
        </div>
      </div>
    </footer>
  );
}
