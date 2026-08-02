"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/button';
import { AuthError } from '@/components/auth-error';
import { LoadingState } from '@/components/loading-state';
import { useToast } from '@/components/toast-provider';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(error.message);
      pushToast(error.message, 'error');
      setLoading(false);
      return;
    }

    pushToast('Signed in successfully', 'success');
    router.push('/profile');
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold">Login to RetarGO</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthError message={serverError ?? undefined} />
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Email" {...register('email')} />
            {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
          </div>
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Password" type="password" {...register('password')} />
            {errors.password ? <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p> : null}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('rememberMe')} />
              Remember Me
            </label>
            <Link href="/forgot-password" className="font-semibold text-brand-600">Forgot Password?</Link>
          </div>
          {loading ? <LoadingState label="Signing in..." /> : <Button className="w-full" variant="primary">Continue</Button>}
        </form>
        <div className="mt-4">
          <Button className="w-full" variant="secondary" onClick={handleGoogleLogin}>Continue with Google</Button>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          No account yet? <Link href="/register" className="font-semibold text-brand-600">Create one</Link>
        </p>
      </div>
    </main>
  );
}
