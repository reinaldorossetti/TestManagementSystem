/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  Folder, 
  Plus, 
  Search, 
  Play, 
  PlayCircle, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Database, 
  Code, 
  ExternalLink,
  Layers,
  Terminal,
  Clock,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import type { DbTestCaseSphere, VirtualDatabase } from '../../utils/sqliteEngine';
import { SphereCaseStatusBadge } from '../SphereCaseStatusBadge';
import { ManualExecutionDialog } from '../ManualExecutionDialog';
import { AcceptanceDocEditor } from '../AcceptanceDocEditor';
import { TestCaseEvidenceTab } from '../TestCaseEvidenceTab';
import {
  getTestCaseDisplayId,
  getTestCaseDisplayTitle,
  getTestCaseDisplayFeature,
  getManualExecutionDisplayTitle
} from '../../utils/featureLoader';

interface TmsViewProps {
  sqliteDb: VirtualDatabase;
  setSqliteDb: React.Dispatch<React.SetStateAction<VirtualDatabase>>;
  selectedSphereFolder: string;
  setSelectedSphereFolder: (folder: string) => void;
  selectedSphereTestCaseId: string | null;
  setSelectedSphereTestCaseId: (id: string | null) => void;
  sphereSearchQuery: string;
  setSphereSearchQuery: (query: string) => void;
  sphereTestCaseStatuses: Record<string, string>;
  
  // Custom SQL & Script state
  sphereCustomSqlQuery: Record<string, string>;
  setSphereCustomSqlQuery: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  sphereCustomScriptLanguage: Record<string, string>;
  setSphereCustomScriptLanguage: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Modals state
  manualExecutionDialogOpen: boolean;
  setManualExecutionDialogOpen: (open: boolean) => void;
  isCreatingSphereTestCase: boolean;
  setIsCreatingSphereTestCase: (open: boolean) => void;
  isEditingSphereTestCase: boolean;
  setIsEditingSphereTestCase: (open: boolean) => void;
  
  // Form fields
  formSphereId: string;
  setFormSphereId: (val: string) => void;
  formSphereFolder: string;
  setFormSphereFolder: (val: string) => void;
  formSphereTitle: string;
  setFormSphereTitle: (val: string) => void;
  formSpherePreconditions: string;
  setFormSpherePreconditions: (val: string) => void;
  formSphereSteps: string;
  setFormSphereSteps: (val: string) => void;
  formSphereExpectedResult: string;
  setFormSphereExpectedResult: (val: string) => void;
  formSphereObservation: string;
  setFormSphereObservation: (val: string) => void;
  
  // Handlers
  handleRunSingleTestCaseReal: (testCase: DbTestCaseSphere) => void;
  handleLoadMultipleTestCasesToWorkspace: (cases: DbTestCaseSphere[]) => void;
  handleRunFeatureReal: (tagOverride?: string) => void;
  t: (pt: string, en: string) => string;
}

export const TmsView: React.FC<TmsViewProps> = ({
  sqliteDb,
  setSqliteDb,
  selectedSphereFolder,
  setSelectedSphereFolder,
  selectedSphereTestCaseId,
  setSelectedSphereTestCaseId,
  sphereSearchQuery,
  setSphereSearchQuery,
  sphereTestCaseStatuses,
  sphereCustomSqlQuery,
  setSphereCustomSqlQuery,
  sphereCustomScriptLanguage,
  setSphereCustomScriptLanguage,
  manualExecutionDialogOpen,
  setManualExecutionDialogOpen,
  isCreatingSphereTestCase,
  setIsCreatingSphereTestCase,
  isEditingSphereTestCase,
  setIsEditingSphereTestCase,
  formSphereId,
  setFormSphereId,
  formSphereFolder,
  setFormSphereFolder,
  formSphereTitle,
  setFormSphereTitle,
  formSpherePreconditions,
  setFormSpherePreconditions,
  formSphereSteps,
  setFormSphereSteps,
  formSphereExpectedResult,
  setFormSphereExpectedResult,
  formSphereObservation,
  setFormSphereObservation,
  handleRunSingleTestCaseReal,
  handleLoadMultipleTestCasesToWorkspace,
  handleRunFeatureReal,
  t,
}) => {
  const [activeDetailTab, setActiveDetailTab] = React.useState<'details' | 'evidence' | 'sql' | 'script'>('details');

  // Compute folder list (combining test_folders and unique folder properties from test_cases_sphere)
  const foldersList = useMemo(() => {
    const fromFolders = sqliteDb.test_folders || [];
    const fromCases = (sqliteDb.test_cases_sphere || []).map((c) => c.folder).filter(Boolean);
    const set = new Set([...fromFolders, ...fromCases]);
    return Array.from(set).sort();
  }, [sqliteDb.test_folders, sqliteDb.test_cases_sphere]);

  // Filter test cases by selected folder and search query
  const filteredCases = useMemo(() => {
    let cases = sqliteDb.test_cases_sphere || [];
    if (selectedSphereFolder !== 'all') {
      cases = cases.filter((c) => c.folder === selectedSphereFolder);
    }
    if (sphereSearchQuery.trim()) {
      const q = sphereSearchQuery.toLowerCase().trim();
      cases = cases.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.preconditions && c.preconditions.toLowerCase().includes(q))
      );
    }
    // Sort numerically by ID
    return [...cases].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  }, [sqliteDb.test_cases_sphere, selectedSphereFolder, sphereSearchQuery]);

  // Currently selected case
  const currentCase = useMemo(() => {
    if (!selectedSphereTestCaseId) return filteredCases[0] || null;
    return sqliteDb.test_cases_sphere?.find((c) => c.id === selectedSphereTestCaseId) || filteredCases[0] || null;
  }, [sqliteDb.test_cases_sphere, selectedSphereTestCaseId, filteredCases]);

  // Handle Save (Create / Edit) Test Case
  const handleSaveSphereTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSphereId.trim() || !formSphereTitle.trim()) return;

    const newCase: DbTestCaseSphere = {
      id: formSphereId.trim(),
      folder: formSphereFolder.trim() || 'Workspace Importados',
      title: formSphereTitle.trim(),
      preconditions: formSpherePreconditions.trim(),
      steps: formSphereSteps.trim(),
      expected_result: formSphereExpectedResult.trim(),
      observation: formSphereObservation.trim(),
      created_at: new Date().toISOString(),
    };

    setSqliteDb((prev) => {
      const existing = prev.test_cases_sphere || [];
      const updatedCases = isEditingSphereTestCase
        ? existing.map((c) => (c.id === newCase.id ? { ...c, ...newCase } : c))
        : [...existing, newCase];

      const existingFolders = prev.test_folders || [];
      const updatedFolders = existingFolders.includes(newCase.folder)
        ? existingFolders
        : [...existingFolders, newCase.folder];

      return {
        ...prev,
        test_folders: updatedFolders,
        test_cases_sphere: updatedCases,
      };
    });

    setIsCreatingSphereTestCase(false);
    setIsEditingSphereTestCase(false);
    setSelectedSphereTestCaseId(newCase.id);
  };

  // Handle Delete Test Case
  const handleDeleteSphereTestCase = (id: string) => {
    if (!confirm(t(`Deseja excluir o caso de teste ${id}?`, `Delete test case ${id}?`))) return;
    setSqliteDb((prev) => ({
      ...prev,
      test_cases_sphere: (prev.test_cases_sphere || []).filter((c) => c.id !== id),
    }));
    if (selectedSphereTestCaseId === id) {
      setSelectedSphereTestCaseId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden" data-testid="tms-view-container">
      {/* Top Header / Action Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/terminal';
              }
            }}
            className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border border-slate-800 hover:border-sky-500 flex items-center gap-1.5 cursor-pointer shadow-sm"
            title={t("Voltar ao Terminal Console", "Return to Terminal Console")}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
            {t("Voltar", "Back")}
          </button>
          <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
          <Layers className="w-5 h-5 text-[#FF6600]" />
          <div>
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              {t("Sistema de Gestão de Testes (TMS)", "Test Management System (TMS)")}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {t(`${filteredCases.length} casos de teste visíveis`, `${filteredCases.length} test cases visible`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          {/* Folder Filter Selector */}
          <select
            value={selectedSphereFolder}
            onChange={(e) => setSelectedSphereFolder(e.target.value)}
            data-testid="tms-folder-select"
            className="bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#FF6600]"
          >
            <option value="all">📂 {t("Todas as Pastas", "All Folders")}</option>
            {foldersList.map((folder) => (
              <option key={folder} value={folder}>
                📁 {folder}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={sphereSearchQuery}
              onChange={(e) => setSphereSearchQuery(e.target.value)}
              placeholder={t("Buscar por ID ou título...", "Search by ID or title...")}
              data-testid="tms-search-input"
              className="bg-slate-950 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#FF6600] w-44"
            />
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={() => {
              setFormSphereId(`TC-${String((sqliteDb.test_cases_sphere?.length || 0) + 1).padStart(2, '0')}`);
              setFormSphereFolder(selectedSphereFolder !== 'all' ? selectedSphereFolder : 'Workspace Importados');
              setFormSphereTitle('');
              setFormSpherePreconditions('');
              setFormSphereSteps('');
              setFormSphereExpectedResult('Cenário executado com sucesso.');
              setFormSphereObservation('');
              setIsCreatingSphereTestCase(true);
            }}
            data-testid="tms-create-case-button"
            className="bg-[#FF6600] hover:bg-[#e05500] text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-md shadow-[#FF6600]/10"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("Criar Caso", "Create Case")}
          </button>

          <button
            type="button"
            onClick={() => handleLoadMultipleTestCasesToWorkspace(filteredCases)}
            data-testid="tms-run-plural-button"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
            title={t("Executar todos os casos da pasta/feature no Terminal Robot", "Run all folder/feature cases in Robot Terminal")}
          >
            <Play className="w-3.5 h-3.5" />
            {t("Executar Testes", "Execute Tests")}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Cases List, Right Case Detail */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Test Cases List */}
        <div className="w-full lg:w-[420px] bg-slate-900/60 border-r border-slate-800 flex flex-col p-4 overflow-y-auto shrink-0 gap-3">
          {filteredCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
              <Database className="w-8 h-8 text-slate-600 mb-1" />
              <p>{t("Nenhum caso de teste encontrado nesta pasta.", "No test cases found in this folder.")}</p>
              <p className="text-[10px] text-slate-600">
                {t("Clique em 'Armazenar Testes' no Workspace ou em 'Criar Caso' para adicionar.", "Click 'Store Tests' in Workspace or 'Create Case' to add.")}
              </p>
            </div>
          ) : (
            filteredCases.map((tc) => {
              const isSelected = currentCase?.id === tc.id;
              const displayId = getTestCaseDisplayId(tc.id, tc.title);
              const displayTitle = getTestCaseDisplayTitle(tc.id, tc.title);

              return (
                <div
                  key={tc.id}
                  onClick={() => setSelectedSphereTestCaseId(tc.id)}
                  data-testid={`tms-case-card-${tc.id}`}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                    isSelected
                      ? 'bg-slate-900 border-[#FF6600] shadow-lg shadow-[#FF6600]/5'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[#FF6600] font-mono text-[10px] font-bold border border-slate-700/60">
                      {displayId}
                    </span>
                    <SphereCaseStatusBadge testCase={tc} localStatuses={sphereTestCaseStatuses} t={t} variant="dark" />
                  </div>

                  <h4 className="font-semibold text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {displayTitle}
                  </h4>

                  {tc.preconditions && (
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      {tc.preconditions}
                    </p>
                  )}

                  <div className="flex justify-end pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunSingleTestCaseReal(tc);
                      }}
                      data-testid={`tms-run-card-button-${tc.id}`}
                      className="text-[10px] text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 px-2 py-0.5 rounded font-mono transition-all flex items-center gap-1 font-bold"
                    >
                      <PlayCircle className="w-3 h-3 text-emerald-400" />
                      {t("Execução", "Run")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Case Detail */}
        {currentCase ? (
          <div className="flex-1 bg-slate-950 flex flex-col min-h-0 overflow-y-auto p-6 gap-6">
            {/* Header Detail Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded bg-[#FF6600]/10 text-[#FF6600] font-mono text-xs font-black border border-[#FF6600]/20">
                      {getTestCaseDisplayId(currentCase.id, currentCase.title)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      📁 {currentCase.folder}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 leading-snug">
                    {getTestCaseDisplayTitle(currentCase.id, currentCase.title)}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <SphereCaseStatusBadge testCase={currentCase} localStatuses={sphereTestCaseStatuses} t={t} variant="dark" />
                  <button
                    type="button"
                    onClick={() => {
                      setFormSphereId(currentCase.id);
                      setFormSphereFolder(currentCase.folder);
                      setFormSphereTitle(currentCase.title);
                      setFormSpherePreconditions(currentCase.preconditions || '');
                      setFormSphereSteps(currentCase.steps || '');
                      setFormSphereExpectedResult(currentCase.expected_result || '');
                      setFormSphereObservation(currentCase.observation || '');
                      setIsEditingSphereTestCase(true);
                    }}
                    data-testid="tms-edit-case-button"
                    className="p-1.5 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                    title={t("Editar Caso", "Edit Case")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSphereTestCase(currentCase.id)}
                    data-testid="tms-delete-case-button"
                    className="p-1.5 text-rose-400 hover:text-rose-300 border border-rose-900/40 hover:border-rose-700 rounded-lg transition-all"
                    title={t("Excluir Caso", "Delete Case")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detail Navigation Tabs */}
              <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('details')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                    activeDetailTab === 'details'
                      ? 'bg-[#FF6600] text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {t("Detalhes do Caso", "Case Details")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('evidence')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                    activeDetailTab === 'evidence'
                      ? 'bg-[#FF6600] text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {t("Evidências", "Evidence")}
                </button>
              </div>

              {/* Tab Content */}
              {activeDetailTab === 'details' && (
                <div className="flex flex-col gap-4 text-xs font-mono">
                  {currentCase.preconditions && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-bold mb-1">
                        {t("Precondições / Metadados:", "Preconditions / Metadata:")}
                      </span>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300">
                        {currentCase.preconditions}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-bold mb-1">
                      {t("Passos do Cenário (BDD Gherkin / Robot):", "Scenario Steps (BDD Gherkin / Robot):")}
                    </span>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {currentCase.steps || t("Nenhum passo cadastrado.", "No steps defined.")}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-bold mb-1">
                      {t("Resultado Esperado:", "Expected Result:")}
                    </span>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-emerald-400 font-semibold">
                      {currentCase.expected_result || t("Cenário executado com sucesso.", "Scenario executed successfully.")}
                    </div>
                  </div>

                  {currentCase.observation && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-bold mb-1">
                        {t("Observação:", "Observation:")}
                      </span>
                      <div className="bg-slate-950 border border-amber-800/40 rounded-lg p-3 text-amber-300">
                        {currentCase.observation}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'evidence' && (
                <TestCaseEvidenceTab testCaseId={currentCase.id} t={t} />
              )}
            </div>

            {/* Bottom Actions for Singular execution & Manual Execution */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3">
              <div className="text-xs text-slate-400 font-mono">
                <span>{t("Execução Singular:", "Singular Execution:")} </span>
                <span className="text-slate-200 font-bold">
                  {getTestCaseDisplayId(currentCase.id, currentCase.title)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualExecutionDialogOpen(true)}
                  data-testid="tms-manual-execution-button"
                  className="bg-violet-950 hover:bg-violet-900 border border-violet-800 text-violet-300 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  {t("Executar Manualmente", "Manual Execution")}
                </button>

                {/* Singular Automated Execution Button */}
                <button
                  type="button"
                  onClick={() => handleRunSingleTestCaseReal(currentCase)}
                  data-testid="tms-run-singular-button"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                >
                  <Play className="w-4 h-4 text-white" />
                  {t("Executar Teste Automatizado", "Execute Automated Test")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 text-slate-500 font-mono text-xs">
            {t("Selecione um caso de teste à esquerda para visualizar seus detalhes.", "Select a test case on the left to view details.")}
          </div>
        )}
      </div>

      {/* Manual Execution Dialog */}
      {currentCase && manualExecutionDialogOpen && (
        <ManualExecutionDialog
          testCase={currentCase}
          open={manualExecutionDialogOpen}
          onClose={() => setManualExecutionDialogOpen(false)}
          onCompleted={(updatedCase) => {
            setSqliteDb((prev) => ({
              ...prev,
              test_cases_sphere: (prev.test_cases_sphere || []).map((c) =>
                c.id === updatedCase.id ? updatedCase : c
              ),
            }));
            setManualExecutionDialogOpen(false);
          }}
          t={t}
        />
      )}

      {/* Create / Edit Case Modal */}
      {(isCreatingSphereTestCase || isEditingSphereTestCase) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="tms-case-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg flex flex-col gap-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-2">
              {isEditingSphereTestCase ? t("Editar Caso de Teste", "Edit Test Case") : t("Criar Caso de Teste", "Create Test Case")}
            </h3>

            <form onSubmit={handleSaveSphereTestCase} className="flex flex-col gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">{t("ID do Caso:", "Case ID:")}</label>
                <input
                  type="text"
                  value={formSphereId}
                  onChange={(e) => setFormSphereId(e.target.value)}
                  required
                  disabled={isEditingSphereTestCase}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t("Pasta / Módulo:", "Folder / Module:")}</label>
                <input
                  type="text"
                  value={formSphereFolder}
                  onChange={(e) => setFormSphereFolder(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700/60 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t("Título do Cenário:", "Scenario Title:")}</label>
                <input
                  type="text"
                  value={formSphereTitle}
                  onChange={(e) => setFormSphereTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700/60 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t("Precondições:", "Preconditions:")}</label>
                <input
                  type="text"
                  value={formSpherePreconditions}
                  onChange={(e) => setFormSpherePreconditions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t("Passos Gherkin:", "Gherkin Steps:")}</label>
                <textarea
                  value={formSphereSteps}
                  onChange={(e) => setFormSphereSteps(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-[#FF6600] resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t("Resultado Esperado:", "Expected Result:")}</label>
                <input
                  type="text"
                  value={formSphereExpectedResult}
                  onChange={(e) => setFormSphereExpectedResult(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/60 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingSphereTestCase(false);
                    setIsEditingSphereTestCase(false);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#FF6600] hover:bg-[#e05500] text-white rounded font-bold"
                >
                  {t("Salvar", "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
