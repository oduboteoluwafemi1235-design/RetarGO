import { AuthFormShell } from '@/components/auth-form-shell';

export default function AdminDashboardPage() {
  return (
    <AuthFormShell title="Admin dashboard" subtitle="Access will be enabled once admin features are added.">
      <p className="text-sm text-slate-600 dark:text-slate-300">This route is currently protected and reserved for future admin functionality.</p>
    </AuthFormShell>
  );
}
