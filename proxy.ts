import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FEATURE_ROUTES = ['terminal', 'sqlite', 'reports', 'tms'] as const;

/**
 * Canonical entry point for legacy root navigation.
 *
 * Features used to be query-param tabs (`/?tab=reports`); they are now real
 * routes (`/reports`). This proxy redirects the root path to the matching
 * feature route and defaults to `/terminal`.
 */
export function proxy(request: NextRequest) {
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