type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-slate-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-100">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-600">Error</p>
      <h2 className="mt-4 text-2xl font-semibold">{message}</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Please try again or refine your search.</p>
    </div>
  );
}
