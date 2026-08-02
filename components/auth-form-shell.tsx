import type { ReactNode } from 'react';

type AuthFormShellProps = {
	title: string;
	subtitle?: string;
	children: ReactNode;
};

export function AuthFormShell({ title, subtitle, children }: AuthFormShellProps) {
	return (
		<main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
			<div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
				<p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">{title}</p>
				{subtitle ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
				<div className="mt-6">{children}</div>
			</div>
		</main>
	);
}
