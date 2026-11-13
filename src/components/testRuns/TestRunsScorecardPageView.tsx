'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  Search,
} from 'lucide-react';
import { createTranslator, type Language } from '@/src/utils/i18n';
import type { TestRunRecord } from '@/src/server/repositories/testRunRepository';
import type { AggregatedScorecard } from '@/src/server/services/testRunScorecard';
import { ScorecardEmptyState } from './ScorecardEmptyState';
import { ScorecardTable } from './ScorecardTable';
import { TestRunShellHeader, type TestRunAuthUser } from './TestRunShellHeader';

export const TestRunsScorecardPageView: React.FC = () => {
  const [language, setLanguage] = useState<Language>('PT');
  const hasHydratedLanguageRef = React.useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('qa_tms_lang');
    if (saved === 'PT' || saved === 'ENG') {
      setLanguage(saved);
    }
    hasHydratedLanguageRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedLanguageRef.current) return;
    localStorage.setItem('qa_tms_lang', language);
  }, [language]);

  const t = useMemo(() => createTranslator(language), [language]);

  const [currentUser, setCurrentUser] = useState<TestRunAuthUser | null>(null);
  const [availableRuns, setAvailableRuns] = useState<TestRunRecord[]>([]);

  // Filter inputs
  const [milestoneFilter, setMilestoneFilter] = useState<string>('');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [includeAborted, setIncludeAborted] = useState<boolean>(false);

  const [scorecard, setScorecard] = useState<AggregatedScorecard | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetch('/api/auth/me'), fetch('/api/test-runs')])
      .then(async ([meRes, runsRes]) => {
        if (!mounted) return;
        const meJson = await meRes.json();
        if (meJson.data?.user) {
          setCurrentUser(meJson.data.user);
        }
        if (runsRes.ok) {
          const runsJson = await runsRes.json();
          setAvailableRuns(runsJson.data?.runs ?? []);
        }
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  const distinctMilestones = useMemo(() => {
    const set = new Set<string>();
    for (const r of availableRuns) {
      if (r.milestone.trim()) set.add(r.milestone.trim());
    }
    return Array.from(set);
  }, [availableRuns]);

  const hasActiveFilter =
    milestoneFilter.trim().length > 0 ||
    selectedRunIds.length > 0 ||
    fromDate.trim().length > 0 ||
    toDate.trim().length > 0;

  const buildQueryParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    if (milestoneFilter.trim()) params.set('milestone', milestoneFilter.trim());
    if (selectedRunIds.length > 0) params.set('runIds', selectedRunIds.join(','));
    if (fromDate.trim()) params.set('from', fromDate.trim());
    if (toDate.trim()) params.set('to', toDate.trim());
    if (includeAborted) params.set('includeAborted', 'true');
    return params;
  }, [milestoneFilter, selectedRunIds, fromDate, toDate, includeAborted]);

  const handleGenerateScorecard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    if (!hasActiveFilter) {
      setScorecard(null);
      return;
    }

    try {
      setIsLoading(true);
      const params = buildQueryParams();
      const res = await fetch(`/api/test-runs/scorecard?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(
          json.error || t('Erro ao consultar o Scorecard.', 'Error querying Scorecard.'),
        );
        setScorecard(null);
        return;
      }
      setScorecard(json.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const canUserExportRole =
    currentUser?.role === 'analyst' || currentUser?.role === 'admin';
  const hasScorecardRows = Boolean(scorecard && scorecard.runs.length > 0);
  const isExportEnabled = canUserExportRole && hasActiveFilter && hasScorecardRows;

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!isExportEnabled) return;
    setErrorMsg(null);
    const params = buildQueryParams();
    params.set('format', format);

    const res = await fetch(`/api/test-runs/scorecard/export?${params.toString()}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(
        json.error || t('Não foi possível exportar o Scorecard.', 'Could not export Scorecard.'),
      );
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `test-runs-scorecard.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-theme-base="dark"
      className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans select-none antialiased"
    >
      <TestRunShellHeader
        activeSubRoute="scorecard"
        language={language}
        setLanguage={setLanguage}
        currentUser={currentUser}
        t={t}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121826] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/test-runs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF6600]" />
              <span>{t('Voltar aos Ciclos', 'Back to Cycles')}</span>
            </Link>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {t('Scorecard de Execução (Test Runs)', 'Execution Scorecard (Test Runs)')}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {t(
                  'Comparativo consolidado por milestone, ciclos selecionados ou período',
                  'Consolidated comparison by milestone, selected cycles, or date range',
                )}
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2.5">
            {canUserExportRole ? (
              <>
                <button
                  type="button"
                  disabled={!isExportEnabled}
                  data-testid="scorecard-export-xlsx-btn"
                  onClick={() => handleExport('xlsx')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{t('Exportar XLSX', 'Export XLSX')}</span>
                </button>

                <button
                  type="button"
                  disabled={!isExportEnabled}
                  data-testid="scorecard-export-pdf-btn"
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-[#FF6600] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>{t('Exportar PDF', 'Export PDF')}</span>
                </button>

                <button
                  type="button"
                  disabled={!hasScorecardRows}
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('Imprimir', 'Print')}</span>
                </button>
              </>
            ) : (
              <span
                data-testid="scorecard-export-restricted-badge"
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400"
              >
                {t(
                  'Exportação XLSX/PDF restrita a Analyst e Admin',
                  'XLSX/PDF export restricted to Analyst and Admin',
                )}
              </span>
            )}
          </div>
        </div>

        {/* Filters Form */}
        <form
          onSubmit={handleGenerateScorecard}
          data-testid="scorecard-filter-form"
          className="bg-[#121826] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 uppercase">
            <Filter className="w-4 h-4 text-[#FF6600]" />
            <span>{t('Critérios do Scorecard', 'Scorecard Criteria')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Milestone Filter */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="scorecard-milestone-input"
                className="text-xs font-mono font-bold text-slate-300"
              >
                {t('Milestone', 'Milestone')}
              </label>
              <input
                id="scorecard-milestone-input"
                data-testid="scorecard-milestone-input"
                type="text"
                list="scorecard-milestones-list"
                value={milestoneFilter}
                onChange={(e) => setMilestoneFilter(e.target.value)}
                placeholder="Sprint 24"
                className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
              <datalist id="scorecard-milestones-list">
                {distinctMilestones.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Period From */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="scorecard-from-input"
                className="text-xs font-mono font-bold text-slate-300"
              >
                {t('Período Inicial (De)', 'Start Period (From)')}
              </label>
              <input
                id="scorecard-from-input"
                data-testid="scorecard-from-input"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>

            {/* Period To */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="scorecard-to-input"
                className="text-xs font-mono font-bold text-slate-300"
              >
                {t('Período Final (Até)', 'End Period (To)')}
              </label>
              <input
                id="scorecard-to-input"
                data-testid="scorecard-to-input"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Select specific Test Runs */}
          {availableRuns.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-300">
                {t('Ou selecione Test Runs específicos:', 'Or select specific Test Runs:')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {availableRuns.map((run) => {
                  const checked = selectedRunIds.includes(run.id);
                  return (
                    <label
                      key={run.id}
                      data-testid={`scorecard-run-checkbox-${run.id}`}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedRunIds((prev) =>
                            e.target.checked
                              ? [...prev, run.id]
                              : prev.filter((id) => id !== run.id),
                          );
                        }}
                      />
                      <span className="truncate font-bold">{run.name}</span>
                      <span className="text-[10px] font-mono text-[#FF6600] ml-auto">
                        {run.appVersion}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                data-testid="scorecard-include-aborted-checkbox"
                checked={includeAborted}
                onChange={(e) => setIncludeAborted(e.target.checked)}
              />
              <span>{t('Incluir ciclos abortados (Aborted)', 'Include aborted cycles (Aborted)')}</span>
            </label>

            <button
              type="submit"
              data-testid="generate-scorecard-btn"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] border border-slate-800 hover:border-sky-500 text-xs font-mono font-black text-white uppercase tracking-wider cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>
                {isLoading
                  ? t('Calculando...', 'Calculating...')
                  : t('Gerar Scorecard', 'Generate Scorecard')}
              </span>
            </button>
          </div>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono"
          >
            {errorMsg}
          </div>
        )}

        {/* Scorecard Content or Empty State */}
        {!hasActiveFilter || !scorecard || scorecard.runs.length === 0 ? (
          <ScorecardEmptyState t={t} />
        ) : (
          <ScorecardTable scorecard={scorecard} language={language} t={t} />
        )}
      </main>
    </div>
  );
};

