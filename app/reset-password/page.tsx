"use client";

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

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setLoading(true);
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError(error.message);
      pushToast(error.message, 'error');
      setLoading(false);
      return;
    }
    pushToast('Password updated successfully', 'success');
    router.push('/profile');
    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Reset password</p>
        <h1 className="mt-2 text-3xl font-semibold">Set a new password</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthError message={serverError ?? undefined} />
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="New Password" type="password" {...register('password')} />
            {errors.password ? <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p> : null}
          </div>
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Confirm Password" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword ? <p className="mt-1 text-sm text-rose-600">{errors.confirmPassword.message}</p> : null}
          </div>
          {loading ? <LoadingState label="Updating password..." /> : <Button className="w-full" variant="primary">Update password</Button>}
        </form>
      </div>
    </main>
  );
}
