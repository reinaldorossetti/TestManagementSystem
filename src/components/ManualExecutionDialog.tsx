'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2, X } from 'lucide-react';
import { apiClient, ApiClientError } from '@/src/lib/api/client';
import type { DbTestCaseSphere, SphereExecutionStatus } from '@/src/utils/sqliteEngine';
import {
  MANUAL_STATUS_OPTIONS,
  parseGherkinStepLines,
} from '@/src/utils/sphereCaseExecution';

interface ManualExecutionDialogProps {
  testCase: DbTestCaseSphere;
  open: boolean;
  onClose: () => void;
  onCompleted: (updatedCase: DbTestCaseSphere) => void;
  t?: (pt: string, en: string) => string;
}

const tr = (t: ManualExecutionDialogProps['t'], pt: string, en: string) => (t ? t(pt, en) : pt);

export function ManualExecutionDialog({
  testCase,
  open,
  onClose,
  onCompleted,
  t,
}: ManualExecutionDialogProps) {
  const [status, setStatus] = useState<SphereExecutionStatus>('PASS');
  const [notes, setNotes] = useState('');
  const [executedBy, setExecutedBy] = useState('Operador QA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [startedAt] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('PASS');
    setNotes('');
    setExecutedBy('Operador QA');
    setEvidenceFile(null);
    setError(null);
  }, [open, testCase.id]);

  if (!open) return null;

  const stepLines = parseGherkinStepLines(testCase.steps);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const durationS = Number(((Date.now() - startedAt) / 1000).toFixed(1));
      const result = await apiClient.recordManualExecution(testCase.id, {
        status,
        notes: notes.trim() || undefined,
        executedBy: executedBy.trim() || undefined,
        durationS,
      });

      if (evidenceFile) {
        await apiClient.uploadTestCaseEvidence(testCase.id, evidenceFile);
      }

      onCompleted(result.testCase);
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : tr(t, 'Falha ao registrar execução manual.', 'Failed to record manual execution.');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-exec-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-2">
              <ClipboardCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div className="text-left">
              <h2 id="manual-exec-title" className="text-sm font-extrabold text-slate-800">
                {tr(t, 'Execução Manual', 'Manual Execution')}
              </h2>
              <p className="font-mono text-[10px] text-slate-500">{testCase.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-slate-400"
            aria-label={tr(t, 'Fechar', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-left">
          <p className="mb-4 text-xs font-semibold leading-snug text-slate-700">{testCase.title}</p>

          {testCase.preconditions.trim() && (
            <section className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <h3 className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                {tr(t, 'Pré-condições', 'Preconditions')}
              </h3>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-700">{testCase.preconditions}</pre>
            </section>
          )}

          <section className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              {tr(t, 'Passos', 'Steps')}
            </h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-4">
              {stepLines.map((line, index) => (
                <li key={index} className="text-[11px] leading-snug text-slate-700">
                  {line}
                </li>
              ))}
            </ol>
          </section>

          {testCase.expected_result.trim() && (
            <section className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <h3 className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                {tr(t, 'Resultado esperado', 'Expected result')}
              </h3>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-emerald-900">{testCase.expected_result}</pre>
            </section>
          )}

          <section className="mb-4">
            <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              {tr(t, 'Resultado da execução', 'Execution result')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {MANUAL_STATUS_OPTIONS.map((option) => {
                const selected = status === option.value;
                const color =
                  option.value === 'PASS'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : option.value === 'FAIL'
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : option.value === 'BLOCKED'
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-amber-500 bg-amber-50 text-amber-700';
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-mono font-bold transition-colors ${
                      selected ? color : 'border-slate-200 bg-white text-slate-600 hover:border-sky-400'
                    }`}
                  >
                    {tr(t, option.labelPt, option.labelEn)}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                {tr(t, 'Executado por', 'Executed by')}
              </span>
              <input
                type="text"
                value={executedBy}
                onChange={(e) => setExecutedBy(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                {tr(t, 'Evidência (opcional)', 'Evidence (optional)')}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-mono text-slate-700 hover:border-sky-500"
              >
                {evidenceFile?.name ?? tr(t, 'Selecionar arquivo', 'Select file')}
              </button>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
              {tr(t, 'Observações', 'Notes')}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={tr(t, 'Detalhes da execução manual...', 'Manual execution details...')}
              className="resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-mono text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-mono font-bold text-slate-600 hover:border-slate-400 disabled:opacity-50"
          >
            {tr(t, 'Cancelar', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500 bg-violet-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting
              ? tr(t, 'Registrando...', 'Saving...')
              : tr(t, 'Concluir execução manual', 'Complete manual execution')}
          </button>
        </div>
      </div>
    </div>
  );
}
