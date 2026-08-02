import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = ['/profile', '/checkout', '/orders', '/seller-dashboard', '/seller', '/admin-dashboard'];
const authPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isAuthPage = authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login?redirected=true', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return response;
}
