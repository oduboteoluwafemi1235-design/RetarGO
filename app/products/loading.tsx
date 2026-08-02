export default function ProductsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-10 w-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            <div className="mt-5 h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
