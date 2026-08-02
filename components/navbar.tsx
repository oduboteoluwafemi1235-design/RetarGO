'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from './button';
import { useTheme } from './theme-provider';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { getCartClient } from '@/lib/supabase/cart.client';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Cart', href: '/cart' },
  { label: 'Orders', href: '/orders' },
  { label: 'Profile', href: '/profile' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  const navLinks = user && role === 'seller'
    ? [...links, { label: 'Seller Dashboard', href: '/seller' }]
    : links;

  useEffect(() => {
    const loadCount = async () => {
      try {
        const cart = await getCartClient();
        const total = cart.reduce((sum: number, item: { quantity: number }) => sum + Number(item.quantity ?? 0), 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };

    loadCount();
    const handleCartChanged = () => {
      loadCount();
    };

    window.addEventListener('retargo:cart-changed', handleCartChanged as EventListener);
    return () => window.removeEventListener('retargo:cart-changed', handleCartChanged as EventListener);
  }, [user?.id]);

  useEffect(() => {
    const loadRole = async () => {
      if (!user?.id) {
        setRole(null);
        return;
      }

      const { data } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setRole(data?.role ?? null);
    };

    loadRole();
  }, [supabase, user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-xl font-semibold text-white">R</div>
          <div>
            <p className="text-lg font-semibold">RetarGO</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Marketplace</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-brand-600">
              {link.href === '/cart' ? (
                <span className="inline-flex items-center gap-2">
                  {link.label}
                  {cartCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
              ) : (
                link.label
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
          {loading ? null : user ? (
            <>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
              <Button variant="primary" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        <button className="rounded-full border border-slate-300 p-2 lg:hidden dark:border-slate-700" onClick={() => setMobileOpen((prev) => !prev)}>
          ☰
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-brand-600" onClick={() => setMobileOpen(false)}>
                {link.href === '/cart' && cartCount > 0 ? `${link.label} (${cartCount})` : link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </Button>
              {loading ? null : user ? (
                <Button variant="primary" size="sm" onClick={handleLogout}>Logout</Button>
              ) : (
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
