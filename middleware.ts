import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FEATURE_ROUTES = ['terminal', 'sqlite', 'reports', 'tms'] as const;

/**
 * Backward compatibility + canonical entry point.
 *
 * Features used to be query-param tabs (`/?tab=reports`); they are now real
 * routes (`/reports`). This middleware redirects the root path to the matching
 * feature route, preserving legacy `?tab=` links, and defaults to `/terminal`.
 */
export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tab = searchParams.get('tab');
  const target = tab && (FEATURE_ROUTES as readonly string[]).includes(tab) ? `/${tab}` : '/terminal';

  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/'],
};
