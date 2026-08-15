/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  Terminal as TerminalIcon, 
  Sparkles, 
  Play, 
  ExternalLink 
} from 'lucide-react';
import { LiveTerminal } from '../LiveTerminal';
import { LoggedStep } from '../LoggedStep';
import type { DbExecution, DbTestCase, DbStepLog } from '../../utils/sqliteEngine';

interface TerminalLogEntry {
  id: string;
  text: string;
  mode?: 'normal' | 'cmd' | 'success' | 'warn' | 'error' | 'header';
}

interface TerminalViewProps {
  robotExecutionProgress: {
    total: number;
    passed: number;
    failed: number;
    isFinal: boolean;
  };
  terminalLogs: TerminalLogEntry[];
  handleRunFeatureReal: (tagOverride?: string) => void;
  isExecutingFeature: boolean;
  handleClearExecutionHistory: () => void;
  onPersistExecution: (data: { execution: DbExecution; testCases: DbTestCase[]; steps: DbStepLog[] }) => void;
  language: 'PT' | 'ENG';
  t: (pt: string, en: string) => string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  robotExecutionProgress,
  terminalLogs,
  handleRunFeatureReal,
  isExecutingFeature,
  handleClearExecutionHistory,
  onPersistExecution,
  language,
  t,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      {/* Upper Terminal Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Header Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-[#FF6600]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
              {t("Console Terminal de Execução Real (Robot Framework)", "Real Execution Terminal Console (Robot Framework)")}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.assign('/reports')}
              data-testid="terminal-reports-nav-button"
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              {t("Reporte", "Report")}
            </button>

            <button
              type="button"
              onClick={() => handleRunFeatureReal()}
              disabled={isExecutingFeature}
              data-testid="terminal-run-feature-button"
              className="bg-[#FF6600] hover:bg-[#E05500] text-white font-extrabold px-4 py-1.5 rounded-lg text-xs transition-colors font-mono flex items-center gap-1.5 shadow-md shadow-[#FF6600]/20 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isExecutingFeature ? t("Executando...", "Executing...") : t("Executar Feature", "Execute Feature")}
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-1 gap-3 p-4 bg-slate-950/50 border-b border-slate-800 md:grid-cols-3" data-testid="terminal-live-test-summary">
          <div className="flex items-center gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Total de Testes', 'Total Tests')}</p>
              <p className="text-3xl font-black leading-none text-sky-400" data-testid="terminal-live-total-count">{robotExecutionProgress.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Total de Sucesso', 'Total Passed')}</p>
              <p className="text-3xl font-black leading-none text-emerald-400" data-testid="terminal-live-passed-count">{robotExecutionProgress.passed}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Total de Falhas', 'Total Failed')}</p>
              <p className="text-3xl font-black leading-none text-rose-400" data-testid="terminal-live-failed-count">{robotExecutionProgress.failed}</p>
            </div>
          </div>
        </div>

        {/* Terminal Logs scrolling body */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-900 select-text scrollbar-thin" data-testid="terminal-logs">
          {terminalLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12" data-testid="terminal-empty-state">
              <TerminalIcon className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-xs">{t("Console de Execução Vazio.", "Empty Execution Console.")}</p>
              <p className="text-[10px] text-slate-600 mt-1">
                {t("Execute a Feature para mostrar os dados no Terminal.", "Execute the Feature to show details in the Terminal.")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {terminalLogs.map((log) => {
                let colorStyle = 'text-slate-300';
                if (log.mode === 'cmd') colorStyle = 'text-sky-300 font-bold';
                if (log.mode === 'success') colorStyle = 'text-emerald-400 font-semibold';
                if (log.mode === 'warn') colorStyle = 'text-amber-400';
                if (log.mode === 'error') colorStyle = 'text-rose-400 font-bold';
                if (log.mode === 'header') colorStyle = 'text-white font-extrabold bg-slate-950 py-0.5 px-1 rounded block mt-2 text-center border-y border-slate-800';

                return (
                  <div 
                    key={log.id} 
                    className={`whitespace-pre-wrap leading-relaxed ${colorStyle}`}
                  >
                    {log.text.includes('Step  |') ? <LoggedStep text={log.text} /> : log.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Live Terminal (real local execution via xterm.js) */}
      <LiveTerminal
        language={language}
        onClearExecutions={handleClearExecutionHistory}
        onPersisted={onPersistExecution}
      />

      {/* Automation Tip */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start gap-3.5 text-xs">
        <div className="p-2 bg-[#FF6600]/10 border border-[#FF6600]/20 rounded-lg text-[#FF6600] shrink-0">
          <Sparkles className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h4 className="font-extrabold text-[#FF6600] uppercase tracking-wider text-[10px] mb-1">
            {t("Como Funciona a Integração?", "How Does the Integration Work?")}
          </h4>
          <p className="text-slate-400 leading-relaxed">
            {language === 'PT' ? (
              <>
                Este painel executa testes reais do <strong>Robot Framework</strong> na máquina local.
                Ao clicar em <strong>Executar Feature</strong> ou <strong>Execução</strong> no workspace, o comando é enviado ao interpretador,
                a saída é gravada em <strong>results/</strong> e os resultados são persistidos no banco <strong>SQLite</strong>.
              </>
            ) : (
              <>
                This panel runs real <strong>Robot Framework</strong> tests on the local machine.
                When you click <strong>Execute Feature</strong> or <strong>Execution</strong> on a workspace card, the command is sent to the interpreter,
                output is saved under <strong>results/</strong>, and results are persisted to the <strong>SQLite</strong> database.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
