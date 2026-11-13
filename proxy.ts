import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authService } from '@/src/server/services/authService';

const FEATURE_ROUTES = ['terminal', 'sqlite', 'reports', 'tms'] as const;
const PUBLIC_PAGE_ROUTES = ['/login', '/register'] as const;
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
] as const;

function isStaticAsset(pathname: string): boolean {
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return true;
  }
  return /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|ttf)$/i.test(pathname);
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Global security proxy enforcing authenticated sessions across all feature pages and APIs.
 * Unauthenticated requests to feature routes are redirected to `/login`, while
 * unauthenticated API requests receive HTTP 401.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPublicApi(pathname) || isPublicPage(pathname)) {
    return NextResponse.next();
  }

  const rawToken = request.cookies.get('tms_session')?.value ?? '';
  const sessionUser = rawToken ? await authService.getSessionUser(rawToken) : null;

  if (!sessionUser) {
    if (pathname.startsWith('/api/')) {
      const apiRes = NextResponse.json(
        { error: 'Não autenticado. Faça login para acessar este recurso.' },
        { status: 401 },
      );
      if (rawToken) {
        apiRes.cookies.delete('tms_session');
      }
      return apiRes;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    if (pathname !== '/') {
      const target = `${pathname}${request.nextUrl.search}`;
      loginUrl.searchParams.set('next', target);
    }

    const redirectRes = NextResponse.redirect(loginUrl);
    if (rawToken) {
      redirectRes.cookies.delete('tms_session');
    }
    return redirectRes;
  }

  if (pathname === '/') {
    const tab = searchParams.get('tab');
    const target =
      tab && (FEATURE_ROUTES as readonly string[]).includes(tab) ? `/${tab}` : '/tms';

    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = '';
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (!pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
