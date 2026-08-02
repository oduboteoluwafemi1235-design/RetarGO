"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/button';
import { LoadingState } from '@/components/loading-state';
import { useToast } from '@/components/toast-provider';
import type { Database } from '@/types/supabase';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null; created_at: string | null } | null>(null);
  const supabase = createClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name,email,avatar_url,created_at').eq('id', user.id).single();
      const profileData = data as { full_name: string | null; email: string | null; avatar_url: string | null; created_at: string | null } | null;
      if (profileData) {
        setProfile(profileData);
        reset({ fullName: profileData.full_name ?? '', avatarUrl: profileData.avatar_url ?? '' });
      }
      setLoading(false);
    };
    loadProfile();
  }, [reset, supabase]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updatePayload = {
      full_name: values.fullName,
      avatar_url: values.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from('profiles') as any).update(updatePayload).eq('id', user.id);
    if (error) {
      pushToast(error.message, 'error');
    } else {
      pushToast('Profile updated', 'success');
    }
    setSaving(false);
  };

  if (loading) return <LoadingState label="Loading profile..." />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Your profile</p>
            <h1 className="mt-2 text-3xl font-semibold">{profile?.full_name ?? 'Your profile'}</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Welcome back to your RetarGO account.</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-semibold text-white">
            {profile?.full_name?.charAt(0) ?? 'U'}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
            <h2 className="font-semibold">Account details</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Email: {profile?.email ?? '—'}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" asChild>
                <Link href="/orders">My orders</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/profile/payments">Payment history</Link>
              </Button>
            </div>
          </div>
          <form className="space-y-4 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800" onSubmit={handleSubmit(onSubmit)}>
            <h2 className="font-semibold">Update profile</h2>
            <div>
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Full name" {...register('fullName')} />
              {errors.fullName ? <p className="mt-1 text-sm text-rose-600">{errors.fullName.message}</p> : null}
            </div>
            <div>
              <input className="w-full rounded-2xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Avatar URL" {...register('avatarUrl')} />
            </div>
            {saving ? <LoadingState label="Saving profile..." /> : <Button className="w-full" variant="primary">Save changes</Button>}
          </form>
        </div>
      </div>
    </main>
  );
}
