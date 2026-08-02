import Link from 'next/link';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">No results</p>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-6 inline-flex rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
