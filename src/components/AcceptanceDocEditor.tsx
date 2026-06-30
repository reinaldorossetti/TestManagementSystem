'use client';

import { useCallback, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  Clock,
  Edit3,
  FileText,
  GitBranch,
  History,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AcceptanceCriteriaMarkdown } from '@/src/components/AcceptanceCriteriaMarkdown';
import { apiClient, ApiClientError } from '@/src/lib/api/client';
import type { DbFolderAcceptanceDoc, DbFolderAcceptanceDocHistory } from '@/src/utils/sqliteEngine';

interface AcceptanceDocEditorProps {
  folderPath: string;
  featureLabel: string;
  initialDoc: DbFolderAcceptanceDoc;
  initialMarkdown: string;
  initialHistory: DbFolderAcceptanceDocHistory[];
}

const ACTION_LABELS: Record<string, string> = {
  imported: 'Importado',
  edited: 'Editado',
};

const ACTION_STYLES: Record<string, string> = {
  imported: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/20',
  edited: 'bg-sky-500/15 text-sky-700 ring-sky-500/20',
};

export function AcceptanceDocEditor({
  folderPath,
  featureLabel,
  initialDoc,
  initialMarkdown,
  initialHistory,
}: AcceptanceDocEditorProps) {
  const [doc, setDoc] = useState(initialDoc);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [draft, setDraft] = useState(initialMarkdown);
  const [history, setHistory] = useState(initialHistory);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const lineCount = markdown.split('\n').length;
  const hasTables = /^\|.+\|$/m.test(markdown);

  const handleStartEdit = () => {
    setDraft(markdown);
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraft(markdown);
    setError(null);
    setIsEditing(false);
  };

  const refreshHistory = useCallback(async () => {
    const entries = await apiClient.getAcceptanceDocHistory(folderPath);
    setHistory(entries);
  }, [folderPath]);

  const handleSave = async () => {
    if (draft === markdown) {
      setError('Nenhuma alteração detectada no documento.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await apiClient.updateAcceptanceDocContent(folderPath, draft);
      setDoc(result.doc);
      setMarkdown(draft);
      setIsEditing(false);
      await refreshHistory();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao salvar o documento.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir os critérios de aceite de "${featureLabel}"?\n\nO arquivo será removido do repositório e a referência será retirada de todos os casos de teste desta pasta.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.deleteAcceptanceDoc(folderPath);
      router.push('/tms');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao excluir o documento.';
      setError(message);
      setIsDeleting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.18) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Hero header */}
        <header className="mb-8 overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="border-b border-slate-200/70 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-sky-200">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  Critérios de Aceite
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {featureLabel}
                </h1>
                <p className="mt-2 font-mono text-xs text-slate-400">{doc.repo_relative_path}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-4 py-2 text-xs font-mono font-bold text-white backdrop-blur-sm transition-all hover:border-sky-400 hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-4 py-2 text-xs font-mono font-bold text-rose-200 transition-all hover:border-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-4 py-2 text-xs font-mono font-bold text-slate-200 transition-all hover:border-slate-500 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2 text-xs font-mono font-bold text-white shadow-lg shadow-sky-900/30 transition-all hover:bg-sky-400 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </>
                )}
                <Link
                  href="/tms"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white px-4 py-2 text-xs font-mono font-bold text-slate-800 transition-all hover:border-sky-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  TMS
                </Link>
              </div>
            </div>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-3 px-6 py-4 sm:px-8">
            <MetaChip icon={<Clock className="h-3.5 w-3.5" />} label="Atualizado" value={doc.updated_at} />
            <MetaChip icon={<FileText className="h-3.5 w-3.5" />} label="Linhas" value={String(lineCount)} />
            <MetaChip icon={<GitBranch className="h-3.5 w-3.5" />} label="Versões" value={String(history.length)} />
            {hasTables && (
              <MetaChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Tabelas" value="GFM" accent />
            )}
          </div>
        </header>

        {/* Document canvas */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.04]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-3 sm:px-8">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-slate-400">
              {isEditing ? 'Modo de edição — Markdown' : 'Visualização do documento'}
            </p>
          </div>

          <div className="px-5 py-8 sm:px-10 sm:py-10">
            {isEditing ? (
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-[480px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                spellCheck={false}
              />
            ) : (
              <div className="rounded-2xl bg-gradient-to-b from-white to-slate-50/50 p-1">
                <AcceptanceCriteriaMarkdown markdown={markdown} />
              </div>
            )}

            {error && (
              <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-mono text-red-700">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* History timeline */}
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 sm:px-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Histórico de Mudanças</h2>
              <p className="text-[11px] text-slate-500">Rastreabilidade de importações e edições</p>
            </div>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-600">
              {history.length}
            </span>
          </div>

          <div className="px-6 py-5 sm:px-8">
            {history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhuma alteração registrada ainda.
              </p>
            ) : (
              <ol className="relative space-y-0">
                {history.map((entry, index) => (
                  <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < history.length - 1 && (
                      <span className="absolute left-[11px] top-7 h-[calc(100%-12px)] w-px bg-gradient-to-b from-sky-200 to-transparent" />
                    )}
                    <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow-md shadow-sky-500/30 ring-2 ring-sky-100">
                      <span className="h-2 w-2 rounded-full bg-white" />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 transition-colors hover:border-sky-100 hover:bg-sky-50/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wide ring-1 ${
                              ACTION_STYLES[entry.action] ?? 'bg-slate-200 text-slate-700 ring-slate-300/30'
                            }`}
                          >
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{entry.user}</span>
                        </div>
                        <time className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
                          <Clock className="h-3 w-3" />
                          {entry.time}
                        </time>
                      </div>
                      {entry.summary && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.summary}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetaChip({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
        accent
          ? 'border-sky-200 bg-sky-50 text-sky-800'
          : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      <span className={accent ? 'text-sky-600' : 'text-slate-400'}>{icon}</span>
      <div className="leading-tight">
        <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}
