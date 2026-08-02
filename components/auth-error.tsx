export function AuthError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
      {message}
    </div>
  );
}
