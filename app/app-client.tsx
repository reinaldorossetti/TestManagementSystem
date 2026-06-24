'use client';

import dynamic from 'next/dynamic';

/**
 * The main application is a large client component that reads browser-only APIs
 * (localStorage, window) during initialization. Rendering it client-only avoids
 * SSR hydration issues while keeping it within the App Router.
 */
const App = dynamic(() => import('@/src/App'), { ssr: false });

export default function AppClient() {
  return <App />;
}
