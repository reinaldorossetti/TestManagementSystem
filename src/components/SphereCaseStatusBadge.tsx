'use client';

import type { DbTestCaseSphere } from '@/src/utils/sqliteEngine';
import {
  resolveSphereCaseMode,
  resolveSphereCaseStatus,
} from '@/src/utils/sphereCaseExecution';

interface SphereCaseStatusBadgeProps {
  testCase: DbTestCaseSphere;
  localStatuses?: Record<string, string>;
  t?: (pt: string, en: string) => string;
  variant?: 'light' | 'dark';
}

const tr = (t: SphereCaseStatusBadgeProps['t'], pt: string, en: string) => (t ? t(pt, en) : pt);

export function SphereCaseStatusBadge({
  testCase,
  localStatuses = {},
  t,
  variant = 'light',
}: SphereCaseStatusBadgeProps) {
  const status = resolveSphereCaseStatus(testCase, localStatuses);
  const mode = resolveSphereCaseMode(testCase);

  let displayLabel = tr(t, 'Não Iniciado', 'Not Started');
  let colorClasses =
    variant === 'light'
      ? 'bg-slate-100 text-slate-600 border-slate-300'
      : 'bg-slate-800 text-slate-400 border-slate-700/60';
  let dotColor = variant === 'light' ? 'bg-slate-400' : 'bg-slate-500';

  if (status === 'PASS' || status === 'Passed' || status === 'PASSED') {
    displayLabel = tr(t, 'Aprovado', 'Passed');
    colorClasses =
      variant === 'light'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-300/80'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    dotColor = variant === 'light' ? 'bg-emerald-500' : 'bg-emerald-400';
  } else if (status === 'SKIP' || status === 'Skipped' || status === 'SKIPPED') {
    displayLabel = tr(t, 'Ignorado', 'Skipped');
    colorClasses =
      variant === 'light'
        ? 'bg-amber-50 text-amber-700 border-amber-300/80'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/20';
    dotColor = variant === 'light' ? 'bg-amber-500' : 'bg-amber-500';
  } else if (status === 'FAIL' || status === 'Failed' || status === 'FAILED') {
    displayLabel = tr(t, 'Falhou', 'Failed');
    colorClasses =
      variant === 'light'
        ? 'bg-rose-50 text-rose-700 border-rose-300/80'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    dotColor = variant === 'light' ? 'bg-rose-500' : 'bg-rose-400';
  } else if (status === 'BLOCKED' || status === 'Blocked') {
    displayLabel = tr(t, 'Bloqueado', 'Blocked');
    colorClasses =
      variant === 'light'
        ? 'bg-violet-50 text-violet-700 border-violet-300/80'
        : 'bg-violet-500/15 text-violet-400 border-violet-500/20';
    dotColor = variant === 'light' ? 'bg-violet-500' : 'bg-violet-400';
  }

  const modeLabel =
    mode === 'manual'
      ? tr(t, 'Manual', 'Manual')
      : mode === 'automated'
        ? tr(t, 'Automatizada', 'Automated')
        : null;

  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-bold font-mono shadow-sm ${colorClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{displayLabel}</span>
      {modeLabel && (
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
            mode === 'manual'
              ? variant === 'light'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-violet-500/20 text-violet-300'
              : variant === 'light'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {modeLabel}
        </span>
      )}
    </div>
  );
}
