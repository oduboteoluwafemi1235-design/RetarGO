export default function ProductDetailsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-[420px] rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-6 h-8 w-56 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-8 h-12 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </main>
  );
}
