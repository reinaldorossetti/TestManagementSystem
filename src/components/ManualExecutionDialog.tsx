'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Link2, Loader2, Minus, Plus, Upload, X } from 'lucide-react';
import { apiClient, ApiClientError } from '@/src/lib/api/client';
import type { DbTestCaseSphere, SphereExecutionStatus } from '@/src/utils/sqliteEngine';
import {
  getManualExecutionDisplayTitle,
  getTestCaseDisplayFeature,
  getTestCaseDisplayId,
} from '@/src/utils/featureLoader';
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

type EvidenceMode = 'file' | 'link';

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
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('file');
  const [evidenceLinkUrl, setEvidenceLinkUrl] = useState('');
  const [evidenceLinkTitle, setEvidenceLinkTitle] = useState('');
  const [evidenceLinkSaved, setEvidenceLinkSaved] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [textScale, setTextScale] = useState<1 | 2 | 3>(1);
  const [startedAt] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('PASS');
    setNotes('');
    setExecutedBy('Operador QA');
    setEvidenceFile(null);
    setEvidenceMode('file');
    setEvidenceLinkUrl('');
    setEvidenceLinkTitle('');
    setEvidenceLinkSaved(false);
    setSavingEvidence(false);
    setError(null);
    setTextScale(1);
  }, [open, testCase.id]);

  if (!open) return null;

  const stepLines = parseGherkinStepLines(testCase.steps);
  const displayFeature = getTestCaseDisplayFeature(testCase.id);
  const displayId = getTestCaseDisplayId(testCase.id, testCase.title);
  const displayScenarioTitle = getManualExecutionDisplayTitle(testCase.id, testCase.title);

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

      if (evidenceMode === 'file' && evidenceFile) {
        await apiClient.uploadTestCaseEvidence(testCase.id, evidenceFile);
      }
      if (evidenceMode === 'link' && evidenceLinkUrl.trim() && !evidenceLinkSaved) {
        await apiClient.addTestCaseEvidenceLink(
          testCase.id,
          evidenceLinkUrl.trim(),
          evidenceLinkTitle.trim() || undefined,
        );
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

  const handleSaveEvidenceLink = async () => {
    if (!evidenceLinkUrl.trim() || savingEvidence) return;
    setSavingEvidence(true);
    setError(null);
    try {
      await apiClient.addTestCaseEvidenceLink(
        testCase.id,
        evidenceLinkUrl.trim(),
        evidenceLinkTitle.trim() || undefined,
      );
      setEvidenceLinkSaved(true);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : tr(t, 'Falha ao salvar link.', 'Failed to save link.');
      setError(message);
    } finally {
      setSavingEvidence(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-exec-title"
        data-testid="manual-execution-dialog"
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-2">
              <ClipboardCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div className="text-left">
              <h2 id="manual-exec-title" className="text-[15px] font-extrabold leading-snug text-slate-800">
                {tr(t, 'Execução Manual', 'Manual Execution')}
              </h2>
              <p className="font-mono text-[10px] text-slate-400">{displayId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {tr(t, 'Texto', 'Text')}
            </span>
            <button
              type="button"
              onClick={() => setTextScale((current) => (current === 1 ? 1 : current - 1) as 1 | 2 | 3)}
              disabled={textScale === 1}
              data-testid="manual-execution-text-scale-decrease"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={tr(t, 'Diminuir texto', 'Decrease text')}
              title={tr(t, 'Diminuir texto', 'Decrease text')}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span
              className="min-w-8 text-center font-mono text-[10px] font-bold text-sky-700"
              data-testid="manual-execution-text-scale-value"
              aria-live="polite"
            >
              {textScale}x
            </span>
            <button
              type="button"
              onClick={() => setTextScale((current) => (current === 3 ? 3 : current + 1) as 1 | 2 | 3)}
              disabled={textScale === 3}
              data-testid="manual-execution-text-scale-increase"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={tr(t, 'Aumentar texto', 'Increase text')}
              title={tr(t, 'Aumentar texto até 3x', 'Increase text up to 3x')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-slate-400"
              aria-label={tr(t, 'Fechar', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 text-left"
          data-testid="manual-execution-content"
          style={{ zoom: textScale }}
        >
          <div className="mb-4 border-b border-slate-200 bg-white pb-3 text-left">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded-md border border-sky-200/80 bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-sky-700">
                Feature: {displayFeature}
              </span>
            </div>
            <p className="text-[15px] font-extrabold leading-snug text-slate-800">{displayScenarioTitle}</p>
          </div>

          {testCase.preconditions.trim() && (
            <section className="mb-4 flex flex-col gap-1 text-left">
              <h3 className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                {tr(t, 'Pré-condições', 'Preconditions')}
              </h3>
              <pre className="overflow-x-auto whitespace-pre font-mono text-[11px] leading-normal text-slate-800 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {testCase.preconditions}
              </pre>
            </section>
          )}

          <section className="mb-4 flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left">
            <h3 className="mb-1.5 block text-[10px] font-mono font-extrabold uppercase tracking-wider text-sky-700">
              {tr(t, 'Cenário de Teste / Passos Gherkin BDD', 'Test Scenario / Gherkin BDD Steps')}
            </h3>
            <div className="flex flex-col gap-2">
              {stepLines.map((line, index) => {
                const stepMatch = line.match(/^(Dado que|Dado|Quando|Então|E|Mas|Given|When|Then|And|But)\s+(.*)$/i);
                if (!stepMatch) {
                  return (
                    <div key={index} className="pl-3 font-mono text-[11px] leading-tight text-slate-500">
                      {line}
                    </div>
                  );
                }

                const keyword = stepMatch[1];
                const text = stepMatch[2];
                const keywordClass = ['Dado', 'Given'].includes(keyword)
                  ? 'text-sky-600'
                  : ['Quando', 'When'].includes(keyword)
                    ? 'text-amber-600'
                    : ['Então', 'Then'].includes(keyword)
                      ? 'text-emerald-600'
                      : 'text-[#FF6600]';

                return (
                  <div key={index} className="flex gap-1.5 font-mono text-[11.5px] leading-tight">
                    <span className={`${keywordClass} font-semibold`}>{keyword}</span>
                    <span className="font-medium text-slate-800">{text}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {testCase.expected_result.trim() && (
            <section className="mb-4 flex flex-col gap-1 rounded-xl border border-emerald-200 bg-[#F0FDF4]/65 p-3.5 text-left font-sans leading-normal">
              <h3 className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-700">
                {tr(t, 'Resultado Esperado (Expected Outcome)', 'Expected Outcome')}
              </h3>
              <p className="mt-1 border-l-2 border-emerald-400 pl-1 text-[11.5px] leading-normal text-slate-700 whitespace-pre-wrap">
                {testCase.expected_result}
              </p>
            </section>
          )}

          <section className="mb-4 flex flex-col gap-1 rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 text-left font-sans leading-normal">
            <h3 className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-orange-700">
              {tr(t, 'OBSERVAÇÃO', 'OBSERVATION')}
            </h3>
            <p className="mt-1 whitespace-pre-wrap border-l-2 border-orange-400 pl-1 text-[11.5px] leading-normal text-slate-700">
              {testCase.observation || tr(t, 'Nenhuma observação registrada.', 'No observation registered.')}
            </p>
          </section>

          <section className="mb-4 border-t border-slate-200 pt-4 text-left">
            <h3 className="mb-2 text-[10px] font-mono font-extrabold uppercase tracking-wider text-sky-700">
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

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
            <h3 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              {tr(t, 'Adicionar evidência (teste manual)', 'Add evidence (manual test)')}
            </h3>

            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setEvidenceMode('file')}
                className={`flex-1 rounded-xl border py-2 text-[11px] font-mono font-bold transition-colors ${
                  evidenceMode === 'file'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-600 hover:border-sky-400'
                }`}
                data-testid="manual-evidence-file-mode"
              >
                <Upload className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />
                {tr(t, 'Arquivo', 'File')}
              </button>
              <button
                type="button"
                onClick={() => setEvidenceMode('link')}
                className={`flex-1 rounded-xl border py-2 text-[11px] font-mono font-bold transition-colors ${
                  evidenceMode === 'link'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-600 hover:border-sky-400'
                }`}
                data-testid="manual-evidence-link-mode"
              >
                <Link2 className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />
                {tr(t, 'Link', 'Link')}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
            />

            {evidenceMode === 'file' ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-mono font-bold text-sky-700 transition-colors hover:border-sky-500 hover:bg-sky-50/50 disabled:opacity-50"
                data-testid="manual-evidence-file-picker"
              >
                {evidenceFile?.name ?? tr(t, 'Selecionar imagem ou vídeo', 'Select image or video')}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="url"
                  value={evidenceLinkUrl}
                  onChange={(event) => {
                    setEvidenceLinkUrl(event.target.value);
                    setEvidenceLinkSaved(false);
                  }}
                  placeholder={tr(t, 'https://teams.microsoft.com/...', 'https://teams.microsoft.com/...')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                  data-testid="manual-evidence-link-url"
                />
                <input
                  type="text"
                  value={evidenceLinkTitle}
                  onChange={(event) => {
                    setEvidenceLinkTitle(event.target.value);
                    setEvidenceLinkSaved(false);
                  }}
                  placeholder={tr(t, 'Título opcional', 'Optional title')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                  data-testid="manual-evidence-link-title"
                />
                <button
                  type="button"
                  disabled={savingEvidence || submitting || !evidenceLinkUrl.trim() || evidenceLinkSaved}
                  onClick={() => void handleSaveEvidenceLink()}
                  className="rounded-xl border border-sky-500 bg-sky-600 py-2 text-xs font-mono font-bold text-white hover:bg-sky-700 disabled:opacity-50"
                  data-testid="manual-evidence-save-link"
                >
                  {savingEvidence
                    ? tr(t, 'Salvando...', 'Saving...')
                    : evidenceLinkSaved
                      ? tr(t, 'Link salvo', 'Link saved')
                      : tr(t, 'Salvar link', 'Save link')}
                </button>
              </div>
            )}
          </section>

          <div className="mb-3">
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
