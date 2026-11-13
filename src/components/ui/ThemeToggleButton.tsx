'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { AppTheme } from '@/src/hooks/useAppTheme';

export interface ThemeToggleButtonProps {
  theme: AppTheme;
  onToggle: () => void;
  t?: (pt: string, en: string) => string;
  className?: string;
}

const defaultT = (pt: string, _en: string): string => pt;

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  theme,
  onToggle,
  t = defaultT,
  className = '',
}) => {
  const isDark = theme === 'dark';
  const label = isDark ? t('Claro', 'Light') : t('Escuro', 'Dark');
  const title = isDark
    ? t('Alternar para Tema Claro', 'Switch to Light Theme')
    : t('Alternar para Tema Escuro', 'Switch to Dark Theme');

  return (
    <button
      type="button"
      data-testid="theme-toggle-btn"
      onClick={onToggle}
      title={title}
      aria-label={title}
      aria-pressed={!isDark}
      className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-300 cursor-pointer shadow-sm overflow-hidden ${
        isDark
          ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-sky-500'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-blue-500'
      } ${className}`}
    >
      <span
        className={`relative flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300 ${
          isDark
            ? 'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25'
            : 'bg-indigo-500/15 text-indigo-600 group-hover:bg-indigo-500/25'
        }`}
      >
        <Sun
          className={`w-3.5 h-3.5 absolute transition-all duration-300 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
        <Moon
          className={`w-3.5 h-3.5 absolute transition-all duration-300 ${
            isDark
              ? 'opacity-0 rotate-90 scale-50'
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
      </span>
      <span className="leading-none tracking-tight">{label}</span>
    </button>
  );
};

