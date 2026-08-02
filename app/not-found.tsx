import Link from 'next/link';
import { Button } from '@/components/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Page not found</p>
        <h1 className="mt-3 text-4xl font-semibold">We could not find that page.</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">The requested route is unavailable right now.</p>
        <div className="mt-8 flex justify-center">
          <Button variant="primary" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
