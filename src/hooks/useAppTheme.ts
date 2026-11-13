'use client';

import { useCallback, useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'qa_tms_theme';
const THEME_EVENT_NAME = 'qa-tms-theme-change';

function isValidTheme(value: string | null): value is AppTheme {
  return value === 'dark' || value === 'light';
}

export function useAppTheme(defaultTheme: AppTheme = 'dark') {
  const [theme, setThemeState] = useState<AppTheme>(defaultTheme);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const resolved: AppTheme = isValidTheme(saved) ? saved : defaultTheme;
    setThemeState(resolved);
    document.documentElement.dataset.theme = resolved;
  }, [defaultTheme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isValidTheme(event.newValue)) {
        setThemeState(event.newValue);
        document.documentElement.dataset.theme = event.newValue;
      }
    };

    const handleCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<AppTheme>;
      if (isValidTheme(custom.detail)) {
        setThemeState(custom.detail);
        document.documentElement.dataset.theme = custom.detail;
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(THEME_EVENT_NAME, handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(THEME_EVENT_NAME, handleCustomEvent);
    };
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new CustomEvent<AppTheme>(THEME_EVENT_NAME, { detail: nextTheme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}

