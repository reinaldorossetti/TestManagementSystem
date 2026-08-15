/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef } from 'react';
import { 
  Folder, 
  FolderOpen,
  Plus, 
  Search, 
  PlayCircle, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Database, 
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Compass,
  X,
  Globe,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  ExternalLink
} from 'lucide-react';
import type { DbTestCaseSphere, VirtualDatabase, ProjectPlatform } from '../../utils/sqliteEngine';
import { SphereCaseStatusBadge } from '../SphereCaseStatusBadge';
import { ManualExecutionDialog } from '../ManualExecutionDialog';
import { TestCaseEvidenceTab } from '../TestCaseEvidenceTab';
import {
  getTestCaseDisplayId,
  getTestCaseDisplayTitle,
  getTestCaseDisplayFeature,
  parseRobotGherkinFeature,
  buildImportedTestCaseId,
  buildImportedTestCaseTitle
} from '../../utils/featureLoader';

const buildWorkspaceImportedCaseId = (
  folderName: string,
  tags: string[],
  scenarioTitle: string,
  fallbackId: string,
): string => {
  const baseId = buildImportedTestCaseId(tags, scenarioTitle, fallbackId);
  const folderLabel = folderName.split('/').pop() || folderName;
  const folderSlug = folderLabel
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);

  if (!folderSlug || baseId.startsWith(folderSlug)) {
    return baseId;
  }
  return `${folderSlug}-${baseId}`;
};

const normalizeImportedCaseTitleForMatch = (title: string): string => {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .trim()
    .toLowerCase();
};

const resolveRobotFolderLabel = (content: string, fallbackTitle: string): string => {
  const forceTagMatch = content.match(/Force Tags\s+([A-Za-z0-9_-]+)/i);
  if (forceTagMatch?.[1]) {
    const rawTag = forceTagMatch[1].replace(/^@/, '').trim();
    return rawTag
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  const testTagMatch = content.match(/Test Tags\s+([A-Za-z0-9_-]+)/i);
  if (testTagMatch?.[1]) {
    const rawTag = testTagMatch[1].replace(/^@/, '').trim();
    return rawTag
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  return fallbackTitle || 'Workspace Importados';
};

const isTwoScenarioFallback = (parsed: { scenarios: Array<any> }): boolean => {
  return parsed.scenarios.length === 0;
};
import { handleExportToExcel } from '../../utils/excelExporter';
import { handleExportTestCasesToPDF } from '../../utils/pdfExporter';
import { buildStatusByCaseId } from '../../utils/sphereCaseExecution';
import { apiClient } from '../../lib/api/client';
const extractPrimaryScenarioTagFromPreconditions = (preconditions?: string): string | null => {
  if (!preconditions) return null;
  const tagMatch = preconditions.match(/@([A-Za-z0-9_-]+)/);
  if (!tagMatch?.[1]) return null;
  return tagMatch[1].toUpperCase();
};

const normalizeScenarioTagForBadge = (rawTag: string): string | null => {
  const tag = rawTag.replace(/^@/, '').trim().toUpperCase();
  if (!tag) return null;
  const technicalSuffix = tag.match(/(?:^|[-_])(TC-\d+|RCT\d+|RECEL\d+|CT\d+)$/i)?.[1];
  if (technicalSuffix) {
    return technicalSuffix.toUpperCase();
  }
  if (/^[A-Z]{2,}\d+$/.test(tag)) {
    return tag;
  }
  return null;
};

const getSphereCaseBadgeValue = (testCase: { id: string; title: string; preconditions?: string }): string => {
  const scenarioTag = extractPrimaryScenarioTagFromPreconditions(testCase.preconditions);
  if (scenarioTag) {
    const normalizedScenarioTag = normalizeScenarioTagForBadge(scenarioTag);
    if (normalizedScenarioTag) return normalizedScenarioTag;
  }
  return getTestCaseDisplayId(testCase.id, testCase.title);
};

const sphereCaseTagCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const compareSphereCasesByTag = (
  left: { id: string; title: string; preconditions?: string },
  right: { id: string; title: string; preconditions?: string },
): number => {
  const tagComparison = sphereCaseTagCollator.compare(
    getSphereCaseBadgeValue(left),
    getSphereCaseBadgeValue(right),
  );

  if (tagComparison !== 0) return tagComparison;
  return sphereCaseTagCollator.compare(left.id, right.id);
};

const getSphereFolderDisplayLabel = (folder: string): string =>
  folder ? folder.replace('br.com.grupocard.contacard.dev/', '') : '';

const getDefaultSqlQuery = (caseId: string) => {
  return `-- Exemplos de Query para o Caso de Teste ${caseId}

-- 1. INSERT: Registra uma nova simulação de execução do teste no SQLite
INSERT INTO executions (
  command, 
  duration_ms, 
  pass_count, 
  fail_count, 
  skip_count, 
  report_path
) VALUES (
  'robot --include ${caseId} ./', 
  1520, 
  1, 
  0, 
  0, 
  '%ROBOT_HOME%/results/output.xml'
);

-- 2. UPDATE: Atualiza o status de aprovação de execução
UPDATE test_cases 
SET status = 'PASS', 
    duration_ms = 1520 
WHERE test_case_id = '${caseId}';

-- 3. SELECT: Consulta histórico consolidado de execuções deste cenário
SELECT id, status, duration_ms, created_at 
FROM test_cases 
WHERE test_case_id = '${caseId}' 
ORDER BY id DESC;`;
};

const getDefaultScriptLanguage = (caseId: string, title: string) => {
  return `# Script de Automação correspondente ao cenário ${caseId}
# Baseado na estrutura Gherkin / Robot Framework

*** Settings ***
Documentation    Automação para o teste: ${title || 'Caso de teste'}
Library          SeleniumLibrary
Library          DatabaseLibrary

*** Variables ***
\${BROWSER}       Chrome
\${URL}           https://contacard.grupocard.com.br

*** Test Cases ***
Executar Cenário ${caseId}
    [Tags]           ${caseId}    regression
    Dado Que O Usuário Está Logado No Sistema
    E Acessa A Rota Mapeada No Gherkin
    Quando Preenche Os Parâmetros Do Cenário
    Então Valida O Resultado Esperado Em Tela`;
};

const getFormattedTimestamp = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

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
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'evidence' | 'insights' | 'scripts'>('overview');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [newFolderNameValue, setNewFolderNameValue] = useState('');
  const [editFolderNameValue, setEditFolderNameValue] = useState('');
  const [applyObservationToFolder, setApplyObservationToFolder] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    sqliteDb.projects?.[0]?.id || ''
  );
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [newProjectNameValue, setNewProjectNameValue] = useState('');
  const [newProjectDetailsValue, setNewProjectDetailsValue] = useState('');
  const [newProjectPlatformValue, setNewProjectPlatformValue] = useState<ProjectPlatform>('Web');
  const [editProjectNameValue, setEditProjectNameValue] = useState('');
  const [editProjectDetailsValue, setEditProjectDetailsValue] = useState('');
  const [editProjectPlatformValue, setEditProjectPlatformValue] = useState<ProjectPlatform>('Web');

  // File input refs
  const acceptanceDocInputRef = useRef<HTMLInputElement>(null);
  const tmsImportFileInputRef = useRef<HTMLInputElement>(null);

  // Compute sorted folder list
  const sortedSphereFolders = useMemo(() => {
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
    return [...cases].sort(compareSphereCasesByTag);
  }, [sqliteDb.test_cases_sphere, selectedSphereFolder, sphereSearchQuery]);

  // Currently selected case
  const currentCase = useMemo(() => {
    if (!selectedSphereTestCaseId) return filteredCases[0] || null;
    return sqliteDb.test_cases_sphere?.find((c) => c.id === selectedSphereTestCaseId) || filteredCases[0] || null;
  }, [sqliteDb.test_cases_sphere, selectedSphereTestCaseId, filteredCases]);

  // Helper to resolve acceptance doc for current folder
  const resolveFolderAcceptanceDoc = (folderPath: string) => {
    return (sqliteDb.folder_acceptance_docs || []).find(
      (entry) => entry.folder_path === folderPath
    );
  };

  // Project management handlers
  const handleCreateProject = async (name: string, details: string, platform: ProjectPlatform) => {
    if (!name.trim()) return;
    const newProj = {
      id: `PRJ-${Date.now()}`,
      name: name.trim(),
      details: details.trim(),
      platform,
      created_at: new Date().toISOString(),
    };
    const updatedDb = {
      ...sqliteDb,
      projects: [...(sqliteDb.projects || []), newProj],
    };
    try {
      const persistedDb = await apiClient.replaceDatabase(updatedDb);
      setSqliteDb(persistedDb);
      setSelectedProjectId(newProj.id);
      setIsCreatingProject(false);
      setNewProjectNameValue('');
      setNewProjectDetailsValue('');
      setToastMessage(t(`Projeto "${newProj.name}" criado com sucesso!`, `Project "${newProj.name}" created successfully!`));
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      alert(t('Erro ao criar projeto.', 'Error creating project.'));
    }
  };

  const handleUpdateProjectName = async (
    id: string,
    name: string,
    details: string,
    platform: ProjectPlatform
  ) => {
    if (!id || !name.trim()) return;
    const updatedDb = {
      ...sqliteDb,
      projects: (sqliteDb.projects || []).map((p) =>
        p.id === id ? { ...p, name: name.trim(), details: details.trim(), platform } : p
      ),
    };
    try {
      const persistedDb = await apiClient.replaceDatabase(updatedDb);
      setSqliteDb(persistedDb);
      setIsEditingProject(false);
      setToastMessage(t('Projeto atualizado com sucesso!', 'Project updated successfully!'));
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      alert(t('Erro ao atualizar projeto.', 'Error updating project.'));
    }
  };

  // Folder management handlers
  const handleCreateFolder = (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    setSqliteDb((prev) => ({
      ...prev,
      test_folders: prev.test_folders?.includes(trimmed) ? prev.test_folders : [...(prev.test_folders || []), trimmed],
    }));
    setIsCreatingFolder(false);
    setNewFolderNameValue('');
    setSelectedSphereFolder(trimmed);
  };

  const handleUpdateFolderName = (oldFolder: string, newFolder: string) => {
    if (!newFolder.trim() || oldFolder === 'all') return;
    const trimmed = newFolder.trim();
    setSqliteDb((prev) => ({
      ...prev,
      test_folders: (prev.test_folders || []).map((f) => (f === oldFolder ? trimmed : f)),
      test_cases_sphere: (prev.test_cases_sphere || []).map((c) => (c.folder === oldFolder ? { ...c, folder: trimmed } : c)),
    }));
    setIsEditingFolder(false);
    setSelectedSphereFolder(trimmed);
  };

  const handleDeleteFolder = (folder: string) => {
    if (folder === 'all') return;
    if (!confirm(t(`Deseja excluir a pasta "${folder}" e todos os casos atrelados a ela?`, `Delete folder "${folder}" and all associated test cases?`))) return;
    setSqliteDb((prev) => ({
      ...prev,
      test_folders: (prev.test_folders || []).filter((f) => f !== folder),
      test_cases_sphere: (prev.test_cases_sphere || []).filter((c) => c.folder !== folder),
    }));
    setSelectedSphereFolder('all');
    setSelectedSphereTestCaseId(null);
  };

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

  // Test import handler
  const handleImportTestsFromTmsClick = () => {
    if (!selectedProjectId) {
      alert(t('Selecione ou crie um projeto no TMS antes de importar testes.', 'Select or create a project in TMS before importing tests.'));
      return;
    }
    tmsImportFileInputRef.current?.click();
  };

  const handleTmsImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const parsed = parseRobotGherkinFeature(text);
      if (parsed.scenarios.length === 0 || isTwoScenarioFallback(parsed)) {
        alert(t('Nenhum cenário Robot válido foi encontrado para importar no TMS.', 'No valid Robot scenario was found to import into TMS.'));
        return;
      }

      const folderLabel = resolveRobotFolderLabel(
        text,
        parsed.title !== 'Jornada TMS - Robot Suite' ? parsed.title : 'Workspace Importados',
      );
      const folderName = getSphereFolderDisplayLabel(folderLabel).trim();
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

      const existingFolders = sqliteDb.test_folders || [];
      const updatedFolders = existingFolders.includes(folderName)
        ? existingFolders
        : [...existingFolders, folderName];

      const currentCases = sqliteDb.test_cases_sphere || [];
      const updatedCases = [...currentCases];
      const importedCaseIds: string[] = [];

      parsed.scenarios.forEach((sc, index) => {
        const fallbackId = `TC-${String(currentCases.length + index + 1).padStart(3, '0')}`;
        const stableCaseId = buildWorkspaceImportedCaseId(folderName, sc.tags, sc.title, fallbackId);
        const caseId = stableCaseId;

        const formattedSteps = sc.steps.map((st) => `${st.rawType || 'And'} ${st.text}`).join('\n');
        const importedCase: DbTestCaseSphere = {
          id: caseId,
          folder: folderName,
          title: buildImportedTestCaseTitle(caseId, sc.title),
          preconditions: `*** Variables ***\n\${DEFAULT_TAG}=    ${sc.tags.map((t) => '@' + t.replace(/^@/, '')).join('  ')}`,
          steps: formattedSteps,
          expected_result: sc.steps.filter((st) => st.type === 'THEN').map((st) => st.text).join('\n') || 'Validar execução com sucesso.',
          history: [{ user: 'Reinaldo', action: 'created test case from TMS Importar Testes', time: getFormattedTimestamp() }],
          created_at: now,
        };

        const existingIndex = updatedCases.findIndex((c) => c.folder === folderName && c.id === caseId);
        if (existingIndex >= 0) {
          updatedCases[existingIndex] = importedCase;
        } else {
          updatedCases.push(importedCase);
        }
        importedCaseIds.push(caseId);
      });

      const updatedDb: VirtualDatabase = {
        ...sqliteDb,
        test_folders: updatedFolders,
        test_cases_sphere: updatedCases,
        folder_projects: [
          ...(sqliteDb.folder_projects || []).filter((link) => link.folder_path !== folderName),
          { folder_path: folderName, project_id: selectedProjectId },
        ],
      };

      try {
        const persistedDb = await apiClient.replaceDatabase(updatedDb);
        setSqliteDb(persistedDb);
        setSelectedSphereFolder(folderName);
        setSelectedSphereTestCaseId(importedCaseIds[0] ?? null);
        setToastMessage(t(`${parsed.scenarios.length} testes importados e salvos no TMS.`, `${parsed.scenarios.length} tests imported and saved to TMS.`));
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        alert(t('Falha ao armazenar os testes no TMS.', 'Failed to store tests in TMS.'));
      }
    };
    reader.readAsText(file);
  };

  // Acceptance doc import handler
  const handleImportAcceptanceDocClick = () => {
    if (!selectedSphereFolder || selectedSphereFolder === 'all') {
      alert(t('Selecione uma pasta de teste específica para importar critérios de aceite.', 'Select a specific test folder to import acceptance criteria.'));
      return;
    }
    acceptanceDocInputRef.current?.click();
  };

  const handleAcceptanceDocFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedSphereFolder || selectedSphereFolder === 'all') return;

    try {
      const doc = await apiClient.uploadAcceptanceDoc(selectedSphereFolder, file);
      const others = (sqliteDb.folder_acceptance_docs || []).filter(
        (entry) => entry.folder_path !== doc.folder_path,
      );
      setSqliteDb({
        ...sqliteDb,
        folder_acceptance_docs: [...others, doc],
      });
      setToastMessage(t(`Critérios de aceite importados para "${selectedSphereFolder}".`, `Acceptance criteria imported for "${selectedSphereFolder}".`));
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      alert(t('Falha ao importar critérios de aceite.', 'Failed to import acceptance criteria.'));
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 flex flex-col font-sans select-none antialiased overflow-hidden" data-testid="tms-view-container">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span className="text-xs font-mono">{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={acceptanceDocInputRef}
        type="file"
        accept=".md,text/markdown"
        className="hidden"
        onChange={handleAcceptanceDocFileChange}
      />
      <input
        ref={tmsImportFileInputRef}
        type="file"
        accept=".feature,.txt,.robot"
        className="hidden"
        onChange={handleTmsImportFileChange}
        data-testid="tms-import-tests-file-input"
      />

      {/* Light Standalone Header */}
      <header className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl">
            <Database className="w-6 h-6 text-sky-600" />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-sm uppercase text-slate-850 tracking-tight flex items-center gap-2">
              {t("TEST MANAGEMENT SYSTEM", "TEST MANAGEMENT SYSTEM")}
              <span className="text-[10px] bg-sky-100 text-sky-700 font-extrabold px-1.5 py-0.5 rounded font-mono border border-sky-200">STANDALONE</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t("Test Case Management", "Test Case Management")}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/terminal';
              }
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-all font-mono flex items-center gap-1.5 cursor-pointer border border-slate-200 hover:border-blue-500 hover:text-blue-600 shadow-sm"
            title={t("Voltar ao Terminal Console", "Return to Terminal Console")}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            {t("Voltar", "Back")}
          </button>
        </div>
      </header>

      {/* 3-Pane TMS Layout */}
      <div className="flex-1 flex min-h-0 divide-x divide-slate-200 bg-slate-50 overflow-hidden">
        
        {/* Left Pane (Folders / Features Tree - ~24% width) */}
        <div className="w-[24%] flex flex-col bg-slate-50 p-3 min-w-[240px] h-full overflow-hidden shrink-0">
          
          {/* Active Project Selector */}
          <div className="flex flex-col gap-2 mb-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-extrabold tracking-wider flex items-center gap-1.5 px-0.5">
              <Briefcase className="w-3 h-3 text-indigo-500" />
              {t("Projeto Ativo", "Active Project")}
            </span>
            <div className="flex items-stretch gap-1.5">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              >
                {(sqliteDb.projects || []).length === 0 && (
                  <option value="">{t("Nenhum projeto cadastrado", "No project registered")}</option>
                )}
                {(sqliteDb.projects || []).map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingProject(true);
                  setIsEditingProject(false);
                }}
                className="h-8 w-8 shrink-0 flex items-center justify-center text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-100 transition-all cursor-pointer"
                title={t("Criar Novo Projeto", "Create New Project")}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedProjectId) {
                    alert(t("Selecione um projeto para renomear.", "Select a project to rename."));
                    return;
                  }
                  const current = (sqliteDb.projects || []).find((p) => p.id === selectedProjectId);
                  setEditProjectNameValue(current?.name ?? '');
                  setEditProjectDetailsValue(current?.details ?? '');
                  setEditProjectPlatformValue(current?.platform ?? 'Web');
                  setIsEditingProject(true);
                  setIsCreatingProject(false);
                }}
                disabled={!selectedProjectId}
                className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border transition-all ${
                  selectedProjectId
                    ? 'text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border-slate-200 hover:border-indigo-400 cursor-pointer'
                    : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                }`}
                title={t("Renomear Projeto Selecionado", "Rename Selected Project")}
              >
                <Edit className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {isCreatingProject && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  type="text"
                  placeholder={t("Nome do novo projeto", "New project name")}
                  value={newProjectNameValue}
                  onChange={(e) => setNewProjectNameValue(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                />
                <textarea
                  placeholder={t("Detalhes do Projeto", "Project Details")}
                  value={newProjectDetailsValue}
                  onChange={(e) => setNewProjectDetailsValue(e.target.value)}
                  rows={2}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 resize-none focus:bg-white focus:border-sky-500 focus:outline-none"
                />
                <select
                  value={newProjectPlatformValue}
                  onChange={(e) => setNewProjectPlatformValue(e.target.value as ProjectPlatform)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="Web">{t("Web", "Web")}</option>
                  <option value="Mobile">{t("Mobile", "Mobile")}</option>
                  <option value="Desktop">{t("Desktop", "Desktop")}</option>
                </select>
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                  >
                    {t("Cancelar", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateProject(newProjectNameValue, newProjectDetailsValue, newProjectPlatformValue)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold"
                  >
                    {t("Criar", "Create")}
                  </button>
                </div>
              </div>
            )}

            {isEditingProject && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  type="text"
                  placeholder={t("Novo nome do projeto", "New project name")}
                  value={editProjectNameValue}
                  onChange={(e) => setEditProjectNameValue(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                />
                <textarea
                  placeholder={t("Detalhes do Projeto", "Project Details")}
                  value={editProjectDetailsValue}
                  onChange={(e) => setEditProjectDetailsValue(e.target.value)}
                  rows={2}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 resize-none focus:bg-white focus:border-sky-500 focus:outline-none"
                />
                <select
                  value={editProjectPlatformValue}
                  onChange={(e) => setEditProjectPlatformValue(e.target.value as ProjectPlatform)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="Web">{t("Web", "Web")}</option>
                  <option value="Mobile">{t("Mobile", "Mobile")}</option>
                  <option value="Desktop">{t("Desktop", "Desktop")}</option>
                </select>
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingProject(false)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                  >
                    {t("Cancelar", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateProjectName(selectedProjectId, editProjectNameValue, editProjectDetailsValue, editProjectPlatformValue)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold"
                  >
                    {t("Salvar", "Save")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Folder Action Center */}
          <div className="flex flex-col gap-2.5 mb-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-extrabold tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full inline-block animate-pulse"></span>
                {t("FOLDERS / FEATURES", "FOLDERS / FEATURES")} ({sortedSphereFolders.length})
              </span>
            </div>
            
            {/* Inline Action Toolbar Row */}
            <div className="flex flex-wrap items-stretch gap-1.5 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(true);
                  setIsEditingFolder(false);
                }}
                className="h-8 px-2.5 text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-all border border-sky-100 flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0"
                title={t("Criar Nova Pasta / Feature", "Create New Folder / Feature")}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="text-[10px] font-mono font-black pr-0.5">{t("New", "New")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSphereFolder && selectedSphereFolder !== 'all') {
                    setEditFolderNameValue(selectedSphereFolder);
                    setIsEditingFolder(true);
                    setIsCreatingFolder(false);
                  } else {
                    alert(t("Selecione uma pasta de teste específica para editar.", "Select a specific test folder to edit."));
                  }
                }}
                className={`h-8 px-2.5 rounded-lg transition-all border flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0 ${
                  selectedSphereFolder && selectedSphereFolder !== 'all'
                    ? 'text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border-slate-200 hover:border-indigo-400'
                    : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                }`}
                disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                title={t("Editar Pasta Selecionada", "Edit Selected Folder")}
              >
                <Edit className="w-3.5 h-3.5 stroke-[2]" />
                <span className="text-[10px] font-mono font-black pr-0.5">{t("Edit", "Edit")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSphereFolder && selectedSphereFolder !== 'all') {
                    handleDeleteFolder(selectedSphereFolder);
                  } else {
                    alert(t("Selecione uma pasta de teste específica para excluir.", "Select a specific test folder to delete."));
                  }
                }}
                className={`h-8 px-2.5 rounded-lg transition-all border flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0 ${
                  selectedSphereFolder && selectedSphereFolder !== 'all'
                    ? 'text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border-slate-200 hover:border-rose-400'
                    : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                }`}
                disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                title={t("Excluir Pasta com todos os Testes", "Delete Folder with All Associated Tests")}
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                <span className="text-[10px] font-mono font-black pr-0.5">{t("Delete", "Delete")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const casesToExport = sqliteDb.test_cases_sphere || [];
                  const foldersList = sqliteDb.test_folders || [];
                  if (casesToExport.length === 0) {
                    alert(t("Não existem casos de teste cadastrados para exportar.", "There are no registered test cases to export."));
                    return;
                  }
                  handleExportToExcel(
                    casesToExport,
                    foldersList,
                    sphereCustomSqlQuery,
                    sphereCustomScriptLanguage,
                    buildStatusByCaseId(casesToExport, sphereTestCaseStatuses),
                    'ENG',
                  );
                }}
                className="h-8 px-2 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-400 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0"
                title={t("Exportar para Excel", "Export to Excel")}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-mono font-black">{t("Excel", "Excel")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const casesToExport = sqliteDb.test_cases_sphere || [];
                  const foldersList = sqliteDb.test_folders || [];
                  if (casesToExport.length === 0) {
                    alert(t("Não existem casos de teste cadastrados para exportar.", "There are no registered test cases to export."));
                    return;
                  }
                  handleExportTestCasesToPDF(
                    casesToExport,
                    foldersList,
                    buildStatusByCaseId(casesToExport, sphereTestCaseStatuses),
                    'ENG',
                  );
                }}
                className="h-8 px-2 bg-rose-50/70 hover:bg-rose-100/80 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-400 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0"
                title={t("Exportar Plano de Testes para PDF", "Export Test Plan to PDF")}
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span className="text-[10px] font-mono font-black">{t("PDF", "PDF")}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleImportTestsFromTmsClick}
              disabled={!selectedProjectId}
              data-testid="tms-import-tests-button"
              className="h-9 w-full px-2.5 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 disabled:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed rounded-lg transition-all border border-sky-200 hover:border-sky-500 disabled:border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer font-bold mt-1"
              title={t("Importar um arquivo de testes e salvar todos os cenários no TMS", "Import a test file and save all scenarios in TMS")}
            >
              <Upload className="w-4 h-4" />
              <span className="text-[10px] font-mono font-black">{t("Importar Testes", "Import Tests")}</span>
            </button>
          </div>

          {isCreatingFolder && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 flex flex-col gap-2 shadow-sm text-left">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-black">{t("Caminho da Pasta", "Folder Path")}</label>
              <input
                type="text"
                placeholder={t("Nome da pasta/caminho", "Folder name / path")}
                value={newFolderNameValue}
                onChange={(e) => setNewFolderNameValue(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
              <div className="flex gap-1 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateFolder(newFolderNameValue)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  {t("Criar", "Create")}
                </button>
              </div>
            </div>
          )}

          {isEditingFolder && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 flex flex-col gap-2 shadow-sm text-left">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-black">{t("Editar Caminho da Pasta", "Edit Folder Path")}</label>
              <input
                type="text"
                placeholder={t("Nome da pasta/caminho", "Folder name / path")}
                value={editFolderNameValue}
                onChange={(e) => setEditFolderNameValue(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
              <div className="flex gap-1 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingFolder(false)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateFolderName(selectedSphereFolder, editFolderNameValue)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  {t("Salvar", "Save")}
                </button>
              </div>
            </div>
          )}

          {/* Folder Tree Scroll List */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
            <div
              onClick={() => {
                setSelectedSphereFolder('all');
                setSelectedSphereTestCaseId(null);
              }}
              className={`p-3 rounded-xl flex items-center gap-2.5 text-left text-xs cursor-pointer transition-all border ${
                selectedSphereFolder === 'all'
                  ? 'bg-sky-50/70 border-sky-500 border-l-[5px] border-l-sky-500 text-sky-700 font-extrabold shadow-sm'
                  : 'text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 border-slate-200'
              }`}
            >
              {selectedSphereFolder === 'all' ? (
                <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
              ) : (
                <Folder className="w-4 h-4 shrink-0 text-slate-400" />
              )}
              <span className="truncate font-bold">{t("Todas as Pastas", "All Folders")}</span>
            </div>

            {sortedSphereFolders.map((folder) => {
              const isSelected = selectedSphereFolder === folder;
              const folderLabel = getSphereFolderDisplayLabel(folder);
              const count = (sqliteDb.test_cases_sphere || []).filter((tc) => tc.folder === folder).length;
              const folderProjectId = (sqliteDb.folder_projects || []).find(
                (link) => link.folder_path === folder,
              )?.project_id;
              const folderProjectName = folderProjectId
                ? (sqliteDb.projects || []).find((p) => p.id === folderProjectId)?.name
                : undefined;

              return (
                <div
                  key={folder}
                  onClick={() => {
                    setSelectedSphereFolder(folder);
                    const filtered = (sqliteDb.test_cases_sphere || []).filter((tc) => tc.folder === folder);
                    setSelectedSphereTestCaseId(filtered.length > 0 ? filtered[0].id : null);
                    setIsCreatingSphereTestCase(false);
                    setIsEditingSphereTestCase(false);
                  }}
                  data-testid="tms-folder-entry"
                  className={`p-3 rounded-xl flex items-center gap-2.5 text-left text-[11.5px] cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-sky-50/70 border-sky-500 border-l-[5px] border-l-sky-500 text-sky-700 font-extrabold shadow-sm'
                      : 'text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-800 border-slate-200'
                  }`}
                  title={folder}
                >
                  {isSelected ? (
                    <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                  ) : (
                    <Folder className="w-4 h-4 shrink-0 text-slate-400" />
                  )}
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-semibold">{folderLabel}</span>
                    {folderProjectName && (
                      <span
                        className="truncate text-[9px] font-mono font-bold text-indigo-700 flex items-center gap-1"
                        title={t(`Projeto: ${folderProjectName}`, `Project: ${folderProjectName}`)}
                      >
                        <Briefcase className="w-2.5 h-2.5 shrink-0" />
                        {folderProjectName}
                      </span>
                    )}
                  </span>
                  <span data-testid="tms-folder-case-count" className={`ml-auto font-mono text-[9.5px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    isSelected ? 'bg-sky-200/60 text-sky-850' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Pane (Test Cases List in Selected Folder - ~28% width) */}
        <div className="w-[28%] flex flex-col p-3 min-w-[280px] bg-white h-full overflow-hidden shrink-0">
          {/* Search bar */}
          <div className="relative mb-3">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={t("Filter by name/ID...", "Filter by name/ID...")}
              value={sphereSearchQuery}
              onChange={(e) => setSphereSearchQuery(e.target.value)}
              data-testid="tms-search-input"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
            />
            {sphereSearchQuery && (
              <button
                type="button"
                onClick={() => setSphereSearchQuery('')}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Import Acceptance Criteria Button */}
          <button
            type="button"
            onClick={handleImportAcceptanceDocClick}
            disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
            className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white py-2 text-[11px] font-mono font-bold text-sky-700 transition-colors shadow-sm"
            title={t('Importar um arquivo .md compartilhado por todos os casos desta pasta', 'Import a .md file shared by all cases in this folder')}
          >
            <Upload className="w-3.5 h-3.5" />
            {t('Importar Critérios de Aceite', 'Import Acceptance Criteria')}
          </button>

          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">{t("TEST CASES", "TEST CASES")}</span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
              {filteredCases.length} {t("items", "items")}
            </span>
          </div>

          {/* Test Case Cards List */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-mono text-xs">
                {t("No cases found.", "No cases found.")}
              </div>
            ) : (
              filteredCases.map((tc) => {
                const isSelected = currentCase?.id === tc.id;
                const cleanTitle = getTestCaseDisplayTitle(tc.id, tc.title);
                const displayTag = getSphereCaseBadgeValue(tc);
                const folderLabel = getSphereFolderDisplayLabel(tc.folder);

                return (
                  <div
                    key={tc.id}
                    onClick={() => {
                      setSelectedSphereTestCaseId(tc.id);
                      setIsCreatingSphereTestCase(false);
                      setIsEditingSphereTestCase(false);
                    }}
                    data-testid={`tms-case-card-${tc.id}`}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-sky-50/65 border-sky-600 text-sky-850 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`} data-testid="tms-case-tag">
                        {displayTag}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        {folderLabel}
                      </span>
                    </div>
                    
                    <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-2 font-sans">
                      {cleanTitle}
                    </h4>
                  </div>
                );
              })
            )}
          </div>

          {/* Create & Run Buttons Footer */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setFormSphereId(`RECEL${String((sqliteDb.test_cases_sphere?.length || 0) + 1).padStart(2, '0')}`);
                setFormSphereFolder(selectedSphereFolder !== 'all' ? selectedSphereFolder : 'Recarga de telefone');
                setFormSphereTitle('Realizar uma nova recarga com PIX');
                setFormSpherePreconditions('*** Variables ***\n${DEFAULT_TAG}= @RCT01');
                setFormSphereSteps('Dado Que Tenha Efetuado O Login No APP ${CPF} ${SENHA}\nE Esteja Na Tela de Recarga\nQuando Cadastrar o DDD e Numero de Celular 19 97158-8381\nEntão validar a Recarga realizada com Sucesso');
                setFormSphereExpectedResult('Realizar a recarga com sucesso. Validar o numero do celular.');
                setFormSphereObservation('Validar se o saldo é subtraído corretamente.');
                setIsCreatingSphereTestCase(true);
              }}
              data-testid="tms-create-case-button"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 py-3 rounded-xl text-xs font-mono text-sky-600 flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("+ Create Test Case", "+ Create Test Case")}
            </button>

            <button
              type="button"
              onClick={() => handleLoadMultipleTestCasesToWorkspace(filteredCases)}
              data-testid="tms-run-plural-button"
              className="bg-[#FF6600] hover:bg-[#E05500] text-white py-3 rounded-xl text-xs transition-colors font-mono flex items-center justify-center gap-1.5 font-extrabold shadow-md shadow-[#FF6600]/10 cursor-pointer"
              title={t("Executar todos os casos da pasta/feature no Terminal Robot", "Run all folder/feature cases in Robot Terminal")}
            >
              <PlayCircle className="w-4 h-4 text-white stroke-[2.5px]" />
              {t("Executar Testes", "Run Automated Tests")}
            </button>
          </div>
        </div>

        {/* Right Pane (Selected Test Case Details / Scenario & BDD Steps) */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 bg-white text-slate-800 h-full">
          {isCreatingSphereTestCase || isEditingSphereTestCase ? (
            /* Create or Edit TestCase Form */
            <div className="flex flex-col gap-4 text-left scale-up max-w-4xl mx-auto w-full">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center bg-white">
                <div>
                  <h4 className="font-extrabold text-sm text-sky-600 uppercase font-mono">
                    {isCreatingSphereTestCase ? t("Cadastrar Caso de Teste", "Register Test Case") : `${t("Editar", "Edit")} - ${formSphereId}`}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t("Sincroniza automaticamente com o Workspace Gherkin", "Automatically synchronizes with Gherkin Workspace")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-slate-500 font-mono text-[10px] font-bold">{t("ID DO CASO DE TESTE:", "TEST CASE ID:")}</label>
                  <input
                    type="text"
                    value={formSphereId}
                    onChange={(e) => setFormSphereId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    disabled={isEditingSphereTestCase}
                    placeholder="RECEL17"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-slate-500 font-mono text-[10px] font-bold">{t("PASTA DESTINO:", "DESTINATION FOLDER:")}</label>
                  <select
                    value={formSphereFolder}
                    onChange={(e) => setFormSphereFolder(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:bg-white focus:border-sky-500 focus:outline-none"
                  >
                    {(sqliteDb.test_folders || []).map((fold, idx) => (
                      <option key={idx} value={fold}>{fold.replace('br.com.grupocard.contacard.dev/', '')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-left font-sans">
                <label className="text-slate-500 font-mono text-[10px] font-bold">{t("TÍTULO / DESCRIÇÃO DO CASO DE TESTE:", "TITLE / DESCRIPTION OF THE TEST CASE:")}</label>
                <input
                  type="text"
                  placeholder="Ex: RECEL01 - Cenário de Teste Positivo..."
                  value={formSphereTitle}
                  onChange={(e) => setFormSphereTitle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none font-sans"
                />
              </div>

              <div className="flex flex-col gap-1 text-left font-mono">
                <label className="text-slate-500 font-mono text-[10px] font-bold">{t("PRÉ-CONDIÇÕES (ROBOT VARIABLES):", "PRE-CONDITIONS (ROBOT VARIABLES):")}</label>
                <textarea
                  rows={3}
                  placeholder="*** Variables ***&#10;${CPF}=    03533062236"
                  value={formSpherePreconditions}
                  onChange={(e) => setFormSpherePreconditions(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col gap-1 text-left font-mono">
                <label className="text-slate-500 font-mono text-[10px] font-bold text-sky-600">{t("CENÁRIO DE PASSOS (SINTAXE GHERKIN BDD):", "SCENARIO STEPS (GHERKIN BDD SYNTAX):")}</label>
                <textarea
                  rows={10}
                  placeholder="Dado que o usuário está autenticado...&#10;Quando tenta realizar a recarga...&#10;Então exibe-se comprovante de sucesso."
                  value={formSphereSteps}
                  onChange={(e) => setFormSphereSteps(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col gap-1 text-left font-sans">
                <label className="text-slate-500 font-mono text-[10px] font-bold">{t("RESULTADO ESPERADO DA EXECUÇÃO:", "EXPECTED RESULT OF EXECUTION:")}</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Exibir comprovante impresso com todos os dados da transação autorizada com sucesso."
                  value={formSphereExpectedResult}
                  onChange={(e) => setFormSphereExpectedResult(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 focus:bg-white focus:border-sky-500 focus:outline-none resize-y"
                />
              </div>

              <div className="flex flex-col gap-1 text-left font-sans">
                <label className="text-orange-600 font-mono text-[10px] font-black uppercase tracking-wider">{t("OBSERVAÇÃO:", "OBSERVATION:")}</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Observações adicionais ou regras específicas para este caso de teste."
                  value={formSphereObservation}
                  onChange={(e) => setFormSphereObservation(e.target.value)}
                  data-testid="tms-observation-input"
                  className="bg-orange-50/30 border border-orange-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:bg-white focus:border-orange-400 focus:outline-none placeholder:text-slate-400 resize-y"
                />
                {isEditingSphereTestCase && (
                  <label className="mt-1 inline-flex items-center gap-2 text-[11px] font-mono font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyObservationToFolder}
                      onChange={(e) => setApplyObservationToFolder(e.target.checked)}
                      data-testid="tms-apply-observation-to-folder"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    {t("Aplicar para todos os testes.", "Apply to all tests.")}
                  </label>
                )}
              </div>

              {/* Actions Form */}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-1 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingSphereTestCase(false);
                    setIsEditingSphereTestCase(false);
                    setApplyObservationToFolder(false);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border border-slate-200"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formSphereId && formSphereTitle) {
                      const newCase: DbTestCaseSphere = {
                        id: formSphereId,
                        folder: formSphereFolder || 'Recarga de telefone',
                        title: formSphereTitle,
                        preconditions: formSpherePreconditions,
                        steps: formSphereSteps,
                        expected_result: formSphereExpectedResult,
                        observation: formSphereObservation,
                        history: [{ user: 'Reinaldo', action: isEditingSphereTestCase ? 'updated test case' : 'created test case', time: getFormattedTimestamp() }],
                        created_at: new Date().toISOString()
                      };

                      setSqliteDb((prev) => {
                        const existing = prev.test_cases_sphere || [];
                        const updated = isEditingSphereTestCase
                          ? existing.map((c) => {
                              if (c.id === newCase.id) {
                                return { ...c, ...newCase, history: [...(c.history || []), { user: 'Reinaldo', action: 'updated test case', time: getFormattedTimestamp() }] };
                              }
                              if (applyObservationToFolder && c.folder === formSphereFolder) {
                                return { ...c, observation: formSphereObservation };
                              }
                              return c;
                            })
                          : [...existing, newCase];

                        return {
                          ...prev,
                          test_cases_sphere: updated,
                        };
                      });

                      setIsCreatingSphereTestCase(false);
                      setIsEditingSphereTestCase(false);
                      setApplyObservationToFolder(false);
                      setSelectedSphereTestCaseId(newCase.id);
                    }
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-xs font-mono font-black transition-all cursor-pointer shadow-sm shadow-sky-600/10"
                  data-testid="tms-save-case-button"
                >
                  {t("Salvar", "Save")}
                </button>
              </div>
            </div>
          ) : currentCase ? (
            /* Read details pane */
            <div className="flex flex-col gap-4 text-left max-w-4xl mx-auto w-full font-sans">
              {/* Header Details */}
              <div className="border-b border-slate-200 pb-3 bg-white">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-black bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200 uppercase">
                      {getSphereCaseBadgeValue(currentCase)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {getSphereFolderDisplayLabel(currentCase.folder)}
                    </span>
                  </div>

                  <SphereCaseStatusBadge
                    testCase={currentCase}
                    localStatuses={sphereTestCaseStatuses}
                    t={t}
                    variant="light"
                  />
                </div>
                
                <h3 className="text-base font-extrabold text-slate-800 mt-2 leading-snug font-sans">
                  {getTestCaseDisplayTitle(currentCase.id, currentCase.title)}
                </h3>

                {/* Detail Sub-Tabs */}
                <div className="flex items-center gap-1.5 border-b border-slate-200 mt-3.5 bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('overview')}
                    className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                      activeDetailTab === 'overview'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t("Visão Geral", "Overview")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('evidence')}
                    className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                      activeDetailTab === 'evidence'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t("Evidências", "Evidence")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('insights')}
                    className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                      activeDetailTab === 'insights'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t("Log de Auditoria", "Audit Log")} ({(currentCase.history || []).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('scripts')}
                    className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                      activeDetailTab === 'scripts'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t("Scripts", "Scripts")}
                  </button>
                </div>
              </div>

              {activeDetailTab === 'overview' && (
                <div className="flex flex-col gap-5">
                  {/* Acceptance Criteria (.md Doc) Block */}
                  {(() => {
                    const acceptanceDoc = resolveFolderAcceptanceDoc(currentCase.folder);
                    return (
                      <div className="flex flex-col gap-1 bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 text-left">
                        <span className="text-[10px] text-sky-700 uppercase font-mono font-bold tracking-wider">
                          {t('Critério de Aceite', 'Acceptance Criteria')}
                        </span>
                        {acceptanceDoc ? (
                          <a
                            href={acceptanceDoc.doc_web_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-sky-700 hover:text-sky-900 border border-slate-200 hover:border-sky-500 rounded-lg px-3 py-2 w-fit bg-white transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                            {acceptanceDoc.doc_title}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <p className="text-[11px] font-sans text-slate-500">
                            {t('Nenhum critério importado para esta pasta.', 'No acceptance criteria imported for this folder.')}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* TEST SCENARIO / GHERKIN BDD STEPS Block */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-[10px] font-mono font-extrabold uppercase text-slate-500 tracking-wider">
                      {t("TEST SCENARIO / GHERKIN BDD STEPS", "TEST SCENARIO / GHERKIN BDD STEPS")}
                    </span>

                    {currentCase.preconditions && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-600 whitespace-pre-wrap">
                        {currentCase.preconditions}
                      </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {currentCase.steps.split('\n').map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={idx} className="h-2" />;

                        const bddKeywordRegex = /^(Dado Que|Dado que|Dado|Quando|Então|E|Mas|Given|When|Then|And|But)\b/i;
                        const match = trimmed.match(bddKeywordRegex);

                        if (match) {
                          const keyword = match[0];
                          const rest = trimmed.slice(keyword.length);
                          let kwColor = 'text-[#FF6600] font-black';
                          if (['Dado Que', 'Dado que', 'Dado', 'Given'].includes(keyword)) kwColor = 'text-sky-600 font-bold';
                          else if (['Quando', 'When'].includes(keyword)) kwColor = 'text-amber-600 font-bold';
                          else if (['Então', 'Then'].includes(keyword)) kwColor = 'text-emerald-600 font-bold';

                          return (
                            <div key={idx} className="my-1">
                              <span className={`${kwColor} uppercase pr-1.5`}>{keyword}</span>
                              <span className="text-slate-800">{rest}</span>
                            </div>
                          );
                        }

                        return <div key={idx} className="text-slate-700 my-0.5">{line}</div>;
                      })}
                    </div>
                  </div>

                  {/* EXPECTED OUTCOME Block */}
                  <div className="bg-[#F0FDF4]/65 border border-emerald-200 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-[10px] font-mono font-extrabold uppercase text-emerald-800 tracking-wider">
                      {t("EXPECTED OUTCOME", "EXPECTED OUTCOME")}
                    </span>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 font-sans leading-relaxed">
                      {currentCase.expected_result || t("Cenário executado com sucesso.", "Scenario executed successfully.")}
                    </div>
                  </div>

                  {/* OBSERVATION Block */}
                  {currentCase.observation && (
                    <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 flex flex-col gap-2">
                      <span className="text-[10px] font-mono font-extrabold uppercase text-orange-850 tracking-wider">
                        {t("OBSERVATION", "OBSERVATION")}
                      </span>
                      <div className="text-xs text-slate-800 font-sans leading-relaxed pl-2 border-l-2 border-orange-400">
                        {currentCase.observation}
                      </div>
                    </div>
                  )}

                  {/* Bottom Actions Bar */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteSphereTestCase(currentCase.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("Excluir", "Delete")}
                    </button>

                    <div className="flex items-center gap-2">
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
                          setIsCreatingSphereTestCase(false);
                        }}
                        data-testid="tms-edit-case-button"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-sky-600" />
                        {t("Editar", "Edit")}
                      </button>

                      <button
                        type="button"
                        onClick={() => setManualExecutionDialogOpen(true)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-violet-600/10 cursor-pointer"
                        title={t("Registrar execução manual deste caso de teste", "Record manual execution for this test case")}
                      >
                        <ClipboardCheck className="w-4 h-4 text-white" />
                        {t("Executar Manualmente", "Run Manually")}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunSingleTestCaseReal(currentCase)}
                        className="bg-[#FF6600] hover:bg-[#E05500] text-white px-4.5 py-2.5 rounded-xl text-xs font-mono font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-[#FF6600]/10 cursor-pointer ml-1"
                        title={t("Executar somente este caso pela tag Robot", "Run only this test case by its Robot tag")}
                      >
                        <PlayCircle className="w-4 h-4 stroke-[2.5px]" />
                        {t("Executar Teste Automatizado", "Run Automated Test")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'evidence' && (
                <TestCaseEvidenceTab
                  testCaseId={currentCase.id}
                  t={t}
                />
              )}

              {activeDetailTab === 'insights' && (
                <div className="flex flex-col gap-2.5 text-left font-mono">
                  <span className="text-[10px] text-sky-700 uppercase font-mono font-bold tracking-wider">{t("Histórico de Alterações (Log de Auditoria)", "Change History (Audit Log)")}</span>
                  
                  <div className="relative border-l border-slate-200 pl-4 ml-1 flex flex-col gap-4 py-2">
                    {(currentCase.history || []).map((h, i) => (
                      <div key={i} className="relative text-[11px] flex flex-col">
                        <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-100 border-2 border-slate-350" />
                        <div className="flex items-center gap-1 text-slate-450 text-[10px]">
                          <span className="text-slate-650 font-bold">{h.user}</span>
                          <span>•</span>
                          <span className="text-slate-400">{h.time}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{h.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailTab === 'scripts' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">SQL QUERY:</span>
                    <textarea
                      rows={10}
                      value={sphereCustomSqlQuery[currentCase.id] !== undefined ? sphereCustomSqlQuery[currentCase.id] : getDefaultSqlQuery(currentCase.id)}
                      onChange={(e) => {
                        setSphereCustomSqlQuery(prev => ({
                          ...prev,
                          [currentCase.id]: e.target.value
                        }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-[11px] text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none selection:bg-sky-100 placeholder:text-slate-400 leading-relaxed resize-y"
                      placeholder={t("Digite ou edite suas queries SQL aqui...", "Type or edit your SQL queries here...")}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">SCRIPT LANGUAGE:</span>
                    <textarea
                      rows={10}
                      value={sphereCustomScriptLanguage[currentCase.id] !== undefined ? sphereCustomScriptLanguage[currentCase.id] : getDefaultScriptLanguage(currentCase.id, currentCase.title)}
                      onChange={(e) => {
                        setSphereCustomScriptLanguage(prev => ({
                          ...prev,
                          [currentCase.id]: e.target.value
                        }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-[11px] text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none selection:bg-sky-100 placeholder:text-slate-400 leading-relaxed resize-y"
                      placeholder={t("# Digite ou edite seus scripts ou códigos aqui...", "# Type or edit your scripts or code here...")}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 font-mono text-xs gap-3">
              <Compass className="w-10 h-10 text-slate-300 animate-pulse" />
              {t("Selecione um Caso de Teste na lista ao lado para ver as precondições, passos e histórico.", "Select a Test Case from the list on the side to view preconditions, steps, and history.")}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-400 shrink-0 shadow-sm">
        <span></span>
        <span>{t("Total:", "Total:")} {(sqliteDb.test_cases_sphere || []).length} {t("casos de testes arquivados", "test cases archived")}</span>
      </footer>

      {/* Manual Execution Dialog */}
      {currentCase && (
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
    </div>
  );
};
