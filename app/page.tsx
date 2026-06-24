import AppClient from './app-client';

/**
 * Root fallback. In practice `middleware.ts` redirects `/` (and legacy
 * `/?tab=x`) to the dedicated feature route, so this only renders if the
 * middleware is bypassed.
 */
export default function HomePage() {
  return <AppClient initialTab="terminal" />;
}
