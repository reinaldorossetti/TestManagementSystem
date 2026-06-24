'use client';

import dynamic from 'next/dynamic';
import type { WorkspaceFeature } from '@/src/App';

/**
 * The main application is a large client component that reads browser-only APIs
 * (localStorage, window) during initialization. Rendering it client-only avoids
 * SSR hydration issues while keeping it within the App Router.
 *
 * Each feature route (e.g. /reports) renders this shell pinned to its feature via
 * `initialTab`, so every feature has its own real page/URL instead of a query tab.
 */
const App = dynamic(() => import('@/src/App'), { ssr: false });

interface AppClientProps {
  initialTab?: WorkspaceFeature;
}

export default function AppClient({ initialTab }: AppClientProps) {
  return <App initialTab={initialTab} />;
}
