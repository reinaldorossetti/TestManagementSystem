'use client';

import React from 'react';
import { BarChart3, FileSpreadsheet, FileText } from 'lucide-react';

export interface ScorecardEmptyStateProps {
  t?: (pt: string, en: string) => string;
  canExport?: boolean;
}

const defaultTranslator = (pt: string, _en: string): string => pt;

export const ScorecardEmptyState: React.FC<ScorecardEmptyStateProps> = ({
  t = defaultTranslator,
}) => {
  return (
    <div
      data-testid="scorecard-empty-state"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4"
    >
      <div className="p-3 rounded-2xl bg-[#FF6600]/10 border border-[#FF6600]/30 text-[#FF6600]">
        <BarChart3 className="w-8 h-8" />
      </div>
      <div className="max-w-md flex flex-col gap-1.5">
        <h3 className="text-base font-extrabold text-white">
          {t('Nenhum Test Run selecionado no Scorecard', 'No Test Runs selected in Scorecard')}
        </h3>
        <p className="text-xs text-slate-400 font-sans">
          {t(
            'Informe pelo menos um filtro (Milestone, Test Runs específicos ou período) com ciclos correspondentes para gerar o Scorecard e habilitar a exportação.',
            'Provide at least one filter (Milestone, specific Test Runs, or date range) with matching cycles to generate the Scorecard and enable export.',
          )}
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled
          data-testid="scorecard-export-xlsx-btn"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-xs font-mono font-bold opacity-50 cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t('Exportar XLSX', 'Export XLSX')}</span>
        </button>
        <button
          type="button"
          disabled
          data-testid="scorecard-export-pdf-btn"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-xs font-mono font-bold opacity-50 cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          <span>{t('Exportar PDF', 'Export PDF')}</span>
        </button>
      </div>
    </div>
  );
};

