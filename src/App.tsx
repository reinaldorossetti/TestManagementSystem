/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  Database, 
  Terminal as TerminalIcon, 
  Table, 
  FileText, 
  Sliders, 
  X, 
  Settings, 
  FolderTree, 
  Trash2, 
  DatabaseZap, 
  Check, 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  Plus, 
  Edit, 
  Search, 
  ExternalLink,
  BookOpen,
  ClipboardCheck,
  Globe
} from 'lucide-react';
import { useDatabase } from './hooks/useDatabase';
import { useTestSpecs } from './hooks/useTestSpecs';
import { useTerminalRunner } from './hooks/useTerminalRunner';
import { useSphereTestCases } from './hooks/useSphereTestCases';
import { Header } from './components/layout/Header';
import { WorkspaceView } from './components/views/WorkspaceView';
import { TerminalView } from './components/views/TerminalView';
import { SqlExplorerView } from './components/views/SqlExplorerView';
import { TmsView } from './components/views/TmsView';
import { ExecutionReports } from './components/ExecutionReports';
import { ConfigureTagModal } from './components/modals/ConfigureTagModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { LiveTerminal } from './components/LiveTerminal';
import { LoggedStep } from './components/LoggedStep';
import { ManualExecutionDialog } from './components/ManualExecutionDialog';
import { SphereCaseStatusBadge } from './components/SphereCaseStatusBadge';
import { handleExportToExcel } from './utils/excelExporter';
import { handleExportTestCasesToPDF } from './utils/pdfExporter';
import { buildStatusByCaseId } from './utils/sphereCaseExecution';
import {
  buildFeatureRobotCommand,
  buildSingleTestRobotCommand,
} from './utils/robotCommands';
import {
  buildExecutionTagsFromRobotTestTags,
  normalizeExecutionTagValue,
  resolveRobotFolderLabel,
  type RobotProjectOption,
} from './utils/robotTagLoader';
import { createTranslator } from './utils/i18n';
import type { ParsedFeature } from './utils/featureLoader';
import { apiClient } from './lib/api/client';
import { executeVirtualSQL, DbTestCaseSphere } from './utils/sqliteEngine';
import { buildWorkspaceImportedCaseId, getDefaultSqlQuery, getDefaultScriptLanguage, normalizeImportedCaseTitleForMatch } from './constants/initialSpecs';

export type WorkspaceFeature = 'terminal' | 'sqlite' | 'reports' | 'tms';

interface AppProps {
  initialTab?: WorkspaceFeature;
}

const isWorkspaceFeature = (value: string | null | undefined): value is WorkspaceFeature =>
  value === 'terminal' || value === 'sqlite' || value === 'reports' || value === 'tms';

export default function App({ initialTab }: AppProps = {}) {
  // Navigation & Language
  const [activeTab, setActiveTab] = useState<WorkspaceFeature>(() => {
    if (initialTab && isWorkspaceFeature(initialTab)) return initialTab;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/^\/+/, '');
      if (isWorkspaceFeature(pathname)) return pathname;
      const params = new URLSearchParams(window.location.search);
      const queryTab = params.get('tab');
      if (isWorkspaceFeature(queryTab)) return queryTab;
    }
    return 'terminal';
  });

  const [language, setLanguage] = useState<'PT' | 'ENG'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qa_tms_lang');
      if (saved === 'PT' || saved === 'ENG') return saved;
    }
    return 'PT';
  });

  useEffect(() => {
    localStorage.setItem('qa_tms_lang', language);
  }, [language]);

  const t = createTranslator(language);

  // Database Hook (Multi-Tab LocalStorage & API sync)
  const {
    sqliteDb,
    setSqliteDb,
    reset: handleResetDatabase,
    clearExecutions: handleClearExecutionHistory,
  } = useDatabase();

  const [sphereTestCaseStatuses, setSphereTestCaseStatuses] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cardmais_sphere_statuses');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {};
  });

  // Robot output directory settings
  const [robotResultsDirectory, setRobotResultsDirectory] = useState('results/');
  const [resolvedRobotResultsDirectory, setResolvedRobotResultsDirectory] = useState('');
  const [isSavingRobotResultsDirectory, setIsSavingRobotResultsDirectory] = useState(false);

  useEffect(() => {
    void apiClient.getRobotRuntimeSettings()
      .then(({ resultsDirectory, resolvedDirectory }) => {
        setRobotResultsDirectory(resultsDirectory);
        setResolvedRobotResultsDirectory(resolvedDirectory);
      })
      .catch(() => {});
  }, []);

  const handleSaveRobotResultsDirectory = async () => {
    if (isSavingRobotResultsDirectory) return;
    setIsSavingRobotResultsDirectory(true);
    try {
      const { resultsDirectory, resolvedDirectory } = await apiClient.updateRobotRuntimeSettings(robotResultsDirectory);
      setRobotResultsDirectory(resultsDirectory);
      setResolvedRobotResultsDirectory(resolvedDirectory);
      appendTerminalLog(`[CONFIG] Diretório de resultados Robot salvo: ${resultsDirectory}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendTerminalLog(`[CONFIG] Não foi possível salvar o diretório de resultados: ${message}`, 'error');
    } finally {
      setIsSavingRobotResultsDirectory(false);
    }
  };

  // Custom Hooks
  const {
    terminalLogs,
    robotExecutionProgress,
    isExecutingFeature,
    executionTags,
    setExecutionTags,
    projectFolders,
    filterTag,
    setFilterTag,
    selectedProjectFolder,
    setSelectedProjectFolder,
    argsFile,
    setArgsFile,
    appendTerminalLog,
    applyExecutionTagsFromRobot,
    refreshExecutionTagsFromRobotSample,
    getSuiteTestTagForProject,
    handleRunFeatureReal,
  } = useTerminalRunner({
    robotResultsDirectory,
    language,
    t,
    setSqliteDb,
  });

  const handleImportComplete = (parsed: ParsedFeature, filename: string) => {
    const defaultFolder = selectedProjectFolder
      ? resolveRobotFolderLabel(selectedProjectFolder)
      : 'Workspace Importados';

    const newCases: DbTestCaseSphere[] = parsed.scenarios.map((sc, idx) => ({
      id: buildWorkspaceImportedCaseId(defaultFolder, sc.tags, sc.title, `TC-${String(idx + 1).padStart(2, '0')}`),
      folder: defaultFolder,
      title: sc.title,
      preconditions: sc.tags.length > 0 ? `Tags: ${sc.tags.join(', ')}` : '',
      steps: sc.steps.map((s) => `${s.rawType || s.type} ${s.text}`).join('\n'),
      expected_result: 'Cenário executado com sucesso.',
      created_at: new Date().toISOString(),
    }));

    setSqliteDb((prev) => {
      const existingFolders = prev.test_folders || [];
      const updatedFolders = existingFolders.includes(defaultFolder)
        ? existingFolders
        : [...existingFolders, defaultFolder];

      const existingCasesMap = new Map((prev.test_cases_sphere || []).map((c) => [c.id, c]));
      newCases.forEach((c) => existingCasesMap.set(c.id, c));

      return {
        ...prev,
        test_folders: updatedFolders,
        test_cases_sphere: Array.from(existingCasesMap.values()),
      };
    });

    appendTerminalLog(
      `[TMS] ${newCases.length} casos de teste criados e salvos na pasta "${defaultFolder}".`,
      'success',
    );
  };

  const {
    gherkinContent,
    parsedFeature,
    scenarioStatuses,
    isEditingGherkin,
    setIsEditingGherkin,
    gherkinTempText,
    setGherkinTempText,
    importFileContent,
    readFeatureFile,
  } = useTestSpecs({
    selectedProjectFolder,
    applyExecutionTagsFromRobot,
    appendTerminalLog,
    onImportComplete: handleImportComplete,
  });

  const {
    selectedSphereFolder,
    setSelectedSphereFolder,
    selectedSphereTestCaseId,
    setSelectedSphereTestCaseId,
    sphereSearchQuery,
    setSphereSearchQuery,
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
  } = useSphereTestCases();

  // Modals & Navigation Drawers
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // File Upload Drag & Drop State
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SQL Explorer State
  const [sqliteSubTab, setSqliteSubTab] = useState<'browse' | 'playground'>('browse');
  const [browseTableName, setBrowseTableName] = useState<'executions' | 'test_cases' | 'steps'>('executions');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [rawSqlQuery, setRawSqlQuery] = useState('SELECT * FROM executions;');
  const [sqlResults, setSqlResults] = useState<{ columns: string[]; rows: Record<string, unknown>[]; error?: string } | null>(null);

  // Project Options
  const projectOptions = useMemo<RobotProjectOption[]>(
    () =>
      projectFolders.map((folder) => {
        const displayName = folder
          .split(/[-_]/)
          .filter(Boolean)
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
        return { folder, name: displayName || folder, label: displayName || folder };
      }),
    [projectFolders],
  );

  const tagsForSelectedProject = useMemo(
    () =>
      selectedProjectFolder !== null
        ? executionTags.filter((tag) => (tag.sourceFolder ?? '') === selectedProjectFolder)
        : executionTags,
    [executionTags, selectedProjectFolder],
  );

  const handleSelectProject = (folder: string) => {
    setSelectedProjectFolder(folder);
    const suiteTag = getSuiteTestTagForProject(folder);
    if (suiteTag) setFilterTag(suiteTag);
  };

  const getCompiledCommand = (): string => {
    const activeProjectTag = getSuiteTestTagForProject(selectedProjectFolder);
    const tagMeta = executionTags.find((opt) => opt.value === (activeProjectTag || filterTag));
    return buildFeatureRobotCommand(
      activeProjectTag || filterTag || 'login_tests',
      tagMeta?.sourceFile,
      selectedProjectFolder ?? '',
      argsFile,
    );
  };

  const handleSaveGherkin = () => {
    importFileContent(gherkinTempText, 'workspace.feature');
    setIsEditingGherkin(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFeatureFile(file, (text) => importFileContent(text, file.name));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFeatureFile(file, (text) => importFileContent(text, file.name));
    }
  };

  const handleLoadMultipleTestCasesToWorkspace = (cases: DbTestCaseSphere[]) => {
    if (cases.length === 0) return;
    const firstCase = cases[0];
    const tagMatch = firstCase.preconditions?.match(/@([A-Za-z0-9_-]+)/);
    const tag = tagMatch?.[1] ? tagMatch[1] : undefined;
    handleRunFeatureReal(tag);
  };

  const handleSaveCurrentWorkspaceAsCases = () => {
    const defaultFolder = selectedProjectFolder
      ? resolveRobotFolderLabel(selectedProjectFolder)
      : 'Workspace Importados';

    const newCases: DbTestCaseSphere[] = parsedFeature.scenarios.map((sc, idx) => ({
      id: buildWorkspaceImportedCaseId(defaultFolder, sc.tags, sc.title, `TC-${String(idx + 1).padStart(2, '0')}`),
      folder: defaultFolder,
      title: sc.title,
      preconditions: sc.tags.length > 0 ? `Tags: ${sc.tags.join(', ')}` : '',
      steps: sc.steps.map(s => `${s.rawType || s.type} ${s.text}`).join('\n'),
      expected_result: 'Cenário executado com sucesso.',
      created_at: new Date().toISOString(),
    }));

    setSqliteDb((prev) => {
      const existingFolders = prev.test_folders || [];
      const updatedFolders = existingFolders.includes(defaultFolder)
        ? existingFolders
        : [...existingFolders, defaultFolder];

      return {
        ...prev,
        test_folders: updatedFolders,
        test_cases_sphere: [...(prev.test_cases_sphere || []), ...newCases],
      };
    });
    alert(`Importados ${newCases.length} casos de teste para a pasta "${defaultFolder}".`);
  };

  const handleExecuteRawSQL = () => {
    try {
      const res = executeVirtualSQL(rawSqlQuery, sqliteDb);
      setSqlResults({ columns: res.columns, rows: res.rows });
    } catch (err) {
      setSqlResults({ columns: [], rows: [], error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleRunSingleTestCaseReal = (currentCase: DbTestCaseSphere) => {
    const tagMatch = currentCase.preconditions?.match(/@([A-Za-z0-9_-]+)/);
    const tag = tagMatch?.[1] ? tagMatch[1].toUpperCase() : currentCase.id;
    handleRunFeatureReal(tag);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalExecutions = sqliteDb.executions.length;
    const totalPassedExecutions = sqliteDb.executions.filter(e => e.status === 'PASS').length;
    const totalPassRate = totalExecutions > 0 ? Math.round((totalPassedExecutions / totalExecutions) * 100) : 0;
    const averageDuration = totalExecutions > 0 
      ? parseFloat((sqliteDb.executions.reduce((acc, c) => acc + c.duration_s, 0) / totalExecutions).toFixed(2)) 
      : 0;
    const totalStepsRow = sqliteDb.steps.length;

    return { totalExecutions, totalPassedExecutions, totalPassRate, averageDuration, totalStepsRow };
  }, [sqliteDb]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Header Bar */}
      <Header
        language={language}
        setLanguage={setLanguage}
        robotResultsDirectory={robotResultsDirectory}
        setIsConfigOpen={setIsConfigOpen}
        setIsNavDrawerOpen={setIsNavDrawerOpen}
        activeTab={activeTab}
        t={t}
      />

      {/* Stats Summary Bar */}
      <section className="bg-slate-900 border-b border-slate-800 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF6600]/10 text-[#FF6600] border border-[#FF6600]/20 flex items-center justify-center">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">{t("Total de Execuções", "Total Executions")}</p>
            <p className="text-lg font-black text-white font-mono">{stats.totalExecutions} {t("Históricos", "History logs")}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">{t("Taxa de Sucesso (Pass)", "Success Rate (Pass)")}</p>
            <p className="text-lg font-black text-emerald-400 font-mono">{stats.totalPassRate}% {t("de Êxito", "Success")}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">{t("Duração Média das Suites", "Average Suite Duration")}</p>
            <p className="text-lg font-black text-white font-mono">{stats.averageDuration} s</p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF6600]/10 text-slate-300 border border-slate-700/60 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">{t("SQLite Estabilidade", "SQLite Stability")}</p>
            <p className="text-lg font-black text-[#FF6600] font-mono">{stats.totalStepsRow} {t("Linhas Ativas", "Active Rows")}</p>
          </div>
        </div>
      </section>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 h-full">
        {activeTab === 'terminal' && (
          <>
            <WorkspaceView
              gherkinContent={gherkinContent}
              parsedFeature={parsedFeature}
              scenarioStatuses={scenarioStatuses}
              isEditingGherkin={isEditingGherkin}
              gherkinTempText={gherkinTempText}
              setGherkinTempText={setGherkinTempText}
              setIsEditingGherkin={setIsEditingGherkin}
              handleSaveGherkin={handleSaveGherkin}
              handleFileChange={handleFileChange}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              isDraggingFile={isDraggingFile}
              fileInputRef={fileInputRef}
              handleSaveCurrentWorkspaceAsCases={handleSaveCurrentWorkspaceAsCases}
              projectFolders={projectFolders}
              projectOptions={projectOptions}
              selectedProjectFolder={selectedProjectFolder}
              handleSelectProject={handleSelectProject}
              filterTag={filterTag}
              setFilterTag={setFilterTag}
              tagsForSelectedProject={tagsForSelectedProject}
              refreshExecutionTagsFromRobotSample={refreshExecutionTagsFromRobotSample}
              setIsTagModalOpen={setIsTagModalOpen}
              argsFile={argsFile}
              setArgsFile={setArgsFile}
              getCompiledCommand={getCompiledCommand}
              handleRunFeatureReal={handleRunFeatureReal}
              isExecutingFeature={isExecutingFeature}
              selectedScenarioId={selectedScenarioId}
              setSelectedScenarioId={setSelectedScenarioId}
              t={t}
            />

            <div className="flex-1 flex flex-col p-5 overflow-y-auto min-h-0">
              <TerminalView
                robotExecutionProgress={robotExecutionProgress}
                terminalLogs={terminalLogs}
                handleRunFeatureReal={handleRunFeatureReal}
                isExecutingFeature={isExecutingFeature}
                handleClearExecutionHistory={handleClearExecutionHistory}
                onPersistExecution={({ execution, testCases, steps }) => {
                  setSqliteDb((prev) => ({
                    ...prev,
                    executions: [execution, ...prev.executions],
                    test_cases: [...testCases, ...prev.test_cases],
                    steps: [...steps, ...prev.steps],
                  }));
                }}
                language={language}
                t={t}
              />
            </div>
          </>
        )}

        {activeTab === 'tms' && (
          <div className="flex-1 flex flex-col min-h-0">
            <TmsView
              sqliteDb={sqliteDb}
              setSqliteDb={setSqliteDb}
              selectedSphereFolder={selectedSphereFolder}
              setSelectedSphereFolder={setSelectedSphereFolder}
              selectedSphereTestCaseId={selectedSphereTestCaseId}
              setSelectedSphereTestCaseId={setSelectedSphereTestCaseId}
              sphereSearchQuery={sphereSearchQuery}
              setSphereSearchQuery={setSphereSearchQuery}
              sphereTestCaseStatuses={sphereTestCaseStatuses}
              sphereCustomSqlQuery={sphereCustomSqlQuery}
              setSphereCustomSqlQuery={setSphereCustomSqlQuery}
              sphereCustomScriptLanguage={sphereCustomScriptLanguage}
              setSphereCustomScriptLanguage={setSphereCustomScriptLanguage}
              manualExecutionDialogOpen={manualExecutionDialogOpen}
              setManualExecutionDialogOpen={setManualExecutionDialogOpen}
              isCreatingSphereTestCase={isCreatingSphereTestCase}
              setIsCreatingSphereTestCase={setIsCreatingSphereTestCase}
              isEditingSphereTestCase={isEditingSphereTestCase}
              setIsEditingSphereTestCase={setIsEditingSphereTestCase}
              formSphereId={formSphereId}
              setFormSphereId={setFormSphereId}
              formSphereFolder={formSphereFolder}
              setFormSphereFolder={setFormSphereFolder}
              formSphereTitle={formSphereTitle}
              setFormSphereTitle={setFormSphereTitle}
              formSpherePreconditions={formSpherePreconditions}
              setFormSpherePreconditions={setFormSpherePreconditions}
              formSphereSteps={formSphereSteps}
              setFormSphereSteps={setFormSphereSteps}
              formSphereExpectedResult={formSphereExpectedResult}
              setFormSphereExpectedResult={setFormSphereExpectedResult}
              formSphereObservation={formSphereObservation}
              setFormSphereObservation={setFormSphereObservation}
              handleRunSingleTestCaseReal={handleRunSingleTestCaseReal}
              handleLoadMultipleTestCasesToWorkspace={handleLoadMultipleTestCasesToWorkspace}
              handleRunFeatureReal={handleRunFeatureReal}
              t={t}
            />
          </div>
        )}

        {activeTab === 'sqlite' && (
          <div className="flex-1 p-5 flex flex-col min-h-0">
            <SqlExplorerView
              sqliteDb={sqliteDb}
              sqliteSubTab={sqliteSubTab}
              setSqliteSubTab={setSqliteSubTab}
              browseTableName={browseTableName}
              setBrowseTableName={setBrowseTableName}
              dbSearchQuery={dbSearchQuery}
              setDbSearchQuery={setDbSearchQuery}
              rawSqlQuery={rawSqlQuery}
              setRawSqlQuery={setRawSqlQuery}
              sqlResults={sqlResults}
              setSqlResults={setSqlResults}
              handleExecuteRawSQL={handleExecuteRawSQL}
              t={t}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="flex-1 p-5 flex flex-col min-h-0">
            <ExecutionReports
              sqliteDb={sqliteDb}
              onClearHistory={handleClearExecutionHistory}
              onRunFeature={() => handleRunFeatureReal()}
              onLoadLatestRobotReport={async () => {
                const imported = await apiClient.importLatestRobotReport();
                const refreshedDb = await apiClient.getDatabase();
                setSqliteDb(refreshedDb);
                appendTerminalLog(
                  `[TMS] Último relatório Robot importado: ${imported.execution.id} — ${imported.execution.total_tests} testes. output.xml: ${imported.importedFrom.outputXmlPath}`,
                  'success',
                );
              }}
              language={language}
              onChangeLanguage={setLanguage}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-xs text-slate-500 font-mono">
        <div>
          <span>ID de Workspace: </span><span className="text-slate-400">8fb882a5-f0c1-4d89-bcfd-f94022af5674</span>
        </div>
        <div className="flex items-center gap-2">
          <span>TMS QA Inc</span>
        </div>
      </footer>

      {/* Tag Configuration Modal */}
      <ConfigureTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        executionTags={executionTags}
        filterTag={filterTag}
        onSaveEditTag={(idx, value, label) => {
          setExecutionTags(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], value, label };
            return next;
          });
        }}
        onDeleteTag={(val) => {
          setExecutionTags(prev => prev.filter(t => t.value !== val));
        }}
        onAddTag={(value, label) => {
          setExecutionTags(prev => [...prev, { value, label: label || `@${value}` }]);
          setFilterTag(value);
        }}
        t={t}
      />

      {/* Settings Modal Drawer */}
      <SettingsModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        robotResultsDirectory={robotResultsDirectory}
        setRobotResultsDirectory={setRobotResultsDirectory}
        onSaveRobotResultsDirectory={handleSaveRobotResultsDirectory}
        isSavingRobotResultsDirectory={isSavingRobotResultsDirectory}
        onResetDatabase={handleResetDatabase}
        t={t}
      />
    </div>
  );
}
