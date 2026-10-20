import Link from 'next/link';

export type Category = {
  name: string;
  description: string;
  emoji?: string;
  image?: string;
  countLabel?: string;
  href?: string;
};

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={category.href ?? '/products'}
      className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-coral-200 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-2xl ring-2 ring-brand-100 transition duration-200 group-hover:ring-coral-500 dark:bg-brand-500/10 dark:ring-brand-500/30">
        {category.image ? (
          <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          category.emoji ?? '🛍️'
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{category.name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{category.description}</p>
        {category.countLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {category.countLabel}
          </p>
        ) : null}
      </div>
      <span
        aria-hidden="true"
        className="text-xl text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-coral-600"
      >
        &rarr;
      </span>
    </Link>
  );
}