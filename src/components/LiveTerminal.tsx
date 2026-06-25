'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square, Eraser, TerminalSquare, Trash2 } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { createTranslator, type Language } from '../utils/i18n';
import { ROBOT_RUN_ALL_COMMAND } from '../utils/robotCommands';
import { buildRunFolderName } from '../utils/robotResultsFolder';
import type { DbExecution, DbTestCase, DbStepLog } from '../utils/sqliteEngine';

export interface ParsedRunResult {
  execution: DbExecution;
  testCases: DbTestCase[];
  steps: DbStepLog[];
}

interface LiveTerminalProps {
  language?: Language;
  /** Comando pré-preenchido no campo de entrada. */
  initialCommand?: string;
  /** Chamado quando uma execução real do Robot é parseada do output.xml. */
  onPersisted?: (parsed: ParsedRunResult) => void;
  /** Zera executions / test_cases / steps no banco. */
  onClearExecutions?: () => void;
}

const DEFAULT_COMMAND = ROBOT_RUN_ALL_COMMAND;

const formatTimestamp = (): string => new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * Terminal ao vivo (xterm.js): envia um comando pela interface, executa
 * localmente via /api/terminal/run e renderiza o stdout/stderr em tempo real.
 *
 * Versão simples (Fase 0): somente leitura no terminal; o comando é enviado
 * pelo campo de entrada acima. Sem Docker/sandbox — uso local de teste.
 */
export function LiveTerminal({ language = 'PT', initialCommand, onPersisted, onClearExecutions }: LiveTerminalProps) {
  const t = createTranslator(language);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [command, setCommand] = useState<string>(initialCommand ?? DEFAULT_COMMAND);
  const [isRunning, setIsRunning] = useState(false);
  const [persist, setPersist] = useState(true);

  // Inicializa o terminal uma única vez.
  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.25,
      theme: {
        background: '#0f172a',
        foreground: '#cbd5e1',
        cursor: '#FF6600',
        selectionBackground: '#334155',
        black: '#0f172a',
        red: '#fb7185',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#38bdf8',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    term.writeln('\x1b[38;5;208m TMS Live Terminal \x1b[0m\x1b[90m— pronto. Envie um comando acima.\x1b[0m');

    termRef.current = term;
    fitRef.current = fit;

    const handleResize = () => {
      try {
        fit.fit();
      } catch {
        /* container ainda sem dimensões */
      }
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      abortRef.current?.abort();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCommand = useCallback(async (overrideCmd?: string) => {
    const term = termRef.current;
    const cmd = (overrideCmd ?? command).trim();
    if (!term || !cmd || isRunning) return;

    if (overrideCmd) setCommand(overrideCmd);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);

    const timestamp = formatTimestamp();
    const runFolder = buildRunFolderName(timestamp);
    let aborted = false;

    term.writeln(`\x1b[1;33m$ ${cmd}\x1b[0m`);

    try {
      const response = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, persist, runId: runFolder }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.text().catch(() => response.statusText);
        term.writeln(`\x1b[1;31m[ERRO] ${message}\x1b[0m`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        term.write(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        aborted = true;
        term.writeln('\x1b[1;33m[INTERROMPIDO] Execução cancelada pelo usuário.\x1b[0m');
      } else {
        term.writeln(`\x1b[1;31m[ERRO] ${(err as Error).message}\x1b[0m`);
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }

    // Fase 1: lê o output.xml gerado, faz parse e persiste no banco do TMS.
    if (persist && !aborted) {
      try {
        const res = await fetch('/api/terminal/output', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: runFolder, command: cmd, timestamp }),
        });
        const data = await res.json();
        if (!res.ok) {
          term.writeln(`\x1b[90m[TMS] Sem persistência: ${data?.error ?? res.statusText}\x1b[0m`);
        } else {
          const parsed = data as ParsedRunResult;
          term.writeln(
            `\x1b[1;32m[TMS] Execução registrada: ${parsed.execution.id} — ` +
              `${parsed.execution.total_tests} testes (${parsed.execution.passed} ok, ${parsed.execution.failed} falhas).\x1b[0m`,
          );
          if (parsed.execution.report_screenshot_path) {
            term.writeln(
              `\x1b[90m[TMS] Report Robot capturado (report.html + log por cenário) para o PDF.\x1b[0m`,
            );
          }
          onPersisted?.(parsed);
        }
      } catch (err) {
        term.writeln(`\x1b[90m[TMS] Falha ao persistir: ${(err as Error).message}\x1b[0m`);
      }
    }
  }, [command, isRunning, persist, onPersisted]);

  const stopCommand = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearTerminal = useCallback(() => {
    termRef.current?.clear();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          <TerminalSquare className="w-3.5 h-3.5 text-[#FF6600]" />
          <span>{t('Terminal Ao Vivo (Execução Local)', 'Live Terminal (Local Execution)')}</span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#FF6600] font-mono leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] animate-ping" />
            <span>STREAMING ACTIVE</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-slate-950/40 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={isRunning}
          onClick={() => runCommand(ROBOT_RUN_ALL_COMMAND)}
          className="flex items-center gap-1.5 bg-[#FF6600]/10 hover:bg-[#FF6600]/20 text-[#FF6600] font-black text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-lg border border-[#FF6600]/30 hover:border-[#FF6600] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={t(
            'Executa todas as suítes Robot em robot-sample/ (login_tests + tms)',
            'Runs all Robot suites in robot-sample/ (login_tests + tms)',
          )}
        >
          <Play className="w-3 h-3 fill-current" />
          {t('Executar Todos os Testes', 'Run All Tests')}
        </button>
        <span className="text-[10px] font-mono text-slate-500 truncate max-w-full">
          {ROBOT_RUN_ALL_COMMAND}
        </span>
        {onClearExecutions && (
          <button
            type="button"
            disabled={isRunning}
            onClick={onClearExecutions}
            className="ml-auto flex items-center gap-1.5 text-slate-400 hover:text-rose-400 font-bold text-[10px] uppercase px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer disabled:opacity-50"
            title={t('Zerar histórico de execuções', 'Clear execution history')}
          >
            <Trash2 className="w-3 h-3" />
            {t('Zerar Execuções', 'Clear Runs')}
          </button>
        )}
      </div>

      {/* Command bar */}
      <div className="bg-slate-950/60 px-4 py-3 border-b border-slate-800 flex items-center gap-2 flex-wrap">
        <span className="text-[#FF6600] font-mono font-black text-xs select-none">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runCommand();
          }}
          disabled={isRunning}
          placeholder={t('Digite o comando e pressione Enter…', 'Type the command and press Enter…')}
          spellCheck={false}
          className="flex-1 min-w-[180px] bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#FF6600] disabled:opacity-60"
        />
        {!isRunning ? (
          <button
            type="button"
            onClick={() => runCommand()}
            className="flex items-center gap-1.5 bg-[#FF6600] hover:bg-[#FF6600]/90 text-white font-black text-xs px-4 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
            title={t('Executar comando', 'Run command')}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {t('Executar', 'Run')}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCommand}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-4 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
            title={t('Parar execução', 'Stop execution')}
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            {t('Parar', 'Stop')}
          </button>
        )}
        <button
          type="button"
          onClick={clearTerminal}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-800 transition-all cursor-pointer"
          title={t('Limpar terminal', 'Clear terminal')}
        >
          <Eraser className="w-3.5 h-3.5" />
          {t('Limpar', 'Clear')}
        </button>

        <label
          className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 select-none cursor-pointer pl-1"
          title={t('Faz parse do output.xml do Robot e grava no banco (Reports/PDF).', 'Parses Robot output.xml and saves to the database (Reports/PDF).')}
        >
          <input
            type="checkbox"
            checked={persist}
            onChange={(e) => setPersist(e.target.checked)}
            disabled={isRunning}
            className="accent-[#FF6600] w-3.5 h-3.5"
          />
          {t('Persistir (Robot)', 'Persist (Robot)')}
        </label>
      </div>

      {/* xterm container */}
      <div ref={containerRef} className="h-72 w-full bg-slate-900 p-2" />
    </div>
  );
}
