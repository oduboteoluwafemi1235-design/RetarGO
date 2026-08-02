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

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setServerError(null);

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    });

    if (error) {
      setServerError(error.message);
      pushToast(error.message, 'error');
      setLoading(false);
      return;
    }

    if (data.user) {
      await (supabase.from('profiles') as any).upsert({
        id: data.user.id,
        email: values.email,
        full_name: values.fullName,
        role: 'customer',
        updated_at: new Date().toISOString(),
      });
      pushToast('Account created successfully', 'success');
      router.push('/login');
    }

    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Create account</p>
        <h1 className="mt-2 text-3xl font-semibold">Join RetarGO</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthError message={serverError ?? undefined} />
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Full Name" {...register('fullName')} />
            {errors.fullName ? <p className="mt-1 text-sm text-rose-600">{errors.fullName.message}</p> : null}
          </div>
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Email" {...register('email')} />
            {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
          </div>
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Password" type="password" {...register('password')} />
            {errors.password ? <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p> : null}
          </div>
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Confirm Password" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword ? <p className="mt-1 text-sm text-rose-600">{errors.confirmPassword.message}</p> : null}
          </div>
          {loading ? <LoadingState label="Creating account..." /> : <Button className="w-full" variant="primary">Create account</Button>}
        </form>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Already registered? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
