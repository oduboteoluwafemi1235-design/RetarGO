"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/button';
import { AuthError } from '@/components/auth-error';
import { LoadingState } from '@/components/loading-state';
import { useToast } from '@/components/toast-provider';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    setServerError(null);
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, redirectTo ? { redirectTo } : undefined);
    if (error) {
      setServerError(error.message);
      pushToast(error.message, 'error');
      setLoading(false);
      return;
    }
    setSent(true);
    pushToast('Password reset email sent', 'success');
    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Reset password</p>
        <h1 className="mt-2 text-3xl font-semibold">Forgot your password?</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthError message={serverError ?? undefined} />
          {sent ? <p className="text-sm text-slate-600 dark:text-slate-300">Check your inbox for the reset link.</p> : null}
          <div>
            <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Email" {...register('email')} />
            {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
          </div>
          {loading ? <LoadingState label="Sending reset link..." /> : <Button className="w-full" variant="primary">Send reset link</Button>}
        </form>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Remembered it? <Link href="/login" className="font-semibold text-brand-600">Back to login</Link>
        </p>
      </div>
    </main>
  );
}
