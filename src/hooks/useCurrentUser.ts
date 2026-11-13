'use client';

import { useEffect, useState } from 'react';
import type { UserRole } from '@/src/server/validation/authSchemas';

export interface CurrentSessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  status: string;
}

/**
 * Fetches the active authenticated session user from `/api/auth/me`
 * and exposes `isViewer` for read-only RBAC enforcement in UI components.
 */
export function useCurrentUser(): {
  user: CurrentSessionUser | null;
  isViewer: boolean;
  isLoading: boolean;
} {
  const [user, setUser] = useState<CurrentSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.data?.user) {
          setUser(data.data.user as CurrentSessionUser);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    user,
    isViewer: user?.role === 'viewer',
    isLoading,
  };
}

