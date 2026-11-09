'use client';

import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import type { AggregatedScorecard } from '@/src/server/services/testRunScorecard';

export interface ScorecardTableProps {
  scorecard: AggregatedScorecard;
  language?: 'PT' | 'ENG';
  t?: (pt: string, en: string) => string;
}

const defaultTranslator = (pt: string, _en: string): string => pt;

export const ScorecardTable: React.FC<ScorecardTableProps> = ({
  scorecard,
  language = 'PT',
  t = defaultTranslator,
}) => {
  const { aggregate, runs, warnings } = scorecard;

  return (
    <div data-testid="scorecard-container" className="flex flex-col gap-6">
      {/* Avisos não bloqueantes (AC-SCR-08) */}
      {warnings.length > 0 && (
        <div
          data-testid="scorecard-warnings"
          className="flex flex-col gap-2 bg-amber-950/40 border border-amber-500/40 rounded-xl p-4"
        >
          {warnings.map((warning) => (
            <div
              key={warning.code}
              data-testid={`scorecard-warning-${warning.code}`}
              className="flex items-center gap-2 text-xs text-amber-300 font-mono"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{language === 'PT' ? warning.messagePt : warning.messageEn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Agregado no topo (AC-SCR-02, AC-SCR-03) */}
      <div
        data-testid="scorecard-aggregate-summary"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
              {t('Agregado dos Ciclos Selecionados', 'Selected Cycles Aggregate')}
            </h3>
            <p className="text-xs text-slate-400">
              {t(
                'Soma consolidada de todos os resultados dos Test Runs filtrados',
                'Consolidated sum of all results across filtered Test Runs',
              )}
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white">
            <span>{t('Total de Casos:', 'Total Cases:')} </span>
            <span data-testid="scorecard-aggregate-total" className="text-[#FF6600]">
              {aggregate.total}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            data-testid="scorecard-aggregate-passed"
            className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col gap-1"
          >
            <span className="text-[11px] font-mono font-bold uppercase text-emerald-400">
              {t('Aprovado', 'Passed')}
            </span>
            <span className="text-base font-black font-mono text-white">
              {aggregate.passed.formatted}
            </span>
          </div>

          <div
            data-testid="scorecard-aggregate-failed"
            className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 flex flex-col gap-1"
          >
            <span className="text-[11px] font-mono font-bold uppercase text-rose-400">
              {t('Falhou', 'Failed')}
            </span>
            <span className="text-base font-black font-mono text-white">
              {aggregate.failed.formatted}
            </span>
          </div>

          <div
            data-testid="scorecard-aggregate-open"
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-700 flex flex-col gap-1"
          >
            <span className="text-[11px] font-mono font-bold uppercase text-slate-300">
              {t('Não Iniciado', 'Not Started')}
            </span>
            <span className="text-base font-black font-mono text-white">
              {aggregate.open.formatted}
            </span>
          </div>

          <div
            data-testid="scorecard-aggregate-blocked"
            className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col gap-1"
          >
            <span className="text-[11px] font-mono font-bold uppercase text-amber-400">
              {t('Bloqueado', 'Blocked')}
            </span>
            <span className="text-base font-black font-mono text-white">
              {aggregate.blocked.formatted}
            </span>
          </div>

          <div
            data-testid="scorecard-aggregate-skipped"
            className="p-3.5 rounded-xl bg-slate-950 border border-sky-500/30 flex flex-col gap-1"
          >
            <span className="text-[11px] font-mono font-bold uppercase text-sky-400">
              {t('Ignorado', 'Skipped')}
            </span>
            <span className="text-base font-black font-mono text-white">
              {aggregate.skipped.formatted}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela por Run (AC-SCR-01) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="scorecard-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono font-bold uppercase text-slate-400">
                <th className="py-3.5 px-4">{t('Nome do Ciclo', 'Name')}</th>
                <th className="py-3.5 px-4 text-right">{t('Total', 'Total')}</th>
                <th className="py-3.5 px-4 text-right">{t('Não Iniciado', 'Not Started')}</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">
                  {t('Aprovado', 'Passed')}
                </th>
                <th className="py-3.5 px-4 text-right text-rose-400">
                  {t('Falhou', 'Failed')}
                </th>
                <th className="py-3.5 px-4 text-right text-sky-400">
                  {t('Ignorado', 'Skipped')}
                </th>
                <th className="py-3.5 px-4 text-right text-amber-400">
                  {t('Bloqueado', 'Blocked')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {runs.map((run) => (
                <tr
                  key={run.id}
                  data-testid={`scorecard-row-${run.id}`}
                  className="hover:bg-slate-950/60 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{run.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[#FF6600] font-bold">{run.appVersion}</span>
                      <span>•</span>
                      <span>{run.platform}</span>
                      <span>•</span>
                      <span>{run.environment}</span>
                      {run.browserOrDevice && (
                        <>
                          <span>•</span>
                          <span>{run.browserOrDevice}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{run.milestone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                    {run.total}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {run.open.formatted}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                    {run.passed.formatted}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                    {run.failed.formatted}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sky-400">
                    {run.skipped.formatted}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                    {run.blocked.formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Texto de ajuda do scorecard (Seção 4.1) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono font-bold text-slate-200">
          <HelpCircle className="w-4 h-4 text-[#FF6600]" />
          <span>{t('Guia de Leitura do Scorecard', 'Scorecard Reading Guide')}</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px]">
          <li>
            {t(
              'Paridade de browser: taxas de aprovação próximas, na ordem de 5 pontos percentuais.',
              'Browser parity: approval rates close to each other, within roughly 5 percentage points.',
            )}
          </li>
          <li>
            {t(
              'Paridade de ambiente: homologação e produção no mesmo escopo e na mesma versão.',
              'Environment parity: staging and production on the same scope and version.',
            )}
          </li>
          <li>
            {t(
              'Tendência de sprint: regressões sucessivas com a mesma suíte.',
              'Sprint trend: successive regressions using the same suite.',
            )}
          </li>
          <li>
            {t(
              'Cobertura: Não Iniciado acima de zero significa ciclo incompleto.',
              'Coverage: Not Started above zero indicates an incomplete cycle.',
            )}
          </li>
        </ul>
      </div>
    </div>
  );
};

