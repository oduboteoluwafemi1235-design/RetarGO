'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-semibold">A temporary error occurred.</h1>
        <button onClick={() => reset()} className="mt-6 rounded-full bg-brand-600 px-5 py-3 font-medium text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
