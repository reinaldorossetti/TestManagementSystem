'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderPlus,
  Link2,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { createTranslator, type Language } from '@/src/utils/i18n';
import type {
  CatalogCaseSummary,
  CatalogProjectSummary,
  TestRunCaseRecord,
  TestRunRecord,
} from '@/src/server/repositories/testRunRepository';
import type {
  CreateTestRunInput,
  TestRunCaseStatus,
  TestRunResultStatus,
} from '@/src/server/validation/testRunSchemas';
import { TestRunForm } from './TestRunForm';
import { TestRunShellHeader, type TestRunAuthUser } from './TestRunShellHeader';

function formatRunStatusLabel(status: string, t: (pt: string, en: string) => string): string {
  switch (status) {
    case 'Draft':
      return t('Rascunho', 'Draft');
    case 'In Progress':
      return t('Em Progresso', 'In Progress');
    case 'Completed':
      return t('Concluído', 'Completed');
    case 'Aborted':
      return t('Abortado', 'Aborted');
    default:
      return status;
  }
}

/**
 * Translates case status for UI display.
 * Section 11: "Rótulos de status na UI: Não Iniciado, Aprovado, Falhou, Bloqueado, Ignorado.
 * A string `Open` não aparece para o operador."
 */
export function formatCaseStatusUiLabel(
  status: TestRunCaseStatus | string,
  t: (pt: string, en: string) => string,
): string {
  switch (status) {
    case 'Passed':
      return t('Aprovado', 'Passed');
    case 'Failed':
      return t('Falhou', 'Failed');
    case 'Blocked':
      return t('Bloqueado', 'Blocked');
    case 'Skipped':
      return t('Ignorado', 'Skipped');
    case 'Open':
    default:
      return t('Não Iniciado', 'Not Started');
  }
}

function getCaseStatusBadgeStyle(status: TestRunCaseStatus | string): string {
  switch (status) {
    case 'Passed':
      return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
    case 'Failed':
      return 'bg-rose-950/80 border-rose-500/50 text-rose-300';
    case 'Blocked':
      return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
    case 'Skipped':
      return 'bg-sky-950/80 border-sky-500/50 text-sky-300';
    default:
      return 'bg-slate-900 border-slate-700 text-slate-300';
  }
}

export const TestRunsWorkspace: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qa_tms_lang');
      if (saved === 'PT' || saved === 'ENG') return saved;
    }
    return 'PT';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qa_tms_lang', language);
    }
  }, [language]);

  const t = useMemo(() => createTranslator(language), [language]);

  const [currentUser, setCurrentUser] = useState<TestRunAuthUser | null>(null);
  const [runs, setRuns] = useState<TestRunRecord[]>([]);
  const [projects, setProjects] = useState<CatalogProjectSummary[]>([]);
  const [foldersByProject, setFoldersByProject] = useState<Record<string, string[]>>({});
  const [catalogCases, setCatalogCases] = useState<CatalogCaseSummary[]>([]);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isCreatingRun, setIsCreatingRun] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sidebar filters
  const [filterMilestone, setFilterMilestone] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Case selector state
  const [selectedFolderToInclude, setSelectedFolderToInclude] = useState<string>('');
  const [checkedCatalogCaseIds, setCheckedCatalogCaseIds] = useState<string[]>([]);
  const [skippedDuplicatesList, setSkippedDuplicatesList] = useState<string[]>([]);

  // Active case result / evidence panel state
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<TestRunResultStatus>('Passed');
  const [resultNotes, setResultNotes] = useState<string>('');
  const [resultDuration, setResultDuration] = useState<string>('');
  const [evidenceMode, setEvidenceMode] = useState<'link' | 'file'>('link');
  const [evidenceLinkUrl, setEvidenceLinkUrl] = useState<string>('');
  const [evidenceLinkTitle, setEvidenceLinkTitle] = useState<string>('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceFileTitle, setEvidenceFileTitle] = useState<string>('');

  // Version update state
  const [isEditingVersion, setIsEditingVersion] = useState<boolean>(false);
  const [versionInput, setVersionInput] = useState<string>('');

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [meRes, runsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/test-runs?includeCatalog=true'),
      ]);
      const meJson = await meRes.json();
      if (meJson.data?.user) {
        setCurrentUser(meJson.data.user);
      }
      if (runsRes.ok) {
        const runsJson = await runsRes.json();
        const loadedRuns: TestRunRecord[] = runsJson.data?.runs ?? [];
        setRuns(loadedRuns);
        if (runsJson.data?.catalog) {
          setProjects(runsJson.data.catalog.projects ?? []);
          setFoldersByProject(runsJson.data.catalog.foldersByProject ?? {});
          setCatalogCases(runsJson.data.catalog.cases ?? []);
        }
        setSelectedRunId((prev) => {
          if (prev && loadedRuns.some((r) => r.id === prev)) return prev;
          return loadedRuns[0]?.id ?? null;
        });
      }
    } catch {
      // Ignore network bootstrap errors
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const projectFoldersForSelectedRun = useMemo(() => {
    if (!selectedRun) return [];
    const rawFolders = foldersByProject[selectedRun.projectId] ?? [];
    // Filter folders that actually contain at least 1 case in catalog
    const foldersWithCases = rawFolders.filter((f) =>
      catalogCases.some((c) => c.folder === f || c.folder.startsWith(`${f}/`)),
    );
    return foldersWithCases.length > 0 ? foldersWithCases : rawFolders;
  }, [selectedRun, foldersByProject, catalogCases]);

  useEffect(() => {
    if (projectFoldersForSelectedRun.length > 0) {
      setSelectedFolderToInclude((prev) =>
        prev && projectFoldersForSelectedRun.includes(prev)
          ? prev
          : projectFoldersForSelectedRun[0],
      );
    } else {
      setSelectedFolderToInclude('');
    }
  }, [projectFoldersForSelectedRun]);

  const catalogCasesInSelectedFolder = useMemo(() => {
    if (!selectedFolderToInclude) return [];
    return catalogCases.filter(
      (c) =>
        c.folder === selectedFolderToInclude ||
        c.folder.startsWith(`${selectedFolderToInclude}/`),
    );
  }, [catalogCases, selectedFolderToInclude]);

  const activeRunCase: TestRunCaseRecord | null = useMemo(() => {
    if (!selectedRun || !activeCaseId) return null;
    return selectedRun.cases.find((c) => c.sourceTestCaseId === activeCaseId) ?? null;
  }, [selectedRun, activeCaseId]);

  const updateRunInState = (updated: TestRunRecord) => {
    setRuns((prev) => {
      const exists = prev.some((r) => r.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((r) => (r.id === updated.id ? updated : r));
    });
    setSelectedRunId(updated.id);
  };

  const handleCreateRun = async (input: CreateTestRunInput) => {
    setFeedbackMsg(null);
    const res = await fetch('/api/test-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || t('Erro ao criar Test Run.', 'Error creating Test Run.'));
    }
    updateRunInState(json.data);
    setIsCreatingRun(false);
    setFeedbackMsg({
      type: 'success',
      text: t('Test Run criado com sucesso.', 'Test Run created successfully.'),
    });
  };

  const handleIncludeFolder = async () => {
    if (!selectedRun || !selectedFolderToInclude) return;
    setFeedbackMsg(null);
    const res = await fetch(`/api/test-runs/${encodeURIComponent(selectedRun.id)}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath: selectedFolderToInclude }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Falha ao incluir pasta.', 'Failed to include folder.'),
      });
      return;
    }
    updateRunInState(json.data.run);
    const dups: string[] = json.data.skippedDuplicates ?? [];
    setSkippedDuplicatesList(dups);
    const dupCount = dups.length;
    setFeedbackMsg({
      type: 'success',
      text:
        dupCount > 0
          ? t(
              `${json.data.addedCount} caso(s) incluído(s). ${dupCount} duplicata(s) ignorada(s).`,
              `${json.data.addedCount} case(s) included. ${dupCount} duplicate(s) skipped.`,
            )
          : t(
              `${json.data.addedCount} caso(s) copiado(s) para o ciclo.`,
              `${json.data.addedCount} case(s) copied into the cycle.`,
            ),
    });
  };

  const handleIncludeCheckedCases = async () => {
    if (!selectedRun || checkedCatalogCaseIds.length === 0) return;
    setFeedbackMsg(null);
    const res = await fetch(`/api/test-runs/${encodeURIComponent(selectedRun.id)}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceTestCaseIds: checkedCatalogCaseIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Falha ao incluir casos.', 'Failed to include cases.'),
      });
      return;
    }
    updateRunInState(json.data.run);
    setCheckedCatalogCaseIds([]);
    setFeedbackMsg({
      type: 'success',
      text: t(
        `${json.data.addedCount} caso(s) incluído(s) no escopo.`,
        `${json.data.addedCount} case(s) included in scope.`,
      ),
    });
  };

  const handleRemoveCase = async (sourceTestCaseId: string) => {
    if (!selectedRun) return;
    setFeedbackMsg(null);
    const res = await fetch(
      `/api/test-runs/${encodeURIComponent(selectedRun.id)}/cases/${encodeURIComponent(sourceTestCaseId)}`,
      { method: 'DELETE' },
    );
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Erro ao remover caso.', 'Error removing case.'),
      });
      return;
    }
    updateRunInState(json.data);
  };

  const handleLifecycleAction = async (action: 'start' | 'complete' | 'abort' | 'reopen') => {
    if (!selectedRun) return;
    setFeedbackMsg(null);
    const res = await fetch(`/api/test-runs/${encodeURIComponent(selectedRun.id)}/${action}`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Ação não permitida.', 'Action not allowed.'),
      });
      return;
    }
    updateRunInState(json.data);
    setFeedbackMsg({
      type: 'success',
      text: t('Status do ciclo atualizado.', 'Cycle status updated.'),
    });
  };

  const handleSaveVersion = async () => {
    if (!selectedRun || !versionInput.trim()) return;
    setFeedbackMsg(null);
    const res = await fetch(`/api/test-runs/${encodeURIComponent(selectedRun.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appVersion: versionInput.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Não foi possível atualizar a versão.', 'Could not update version.'),
      });
      return;
    }
    updateRunInState(json.data);
    setIsEditingVersion(false);
    setFeedbackMsg({
      type: 'success',
      text: t('Versão atualizada com sucesso.', 'Version updated successfully.'),
    });
  };

  const openCasePanel = (runCase: TestRunCaseRecord) => {
    setActiveCaseId(runCase.sourceTestCaseId);
    setResultStatus(
      runCase.status === 'Passed' ||
        runCase.status === 'Failed' ||
        runCase.status === 'Blocked' ||
        runCase.status === 'Skipped'
        ? runCase.status
        : 'Passed',
    );
    setResultNotes(runCase.notes || '');
    setResultDuration(runCase.durationS !== null ? String(runCase.durationS) : '');
    setEvidenceLinkUrl('');
    setEvidenceLinkTitle('');
    setEvidenceFile(null);
    setEvidenceFileTitle('');
  };

  const handleSaveCaseResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun || !activeRunCase) return;
    setFeedbackMsg(null);

    const durationNumber =
      resultDuration.trim().length > 0 ? Number(resultDuration.trim()) : undefined;

    const res = await fetch(
      `/api/test-runs/${encodeURIComponent(selectedRun.id)}/cases/${encodeURIComponent(
        activeRunCase.sourceTestCaseId,
      )}/result`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resultStatus,
          notes: resultNotes,
          ...(durationNumber !== undefined && !Number.isNaN(durationNumber)
            ? { durationS: durationNumber }
            : {}),
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Erro ao gravar resultado.', 'Error recording result.'),
      });
      return;
    }
    updateRunInState(json.data);
    setFeedbackMsg({
      type: 'success',
      text: t(
        `Resultado salvo para ${activeRunCase.badgeSnapshot}.`,
        `Result saved for ${activeRunCase.badgeSnapshot}.`,
      ),
    });
  };

  const handleSaveLinkEvidence = async () => {
    if (!selectedRun || !activeRunCase || !evidenceLinkUrl.trim()) return;
    setFeedbackMsg(null);
    const res = await fetch(
      `/api/test-runs/${encodeURIComponent(selectedRun.id)}/cases/${encodeURIComponent(
        activeRunCase.sourceTestCaseId,
      )}/evidence`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: evidenceLinkUrl.trim(),
          title: evidenceLinkTitle.trim() || undefined,
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text: json.error || t('Erro ao salvar link de evidência.', 'Error saving evidence link.'),
      });
      return;
    }
    updateRunInState(json.data.run);
    setEvidenceLinkUrl('');
    setEvidenceLinkTitle('');
    setFeedbackMsg({
      type: 'success',
      text: t('Link de evidência salvo no ciclo.', 'Evidence link saved in cycle.'),
    });
  };

  const handleSaveFileEvidence = async () => {
    if (!selectedRun || !activeRunCase || !evidenceFile) return;
    setFeedbackMsg(null);
    const formData = new FormData();
    formData.append('file', evidenceFile);
    if (evidenceFileTitle.trim()) {
      formData.append('title', evidenceFileTitle.trim());
    }

    const res = await fetch(
      `/api/test-runs/${encodeURIComponent(selectedRun.id)}/cases/${encodeURIComponent(
        activeRunCase.sourceTestCaseId,
      )}/evidence`,
      {
        method: 'POST',
        body: formData,
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setFeedbackMsg({
        type: 'error',
        text:
          json.error || t('Erro ao anexar arquivo de evidência.', 'Error attaching evidence file.'),
      });
      return;
    }
    updateRunInState(json.data.run);
    setEvidenceFile(null);
    setEvidenceFileTitle('');
    setFeedbackMsg({
      type: 'success',
      text: t('Arquivo de evidência salvo no ciclo.', 'Evidence file saved in cycle.'),
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans select-none antialiased">
      <TestRunShellHeader
        activeSubRoute="runs"
        language={language}
        setLanguage={setLanguage}
        currentUser={currentUser}
        t={t}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121826] border border-slate-800 rounded-2xl p-4">
          <div>
            <h2 className="text-base font-extrabold text-white">
              {t('Gestão de Test Runs (Ciclos de Execução)', 'Test Runs Management (Execution Cycles)')}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {t(
                'Monte ciclos isolados a partir do catálogo TMS e registre resultados por versão, plataforma e browser',
                'Build isolated cycles from the TMS catalog and record results by version, platform, and browser',
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/test-runs/scorecard"
              data-testid="open-scorecard-page-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-sky-400 transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('Ver Scorecard', 'View Scorecard')}</span>
            </Link>

            <button
              type="button"
              data-testid="new-test-run-btn"
              onClick={() => setIsCreatingRun((prev) => !prev)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] border border-slate-800 hover:border-sky-500 text-xs font-mono font-black text-white uppercase tracking-wider cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('Novo Test Run', 'New Test Run')}</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div
            role="status"
            data-testid="test-runs-feedback"
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {isCreatingRun && (
          <TestRunForm
            projects={
              projects.length > 0
                ? projects
                : [
                    {
                      id: 'PROJ-DEFAULT',
                      name: 'Contacard Mobile',
                      platform: 'Mobile',
                      details: null,
                    },
                  ]
            }
            onSubmit={handleCreateRun}
            onCancel={() => setIsCreatingRun(false)}
            t={t}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: List of Runs */}
          <aside className="lg:col-span-4 bg-[#121826] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-300">
                {t('Ciclos Cadastrados', 'Registered Cycles')} ({runs.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                data-testid="runs-filter-milestone"
                value={filterMilestone}
                onChange={(e) => setFilterMilestone(e.target.value)}
                placeholder={t('Filtrar milestone...', 'Filter milestone...')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-white focus:outline-none focus:border-sky-500"
              />
              <select
                data-testid="runs-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">{t('Todos os Status', 'All Statuses')}</option>
                <option value="Draft">{t('Rascunho', 'Draft')}</option>
                <option value="In Progress">{t('Em Progresso', 'In Progress')}</option>
                <option value="Completed">{t('Concluído', 'Completed')}</option>
                <option value="Aborted">{t('Abortado', 'Aborted')}</option>
              </select>
            </div>

            {runs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-mono">
                {t(
                  'Nenhum Test Run criado ainda. Clique em "Novo Test Run" para iniciar.',
                  'No Test Runs created yet. Click "New Test Run" to start.',
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[650px] overflow-y-auto pr-1">
                {runs
                  .filter((r) => {
                    if (
                      filterMilestone.trim() &&
                      !r.milestone.toLowerCase().includes(filterMilestone.trim().toLowerCase())
                    ) {
                      return false;
                    }
                    if (filterStatus && r.status !== filterStatus) {
                      return false;
                    }
                    return true;
                  })
                  .map((r) => {
                  const isSelected = r.id === selectedRunId;
                  const passedCount = r.cases.filter((c) => c.status === 'Passed').length;
                  const failedCount = r.cases.filter((c) => c.status === 'Failed').length;

                  return (
                    <div
                      key={r.id}
                      data-testid={`test-run-list-item-${r.id}`}
                      onClick={() => {
                        setSelectedRunId(r.id);
                        setActiveCaseId(null);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-slate-900 border-[#FF6600] ring-1 ring-[#FF6600]/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-sky-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white leading-snug">{r.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                          {formatRunStatusLabel(r.status, t)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <span className="text-[#FF6600] font-bold">{r.appVersion}</span>
                        <span>•</span>
                        <span>{r.platform}</span>
                        <span>•</span>
                        <span>{r.environment}</span>
                        {r.browserOrDevice && (
                          <>
                            <span>•</span>
                            <span>{r.browserOrDevice}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800/80 text-slate-400">
                        <span>{r.milestone}</span>
                        <span>
                          {r.cases.length} {t('casos', 'cases')} ({passedCount}✔ / {failedCount}✖)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Main Detail Panel */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            {!selectedRun ? (
              <div className="bg-[#121826] border border-slate-800 rounded-2xl p-10 text-center text-xs font-mono text-slate-400">
                {t(
                  'Selecione um Test Run na lista ao lado ou crie um novo ciclo.',
                  'Select a Test Run from the list or create a new cycle.',
                )}
              </div>
            ) : (
              <>
                {/* Run Configuration & Lifecycle Card */}
                <div
                  data-testid="test-run-detail-card"
                  className="bg-[#121826] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          data-testid="selected-run-name"
                          className="text-lg font-extrabold text-white"
                        >
                          {selectedRun.name}
                        </h3>
                        <span
                          data-testid="selected-run-status"
                          className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#FF6600]/15 border border-[#FF6600]/40 text-[#FF6600]"
                        >
                          {formatRunStatusLabel(selectedRun.status, t)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300 mt-1">
                        <span
                          data-testid="selected-run-version"
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[#FF6600] font-bold"
                        >
                          {selectedRun.appVersion}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {selectedRun.platform}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {selectedRun.environment}
                        </span>
                        {selectedRun.browserOrDevice && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            {selectedRun.browserOrDevice}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {selectedRun.milestone}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {selectedRun.suiteType}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {selectedRun.mode}
                        </span>
                      </div>
                    </div>

                    {/* Lifecycle & Version Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid="edit-run-version-btn"
                        onClick={() => {
                          setVersionInput(selectedRun.appVersion);
                          setIsEditingVersion((v) => !v);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-slate-200 cursor-pointer"
                      >
                        {t('Alterar Versão', 'Change Version')}
                      </button>

                      {selectedRun.status === 'Draft' && (
                        <button
                          type="button"
                          data-testid="start-run-btn"
                          onClick={() => handleLifecycleAction('start')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-white cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{t('Iniciar Ciclo', 'Start Cycle')}</span>
                        </button>
                      )}

                      {selectedRun.status === 'In Progress' &&
                        (currentUser?.role === 'analyst' || currentUser?.role === 'admin') && (
                          <>
                            <button
                              type="button"
                              data-testid="complete-run-btn"
                              onClick={() => handleLifecycleAction('complete')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-white cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('Encerrar Ciclo', 'Complete Cycle')}</span>
                            </button>

                            <button
                              type="button"
                              data-testid="abort-run-btn"
                              onClick={() => handleLifecycleAction('abort')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-white cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{t('Abortar Ciclo', 'Abort Cycle')}</span>
                            </button>
                          </>
                        )}

                      {(selectedRun.status === 'Completed' || selectedRun.status === 'Aborted') &&
                        currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            data-testid="reopen-run-btn"
                            onClick={() => handleLifecycleAction('reopen')}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-white cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t('Reabrir Ciclo', 'Reopen Cycle')}</span>
                          </button>
                        )}
                    </div>
                  </div>

                  {isEditingVersion && (
                    <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        data-testid="update-version-input"
                        value={versionInput}
                        onChange={(e) => setVersionInput(e.target.value)}
                        placeholder="2.5.1"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                      />
                      <button
                        type="button"
                        data-testid="save-updated-version-btn"
                        onClick={handleSaveVersion}
                        className="px-3 py-1.5 rounded-lg bg-[#FF6600] text-white text-xs font-mono font-bold border border-slate-800 hover:border-sky-500 cursor-pointer"
                      >
                        {t('Salvar Versão', 'Save Version')}
                      </button>
                    </div>
                  )}

                  {/* Case Selector from Catalog (Section 7.2) */}
                  {(selectedRun.status === 'Draft' || selectedRun.status === 'In Progress') && (
                    <div
                      data-testid="test-run-case-selector"
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                          <FolderPlus className="w-4 h-4 text-[#FF6600]" />
                          {t(
                            'Seletor de Casos do Catálogo (Somente Leitura)',
                            'Catalog Case Selector (Read-Only)',
                          )}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {t('Projeto:', 'Project:')} {selectedRun.projectName}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={t('Selecionar pasta ou feature', 'Select folder or feature')}
                          data-testid="selector-folder-select"
                          value={selectedFolderToInclude}
                          onChange={(e) => setSelectedFolderToInclude(e.target.value)}
                          className="flex-1 min-w-[240px] bg-slate-900 border border-slate-800 hover:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                        >
                          {projectFoldersForSelectedRun.map((folder) => (
                            <option key={folder} value={folder}>
                              {folder}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          data-testid="include-folder-cases-btn"
                          onClick={handleIncludeFolder}
                          className="px-4 py-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-white cursor-pointer"
                        >
                          {t('Incluir Pasta / Feature', 'Include Folder / Feature')}
                        </button>
                      </div>

                      {catalogCasesInSelectedFolder.length > 0 && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-slate-400">
                              {t(
                                `Casos disponíveis na pasta (${catalogCasesInSelectedFolder.length}):`,
                                `Available cases in folder (${catalogCasesInSelectedFolder.length}):`,
                              )}
                            </span>
                            {checkedCatalogCaseIds.length > 0 && (
                              <button
                                type="button"
                                data-testid="include-selected-cases-btn"
                                onClick={handleIncludeCheckedCases}
                                className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 border border-slate-800 hover:border-sky-400 text-[11px] font-mono font-bold text-white cursor-pointer"
                              >
                                {t(
                                  `Incluir Marcados (${checkedCatalogCaseIds.length})`,
                                  `Include Checked (${checkedCatalogCaseIds.length})`,
                                )}
                              </button>
                            )}
                          </div>

                          <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                            {catalogCasesInSelectedFolder.map((cc) => {
                              const checked = checkedCatalogCaseIds.includes(cc.id);
                              return (
                                <label
                                  key={cc.id}
                                  data-testid={`selector-case-item-${cc.id}`}
                                  className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    data-testid={`selector-case-checkbox-${cc.id}`}
                                    checked={checked}
                                    onChange={(e) => {
                                      setCheckedCatalogCaseIds((prev) =>
                                        e.target.checked
                                          ? [...prev, cc.id]
                                          : prev.filter((id) => id !== cc.id),
                                      );
                                    }}
                                  />
                                  <span className="font-mono font-bold text-[#FF6600]">
                                    {cc.id}
                                  </span>
                                  <span className="truncate">{cc.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {skippedDuplicatesList.length > 0 && (
                        <div
                          data-testid="skipped-duplicates-notice"
                          className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[11px] font-mono text-amber-300"
                        >
                          {t('Duplicatas ignoradas:', 'Skipped duplicates:')}{' '}
                          {skippedDuplicatesList.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Included Cases List */}
                <div className="bg-[#121826] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-extrabold text-white font-mono uppercase">
                      {t('Casos do Ciclo (Snapshot Isolado)', 'Cycle Cases (Isolated Snapshot)')} (
                      {selectedRun.cases.length})
                    </h4>
                  </div>

                  {selectedRun.cases.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-slate-400">
                      {t(
                        'Nenhum caso copiado para este Test Run ainda. Use o seletor acima para incluir uma pasta ou casos.',
                        'No cases copied into this Test Run yet. Use the selector above to include a folder or cases.',
                      )}
                    </div>
                  ) : (
                    <div
                      data-testid="test-run-cases-list"
                      className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1"
                    >
                      {selectedRun.cases.map((rc) => {
                        const isCaseSelected = activeCaseId === rc.sourceTestCaseId;
                        return (
                          <div
                            key={rc.id}
                            data-testid={`test-run-case-row-${rc.sourceTestCaseId}`}
                            className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                              isCaseSelected
                                ? 'bg-slate-900 border-[#FF6600]'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                data-testid={`test-run-case-badge-${rc.sourceTestCaseId}`}
                                className="px-2 py-1 rounded bg-[#FF6600]/15 border border-[#FF6600]/40 text-[#FF6600] font-mono font-bold text-xs shrink-0"
                              >
                                {rc.badgeSnapshot}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  data-testid={`test-run-case-title-${rc.sourceTestCaseId}`}
                                  className="text-xs font-bold text-white truncate"
                                >
                                  {rc.titleSnapshot}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400 truncate">
                                  {rc.folderSnapshot}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                data-testid={`test-run-case-status-${rc.sourceTestCaseId}`}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border ${getCaseStatusBadgeStyle(
                                  rc.status,
                                )}`}
                              >
                                {formatCaseStatusUiLabel(rc.status, t)}
                              </span>

                              <button
                                type="button"
                                data-testid={`open-case-result-btn-${rc.sourceTestCaseId}`}
                                onClick={() => openCasePanel(rc)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-sky-400 cursor-pointer"
                              >
                                {t('Registrar Resultado', 'Record Result')}
                              </button>

                              {rc.status === 'Open' &&
                                (selectedRun.status === 'Draft' ||
                                  selectedRun.status === 'In Progress') && (
                                  <button
                                    type="button"
                                    data-testid={`remove-case-btn-${rc.sourceTestCaseId}`}
                                    onClick={() => handleRemoveCase(rc.sourceTestCaseId)}
                                    title={t('Remover caso', 'Remove case')}
                                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500 text-slate-400 hover:text-rose-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Result & Evidence Recording Panel (Section 7.3) */}
                {activeRunCase && (
                  <div
                    data-testid="case-result-panel"
                    className="bg-[#121826] border border-[#FF6600]/50 rounded-2xl p-5 flex flex-col gap-5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#FF6600]">
                          {activeRunCase.badgeSnapshot}
                        </span>
                        <h4 className="text-sm font-extrabold text-white">
                          {activeRunCase.titleSnapshot}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveCaseId(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono text-slate-400 cursor-pointer"
                      >
                        {t('Fechar', 'Close')}
                      </button>
                    </div>

                    <form onSubmit={handleSaveCaseResult} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-mono font-bold text-slate-300">
                          {t('Resultado do Caso *', 'Case Result *')}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(
                            [
                              { value: 'Passed', pt: 'Aprovado', en: 'Passed' },
                              { value: 'Failed', pt: 'Falhou', en: 'Failed' },
                              { value: 'Blocked', pt: 'Bloqueado', en: 'Blocked' },
                              { value: 'Skipped', pt: 'Ignorado', en: 'Skipped' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              data-testid={`result-status-${opt.value}`}
                              onClick={() => setResultStatus(opt.value)}
                              className={`py-2 px-3 rounded-xl font-mono font-bold text-xs border cursor-pointer transition-all ${
                                resultStatus === opt.value
                                  ? 'bg-[#FF6600] text-white border-[#FF6600]'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-sky-500'
                              }`}
                            >
                              {t(opt.pt, opt.en)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                          <label
                            htmlFor="result-notes"
                            className="text-xs font-mono font-bold text-slate-300"
                          >
                            {t('Notas da Execução', 'Execution Notes')}{' '}
                            {(resultStatus === 'Failed' || resultStatus === 'Blocked') &&
                              t('(mín. 10 caracteres *)', '(min. 10 chars *)')}
                          </label>
                          <textarea
                            id="result-notes"
                            data-testid="result-notes-input"
                            rows={3}
                            maxLength={4000}
                            value={resultNotes}
                            onChange={(e) => setResultNotes(e.target.value)}
                            placeholder={t(
                              'Descreva o comportamento observado ou motivo da falha/bloqueio...',
                              'Describe observed behavior or reason for failure/block...',
                            )}
                            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl p-3 text-xs text-slate-100 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="result-duration"
                            className="text-xs font-mono font-bold text-slate-300"
                          >
                            {t('Duração em segundos (opcional)', 'Duration in seconds (optional)')}
                          </label>
                          <input
                            id="result-duration"
                            data-testid="result-duration-input"
                            type="number"
                            min={0}
                            max={86400}
                            step="0.1"
                            value={resultDuration}
                            onChange={(e) => setResultDuration(e.target.value)}
                            placeholder="12.5"
                            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          data-testid="save-case-result-btn"
                          className="px-5 py-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] border border-slate-800 hover:border-sky-500 text-xs font-mono font-black text-white uppercase cursor-pointer"
                        >
                          {t('Salvar Resultado', 'Save Result')}
                        </button>
                      </div>
                    </form>

                    {/* Evidence Section Exclusive to TestRunCase */}
                    <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {t(
                            'Evidências do Caso neste Ciclo (Isoladas do Catálogo)',
                            'Case Evidence in this Cycle (Isolated from Catalog)',
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid="evidence-mode-link-btn"
                            onClick={() => setEvidenceMode('link')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                              evidenceMode === 'link'
                                ? 'bg-[#FF6600] text-white border-[#FF6600]'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-sky-500'
                            }`}
                          >
                            <Link2 className="w-3 h-3 inline mr-1" />
                            {t('Link', 'Link')}
                          </button>
                          <button
                            type="button"
                            data-testid="evidence-mode-file-btn"
                            onClick={() => setEvidenceMode('file')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                              evidenceMode === 'file'
                                ? 'bg-[#FF6600] text-white border-[#FF6600]'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-sky-500'
                            }`}
                          >
                            <Upload className="w-3 h-3 inline mr-1" />
                            {t('Arquivo', 'File')}
                          </button>
                        </div>
                      </div>

                      {evidenceMode === 'link' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="url"
                            data-testid="evidence-link-url-input"
                            value={evidenceLinkUrl}
                            onChange={(e) => setEvidenceLinkUrl(e.target.value)}
                            placeholder="https://jira.empresa.com/browse/BUG-101"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                          />
                          <input
                            type="text"
                            data-testid="evidence-link-title-input"
                            value={evidenceLinkTitle}
                            onChange={(e) => setEvidenceLinkTitle(e.target.value)}
                            placeholder={t('Título opcional', 'Optional title')}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                          />
                          <button
                            type="button"
                            data-testid="save-link-evidence-btn"
                            onClick={handleSaveLinkEvidence}
                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 border border-slate-800 hover:border-sky-400 text-xs font-mono font-bold text-white cursor-pointer"
                          >
                            {t('Salvar link', 'Save link')}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            data-testid="evidence-file-input"
                            onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
                          />
                          <input
                            type="text"
                            data-testid="evidence-file-title-input"
                            value={evidenceFileTitle}
                            onChange={(e) => setEvidenceFileTitle(e.target.value)}
                            placeholder={t('Título opcional', 'Optional title')}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                          />
                          <button
                            type="button"
                            data-testid="save-file-evidence-btn"
                            onClick={handleSaveFileEvidence}
                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 border border-slate-800 hover:border-sky-400 text-xs font-mono font-bold text-white cursor-pointer"
                          >
                            {t('Salvar arquivo', 'Save file')}
                          </button>
                        </div>
                      )}

                      {activeRunCase.evidence.length > 0 && (
                        <div
                          data-testid="run-case-evidence-list"
                          className="flex flex-col gap-1.5 pt-2"
                        >
                          {activeRunCase.evidence.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                            >
                              <span className="text-slate-200 font-bold">{ev.title}</span>
                              {ev.externalUrl ? (
                                <a
                                  href={ev.externalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  <span>{ev.externalUrl}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400">{ev.fileName}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Events Audit Trail */}
                <div className="bg-[#121826] border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <Clock className="w-4 h-4 text-[#FF6600]" />
                    <h4 className="text-xs font-mono font-bold uppercase text-slate-300">
                      {t('Trilha de Eventos do Ciclo', 'Cycle Event Trail')} (
                      {selectedRun.events.length})
                    </h4>
                  </div>
                  <div
                    data-testid="test-run-events-list"
                    className="flex flex-col gap-1.5 max-h-48 overflow-y-auto text-xs font-mono"
                  >
                    {selectedRun.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-[#FF6600]">
                            {ev.action}
                          </span>
                          <span className="text-slate-300">{ev.summary}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {ev.time.slice(0, 19).replace('T', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

