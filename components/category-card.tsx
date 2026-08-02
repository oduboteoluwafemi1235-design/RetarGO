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
      className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-2xl dark:bg-brand-500/10">
        {category.image ? (
          <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          category.emoji ?? '🛍️'
        )}
      </div>
      <div>
        <h3 className="font-semibold">{category.name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{category.description}</p>
        {category.countLabel ? <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-600">{category.countLabel}</p> : null}
      </div>
    </Link>
  );
}
