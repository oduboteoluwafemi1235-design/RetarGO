export function SkeletonProductCard() {
  return (
    <div className="animate-pulse">
      <div className="h-48 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 space-y-2 p-2">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
