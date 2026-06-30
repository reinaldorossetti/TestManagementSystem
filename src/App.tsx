/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  Play, 
  Terminal as TerminalIcon, 
  Database, 
  ArrowLeft,
  FileText, 
  Cpu, 
  Layers, 
  Settings, 
  RefreshCw, 
  Search, 
  Code, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  HelpCircle, 
  FileCode, 
  PlayCircle,
  Table,
  ChevronRight,
  DatabaseZap,
  Check,
  Clipboard,
  Sliders,
  FolderTree,
  ExternalLink,
  BookOpen,
  Edit,
  Plus,
  X,
  Globe,
  Upload,
  Folder,
  FolderOpen,
  Compass,
  FileSpreadsheet
} from 'lucide-react';
import { parseGherkinFeature, ParsedScenario, ParsedFeature } from './utils/featureLoader';
import { INITIAL_DB_SEED, executeVirtualSQL, DbExecution, DbTestCase, DbStepLog, VirtualDatabase, DbTestCaseSphere, DbTestSpec, DbFolderAcceptanceDoc } from './utils/sqliteEngine';
import { ExecutionReports } from './components/ExecutionReports';
import { LiveTerminal } from './components/LiveTerminal';
import { TestCaseEvidenceTab } from './components/TestCaseEvidenceTab';
import { handleExportToExcel } from './utils/excelExporter';
import { handleExportTestCasesToPDF } from './utils/pdfExporter';
import { buildFeatureRobotCommand } from './utils/robotCommands';
import {
  createRunFolderForTimestamp,
  formatRobotRunTimestamp,
  persistRobotRunOutput,
  runRobotCommandStreaming,
} from './utils/robotRunner';
import {
  buildExecutionTagsFromRobotTestTags,
  extractRobotExecutionTags,
  resolveRobotFolderLabel,
  type ExecutionTagOption,
  type RobotTestTagEntry,
} from './utils/robotTagLoader';
import { useDatabase } from './hooks/useDatabase';
import { createTranslator } from './utils/i18n';
import { apiClient } from './lib/api/client';
import {
  acceptanceDocRepoRelativePath,
  acceptanceDocWebPath,
} from './utils/acceptanceDocPaths';

// Helper to render terminal log lines beautifully with soft/light GIVEN, WHEN, THEN colors
const renderLoggedStep = (text: string) => {
  const stepRegex = /^\s*(Step\s*\|\s*\[)(GIVEN|WHEN|THEN|AND|BUT)(\])\s+(Dado que|Dado|Quando|Então|E|Mas|Given|When|Then|And|But)?(.*)$/i;
  const match = text.match(stepRegex);

  if (!match) {
    return <span>{text}</span>;
  }

  const prefix = "  Step  |  ";
  const type = match[2]; // GIVEN, WHEN, etc.
  const rawType = match[4] || ""; // Dado que, Quando, etc.
  const rest = match[5] || ""; // rest of the text

  // Set up soft and light color classes (text color + background glow + soft/light micro border)
  let typeColorClass = "";
  let rawTypeColorClass = "";

  if (type.toUpperCase() === 'GIVEN') {
    typeColorClass = "text-sky-300 bg-sky-950/40 border border-sky-800/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-sky-200/90 font-bold";
  } else if (type.toUpperCase() === 'WHEN') {
    typeColorClass = "text-amber-300 bg-amber-950/40 border border-amber-800/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-amber-200/90 font-bold";
  } else if (type.toUpperCase() === 'THEN') {
    typeColorClass = "text-red-300 bg-red-950/45 border border-red-800/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-red-200/90 font-bold";
  } else {
    // AND / BUT / default
    typeColorClass = "text-slate-300 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-slate-300 font-bold";
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 font-mono">
      <span className="text-slate-500 font-bold">{prefix}</span>
      <span className={typeColorClass}>[{type}]</span>
      {rawType && <span className={rawTypeColorClass}>{rawType}</span>}
      <span className="text-slate-300 font-medium">{rest}</span>
    </span>
  );
};


// Hardcoded initial contents representing the Portuguese BDD Feature file (/features/tms.feature)
const INITIAL_GHERKIN_CONTENT = `# language: pt
# encoding: utf-8

Funcionalidade: Jornada de Entrada e Associação de Estabelecimentos - TMS
  Como um parceiro ou administrador de estabelecimento comercial,
  Eu quero me autenticar com segurança, ler as diferenças entre os formatos e associar meu novo cadastro (Cliente Separado ou Vinculado),
  Para que eu possa gerenciar minhas contas de liquidação bancária e operar de acordo com as permissões da minha conta.

  # =========================================================================
  # MÓDULO 1: AUTENTICAÇÃO (LOGIN)
  # =========================================================================

  @RCT01
  Cenário: Senha de acesso válida ativa fluxo principal
    Dado que o usuário está na tela de autenticação 'Digite sua senha de acesso'
    E que a conta de acesso correspondente está ativa no sistema
    Quando ele preenche o campo de texto 'Senha' com a senha de acesso válida '123456'
    E clica no botão 'Continuar'
    Então o sistema autoriza o acesso no servidor de autenticação
    E o usuário é redirecionado imediatamente para a tela de 'Escolha de associação'.

  @RCT02
  Cenário: Desabilitação do botão continuar com campo de senha vazio
    Dado que o usuário está na tela de senha do TMS
    Quando o campo de digitação 'Senha' estiver totalmente vazio
    Então o botão de ação principal 'Continuar' deve permanecer bloqueado em estado visual cinza desabilitado
    E qualquer tentativa de clique ou envio não deve disparar nenhuma requisição ou erro de API.

  @RCT03
  Cenário: Exibição de alerta visual ao digitar senha incorreta
    Dado que o usuário está na tela de acesso do TMS
    Quando insere uma senha incorreta ex: '999999' no campo 'Senha'
    E clica no botão 'Continuar'
    Então o sistema impede o logon.

  # =========================================================================
  # MÓDULO 2: ENTENDA A DIFERENÇA (ONBOARDING)
  # =========================================================================

  @RCT04
  Cenário: Navegação avançando pelas orientações do carrossel
    Dado que o usuário abriu a ajuda explicativa 'Entenda a diferença'
    Quando clica no botão ativo laranja 'Próximo ->'
    Então o carrossel realiza a transição para o Slide 2 explicativo de texto detalhado.

  @RCT05
  Cenário: Conclusão do onboarding direcionará à seleção
    Dado que o usuário está analisando os tópicos de saldo no Slide 2 do tutorial
    Quando clica no botão laranja com rótulo 'Entendi' na parte inferior da tela
    Então o onboarding deve ser fechado com suavidade.

  # =========================================================================
  # MÓDULO 3: ESCOLHA DE ASSOCIAÇÃO
  # =========================================================================

  @RCT06
  Cenário: Inexistência de atalho para cadastrar novas lojas no menu suspenso de alternação
    Dado que o lojista está logado no painel do TMS
    Quando abre o menu flutuante de alternação rápida e verifica os comandos disponíveis
    Então o sistema não deve exibir o botão ou link para 'Cadastrar nova loja' no atalho 'Alternar entre lojas'
    E mantém apenas a listagem limpa de filiais autorizadas já ativas para seleção rápida.

  @RCT07
  Cenário: Supressão do botão cadastral sob o menu Meu Negócio - Lojas
    Dado que o usuário navega na seção 'Meu Negócio'
    E acessa a sub-página de gerenciamento de 'Lojas'
    Quando a lista de filiais ativas é carregada na tela
    Então a opção para inicializar abertura ou cadastro de nova loja não aparece mais em Meu Negócio > Lojas.

  @RCT08
  Cenário: Abertura automática do painel de associação após leitura de QR Code de Vínculo
    Dado que o lojista iniciou a câmera integrada do dispositivo móvel
    E apota para um QR Code de ativação de novo PDV ou filial
    Quando realiza com sucesso a leitura do QR Code de vínculo
    Então o lojista visualiza a tela 'Escolha como quer associar seu novo cadastro' preenchendo as informações contextuais da nova unidade.

  @RCT09
  Cenário: Exibição clara de Cliente Separado e Cliente Vinculado com definições operacionais
    Dado que a tela de seleção de tipo de associação 'Escolha como quer associar seu novo cadastro' está carregada
    Quando o usuário revisa as opções de associação
    Então as opções 'Cliente Separado' e 'Cliente Vinculado' são exibidas com suas respectivas descrições e características detalhadas.

  @RCT10
  Cenário: Disponibilidade do link Entenda a Diferença e bloqueio de prosseguimento sem seleção prévia
    Dado que o usuário está na tela de decisão de vínculo e associação
    E o link 'Entenda a diferença' está disponível na tela para suporte
    Quando o usuário tenta avançar sem selecionar nenhuma opção de vinculação
    Então o botão 'Continuar' só é habilitado após a seleção de uma das opções 'Cliente Separado' ou 'Cliente Vinculado'.

  # =========================================================================
  # MÓDULO 4: VALIDAÇÕES DE PERMISSÕES E SEGURANÇA (NEGÓCIO)
  # =========================================================================

  @RCT11
  Cenário: Permissão de Perfil Representante Legal autoriza a criação do modelo Cliente Separado
    Dado que o usuário realizou autenticação com perfil de 'Representante Legal' via CPF
    E está na tela de configuração de cadastro do TMS
    Quando tenta marcar 'Cliente Separado' e submete a transição com clique em 'Continuar'
    Então o formulário não exige duplo fator regulatório adicional.

  @RCT12
  Cenário: Permissão de Funcionário bloqueada para criação de conta de liquidação própria
    Dado que o usuário está autenticado com o perfil de 'Funcionário' via CPF sem autonomia financeira
    Quando ele seleciona 'Cliente Separado' e tenta avançar clicando em 'Continuar'
    Então a mudança de tela é abortada de imediato por falta de privilégio na chave do Representative
    E exibe-se um modal vermelho impeditivo.`;

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

export type WorkspaceFeature = 'terminal' | 'sqlite' | 'reports' | 'tms';

interface AppProps {
  /**
   * Feature pinned by the current route (e.g. /reports renders App with
   * `initialTab="reports"`). When omitted, it is derived from the URL pathname,
   * falling back to the legacy `?tab=` query param for backward compatibility.
   */
  initialTab?: WorkspaceFeature;
}

const isWorkspaceFeature = (value: string | null | undefined): value is WorkspaceFeature =>
  value === 'terminal' || value === 'sqlite' || value === 'reports' || value === 'tms';

export default function App({ initialTab }: AppProps = {}) {
  // Gherkin source state
  const [gherkinContent, setGherkinContent] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cardmais_gherkin_content');
      if (saved) return saved;
    }
    return INITIAL_GHERKIN_CONTENT;
  });
  const [parsedFeature, setParsedFeature] = useState<ParsedFeature>(() => {
    const initialText = (typeof window !== 'undefined' && localStorage.getItem('cardmais_gherkin_content')) || INITIAL_GHERKIN_CONTENT;
    return parseGherkinFeature(initialText);
  });

  useEffect(() => {
    localStorage.setItem('cardmais_gherkin_content', gherkinContent);
    try {
      setParsedFeature(parseGherkinFeature(gherkinContent));
    } catch (e) {
      console.error("Syntax error parsing Gherkin:", e);
    }
  }, [gherkinContent]);
  const [scenarioStatuses, setScenarioStatuses] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('cardmais_scenario_statuses');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    const parsed = parseGherkinFeature(INITIAL_GHERKIN_CONTENT);
    const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
    parsed.scenarios.forEach(sc => {
      initialObj[sc.id] = 'Not executed';
    });
    return initialObj;
  });

  useEffect(() => {
    localStorage.setItem('cardmais_scenario_statuses', JSON.stringify(scenarioStatuses));
  }, [scenarioStatuses]);

  const [sphereTestCaseStatuses, setSphereTestCaseStatuses] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('cardmais_sphere_statuses');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
    if (INITIAL_DB_SEED && INITIAL_DB_SEED.test_cases_sphere) {
      INITIAL_DB_SEED.test_cases_sphere.forEach(tc => {
        initialObj[tc.id] = 'Not executed';
      });
    }
    return initialObj;
  });

  useEffect(() => {
    localStorage.setItem('cardmais_sphere_statuses', JSON.stringify(sphereTestCaseStatuses));
  }, [sphereTestCaseStatuses]);
  const [isEditingGherkin, setIsEditingGherkin] = useState<boolean>(false);
  const [gherkinTempText, setGherkinTempText] = useState<string>(INITIAL_GHERKIN_CONTENT);
  const [pendingExecutionOnLoad, setPendingExecutionOnLoad] = useState<boolean>(false);
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

  // Command configurations
  const [executionTags, setExecutionTags] = useState<ExecutionTagOption[]>([]);
  const [filterTag, setFilterTag] = useState<string>('');
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [argsFile, setArgsFile] = useState<string>('project_args_file.txt');
  const [customCommand, setCustomCommand] = useState<string>('');

  const applyExecutionTagsFromRobot = (
    entries: RobotTestTagEntry[],
    options?: { log?: boolean; logPrefix?: string },
  ) => {
    const clearedTags = buildExecutionTagsFromRobotTestTags(entries);
    setExecutionTags(clearedTags);

    if (clearedTags.length > 0) {
      setFilterTag(clearedTags[0].value);
      if (options?.log !== false) {
        appendTerminalLog(
          `${options?.logPrefix ?? '[TAGS]'} Test Tags / [Tags] Robot: @${clearedTags[0].value}`,
          'success',
        );
      }
    } else {
      setFilterTag('');
      if (options?.log !== false) {
        appendTerminalLog(
          `${options?.logPrefix ?? '[TAGS]'} Nenhuma tag Robot encontrada em robot-sample/.`,
          'info',
        );
      }
    }
  };

  const refreshExecutionTagsFromRobotSample = async (options?: { log?: boolean }) => {
    try {
      const res = await fetch('/api/terminal/robot-tags');
      if (!res.ok) throw new Error(res.statusText);
      const data = (await res.json()) as { tags: RobotTestTagEntry[] };
      applyExecutionTagsFromRobot(data.tags ?? [], {
        log: options?.log,
        logPrefix: '[TAGS]',
      });
    } catch (error) {
      if (options?.log !== false) {
        appendTerminalLog(
          `[TAGS] Falha ao carregar Test Tags: ${error instanceof Error ? error.message : 'erro'}`,
          'warn',
        );
      }
    }
  };

  useEffect(() => {
    void refreshExecutionTagsFromRobotSample({ log: false });
  }, []);

  const handleAddCustomTag = () => {
    if (!newTagInput.trim()) return;
    let cleanTag = newTagInput.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase();
    if (!cleanTag) return;
    
    const newValue = cleanTag;
    const newLabel = `@${cleanTag} (Manual)`;
    
    const exists = executionTags.some(t => t.value === newValue);
    if (!exists) {
      setExecutionTags(prev => [...prev, { value: newValue, label: newLabel }]);
    }
    setFilterTag(newValue);
    setNewTagInput('');
  };

  // Tag Manager Modal State
  const [isTagModalOpen, setIsTagModalOpen] = useState<boolean>(false);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editTagValue, setEditTagValue] = useState<string>('');
  const [editTagLabel, setEditTagLabel] = useState<string>('');
  const [modalNewTagValue, setModalNewTagValue] = useState<string>('');
  const [modalNewTagLabel, setModalNewTagLabel] = useState<string>('');

  // File Upload Drag & Drop State and Ref
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const acceptanceDocInputRef = useRef<HTMLInputElement>(null);

  const importFileContent = (text: string, filename: string) => {
    try {
      setGherkinContent(text);
      setGherkinTempText(text);
      const parsed = parseGherkinFeature(text);
      setParsedFeature(parsed);
      setSelectedScenarioId(null);
      
      const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
      parsed.scenarios.forEach(sc => {
        initialObj[sc.id] = 'Not executed';
      });
      setScenarioStatuses(initialObj);
      
      // Reset terminal logs and stream import logs
      setTerminalLogs([]);
      appendTerminalLog(`==============================================================================`, 'header');
      appendTerminalLog(`[IMPORT] Arquivo "${filename}" carregado com sucesso via upload!`, 'success');
      appendTerminalLog(`==============================================================================`, 'header');
      appendTerminalLog(`[PARSER] ${parsed.scenarios.length} cenários de teste identificados com sucesso.`, 'info');

      if (filename.toLowerCase().endsWith('.robot')) {
        const robotTags = extractRobotExecutionTags(text).map((tag) => ({
          tag,
          sourceFile: filename,
        }));
        applyExecutionTagsFromRobot(robotTags, { logPrefix: '[TAGS]' });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      appendTerminalLog(`[ERROR] Erro ao carregar arquivo importado: ${message}`, 'error');
      alert("Erro ao decodificar o arquivo. Certifique-se de que é um formato válido BDD ou Gherkin.");
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          importFileContent(event.target.result, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          importFileContent(event.target.result, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteTag = (valueToDelete: string) => {
    setExecutionTags((prev) => {
      const updated = prev.filter((t) => t.value !== valueToDelete);
      setFilterTag((current) =>
        current === valueToDelete ? (updated[0]?.value ?? '') : current,
      );
      return updated;
    });
  };

  const handleStartEditTag = (index: number) => {
    setEditingTagIndex(index);
    setEditTagValue(executionTags[index].value);
    setEditTagLabel(executionTags[index].label);
  };

  const handleSaveEditTag = () => {
    if (editingTagIndex === null) return;
    const cleanVal = editTagValue.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase();
    const cleanLabel = editTagLabel.trim() || `@${cleanVal}`;
    
    if (!cleanVal) return;

    // Check for duplicate value (excluding the one being edited)
    const activeEditingTag = executionTags[editingTagIndex];
    const duplicate = executionTags.some((t, i) => i !== editingTagIndex && t.value === cleanVal);
    if (duplicate) {
      alert("Já existe uma tag cadastrada com essa chave de valor.");
      return;
    }

    const updated = [...executionTags];
    updated[editingTagIndex] = { value: cleanVal, label: cleanLabel };
    setExecutionTags(updated);

    // If the active filter had the old value, update it
    if (filterTag === activeEditingTag.value) {
      setFilterTag(cleanVal);
    }

    setEditingTagIndex(null);
    setEditTagValue('');
    setEditTagLabel('');
  };

  const handleAddTagFromModal = () => {
    const cleanVal = modalNewTagValue.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase();
    const desiredLabel = modalNewTagLabel.trim();
    const cleanLabel = desiredLabel ? (desiredLabel.startsWith('@') ? desiredLabel : `@${desiredLabel}`) : `@${cleanVal} (Manual)`;
    
    if (!cleanVal) {
      alert("A chave da tag não pode ser vazia.");
      return;
    }

    const duplicate = executionTags.some(t => t.value === cleanVal);
    if (duplicate) {
      alert("Uma tag com esse valor já existe.");
      return;
    }

    setExecutionTags(prev => [...prev, { value: cleanVal, label: cleanLabel }]);
    setFilterTag(cleanVal);
    setModalNewTagValue('');
    setModalNewTagLabel('');
  };
  
  // Virtual SQLite State, now backed by the Next.js backend (Prisma + SQLite).
  // The hook loads a snapshot, persists changes through the API and keeps every
  // open tab synchronized via BroadcastChannel.
  const {
    sqliteDb,
    setSqliteDb,
    reset: resetDatabaseRemote,
    clearExecutions: clearExecutionsRemote,
    runSql: runSqlRemote,
  } = useDatabase();

  // DB View Settings
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab ] = useState<WorkspaceFeature>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined') {
      const segment = window.location.pathname.split('/').filter(Boolean)[0];
      if (isWorkspaceFeature(segment)) return segment;
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (isWorkspaceFeature(tabParam)) return tabParam;
    }
    return 'terminal';
  });
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const [sqliteSubTab, setSqliteSubTab] = useState<'browse' | 'playground'>('browse');
  const [browseTableName, setBrowseTableName] = useState<'executions' | 'test_cases' | 'steps'>('executions');

  // Interactive SQL Console Query State
  const [rawSqlInput, setRawSqlInput] = useState<string>('SELECT * FROM executions ORDER BY timestamp DESC');
  const [sqlResults, setSqlResults] = useState<{ columns: string[]; rows: Record<string, unknown>[]; error?: string; count: number }>({
    columns: ['id', 'timestamp', 'command', 'duration_s', 'total_tests', 'passed', 'failed', 'status'],
    rows: INITIAL_DB_SEED.executions as unknown as Record<string, unknown>[],
    count: INITIAL_DB_SEED.executions.length
  });
  const [sqlLatency, setSqlLatency] = useState<number | null>(null);

  // Running state for real Robot execution
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<{ id: number; text: string; mode: 'info' | 'success' | 'warn' | 'error' | 'cmd' | 'header' }[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({
    totalExecutions: 0,
    averageDuration: 0,
    totalPassRate: 100,
    totalStepsRow: 0
  });

  // Test Specifications Repository Management (TestLink layout)
  const [isTestSpecsOpen, setIsTestSpecsOpen] = useState<boolean>(false);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>('SPEC-001');
  const [isCreatingSpec, setIsCreatingSpec] = useState<boolean>(false);
  const [isEditingSpec, setIsEditingSpec] = useState<boolean>(false);

  // Form states for Test Specs CRUD
  const [formSpecId, setFormSpecId] = useState<string>('');
  const [formSpecName, setFormSpecName] = useState<string>('');
  const [formSpecCategory, setFormSpecCategory] = useState<string>('');
  const [formSpecTags, setFormSpecTags] = useState<string>('');
  const [formSpecContent, setFormSpecContent] = useState<string>('');

  // TMS Test Cases Management (3-Panes Layout)
  const [selectedSphereFolder, setSelectedSphereFolder] = useState<string>('br.com.grupocard.contacard.dev/Recarga de telefone');
  const [selectedSphereTestCaseId, setSelectedSphereTestCaseId] = useState<string | null>('RECEL01');
  const [searchSphereQuery, setSearchSphereQuery] = useState<string>('');
  const [isEditingSphereTestCase, setIsEditingSphereTestCase] = useState<boolean>(false);
  const [isCreatingSphereTestCase, setIsCreatingSphereTestCase] = useState<boolean>(false);
  const [sphereActiveDetailTab, setSphereActiveDetailTab] = useState<'overview' | 'evidence' | 'insights' | 'scripts'>('overview');
  const [sphereCustomSqlQuery, setSphereCustomSqlQuery] = useState<{[key: string]: string}>({});
  const [sphereCustomScriptLanguage, setSphereCustomScriptLanguage] = useState<{[key: string]: string}>({});

  // New folder state
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isEditingFolder, setIsEditingFolder] = useState<boolean>(false);
  const [newFolderNameValue, setNewFolderNameValue] = useState<string>('');
  const [editFolderNameValue, setEditFolderNameValue] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Test Case CRUD within TMS
  const [formSphereId, setFormSphereId] = useState<string>('');
  const [formSphereFolder, setFormSphereFolder] = useState<string>('');
  const [formSphereTitle, setFormSphereTitle] = useState<string>('');
  const [formSpherePreconditions, setFormSpherePreconditions] = useState<string>('');
  const [formSphereSteps, setFormSphereSteps] = useState<string>('');
  const [formSphereExpectedResult, setFormSphereExpectedResult] = useState<string>('');
  const [formSphereObservation, setFormSphereObservation] = useState<string>('');

  // Recompute dashboard stats whenever the database changes.
  // Persistence is handled by useDatabase (backend API), no longer localStorage.
  useEffect(() => {
    const execs = sqliteDb.executions || [];
    const totalExecutions = execs.length;
    const totalDuration = execs.reduce((acc, c) => {
      const val = c.duration_s ?? 0;
      return acc + (val || 0);
    }, 0);
    const averageDuration = totalExecutions > 0 ? parseFloat((totalDuration / totalExecutions).toFixed(2)) : 0;
    
    const passedExecs = execs.filter(e => e.status === 'PASS').length;
    const totalPassRate = totalExecutions > 0 ? Math.round((passedExecs / totalExecutions) * 100) : 100;
    const totalStepsRow = sqliteDb.steps.length;

    setStats({
      totalExecutions,
      averageDuration,
      totalPassRate,
      totalStepsRow
    });
  }, [sqliteDb]);

  // Synchronize UI-preference state across tabs via StorageEvent.
  // Database synchronization is handled by useDatabase via BroadcastChannel.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cardmais_scenario_statuses' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setScenarioStatuses(parsed);
        } catch (err) {
          console.error("Erro ao sincronizar status de cenários via StorageEvent:", err);
        }
      }
      if (e.key === 'cardmais_sphere_statuses' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSphereTestCaseStatuses(parsed);
        } catch (err) {
          console.error("Erro ao sincronizar status de casos do TMS via StorageEvent:", err);
        }
      }
      if (e.key === 'cardmais_gherkin_content' && e.newValue) {
        setGherkinContent(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Command preview compiler helper
  const getCompiledCommand = () => {
    const active = executionTags.find((t) => t.value === filterTag);
    return buildFeatureRobotCommand(filterTag, active?.sourceFile);
  };

  const handleOpenReportHTML = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const reportUrl = `${window.location.origin}/report.html`;
    const w = window.open(reportUrl, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = reportUrl;
      a.target = '_blank';
      a.click();
    }
  };

  const handleOpenOutputXML = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const outputUrl = `${window.location.origin}/output.xml`;
    const w = window.open(outputUrl, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = outputUrl;
      a.target = '_blank';
      a.click();
    }
  };

  const handleOpenLogHTML = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const logUrl = `${window.location.origin}/log.html`;
    const w = window.open(logUrl, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = logUrl;
      a.target = '_blank';
      a.click();
    }
  };

  // Log streaming helper
  const appendTerminalLog = (text: string, mode: 'info' | 'success' | 'warn' | 'error' | 'cmd' | 'header' = 'info') => {
    setTerminalLogs(prev => [...prev, { id: Date.now() + Math.random(), text, mode }]);
  };

  // Gherkin editor saving trigger
  const handleSaveGherkin = () => {
    setGherkinContent(gherkinTempText);
    const parsed = parseGherkinFeature(gherkinTempText);
    setParsedFeature(parsed);
    
    const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
    parsed.scenarios.forEach(sc => {
      initialObj[sc.id] = 'Not executed';
    });
    setScenarioStatuses(initialObj);
    
    setIsEditingGherkin(false);
    setSelectedScenarioId(null);
    
    // Log the successful parsing inside virtual dashboard terminal
    setTerminalLogs([]);
    appendTerminalLog(`[SYSTEM] Arquivo .feature atualizado pelo usuário e compilado com sucesso!`, 'success');
    appendTerminalLog(`[PARSER] ${parsed.scenarios.length} cenários de teste BDD mapeados e sincronizados para execução.`, 'info');
  };

  // SQLite manual SQL execute controller (read-only, runs on the backend).
  const handleExecuteRawSQL = async () => {
    const start = performance.now();
    try {
      const result = await runSqlRemote(rawSqlInput);
      setSqlResults(result);
    } catch (error) {
      setSqlResults({
        columns: [],
        rows: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Erro ao executar a consulta.',
      });
    } finally {
      const end = performance.now();
      setSqlLatency(Number((end - start).toFixed(2)));
    }
  };

  // Limpa somente execuções / test_cases / steps (preserva TMS, specs e pastas).
  const handleClearExecutionHistory = async () => {
    if (
      !window.confirm(
        language === 'PT'
          ? 'Deseja zerar todo o histórico de execuções? Os casos TMS e especificações serão preservados.'
          : 'Clear all execution history? TMS cases and specifications will be kept.',
      )
    ) {
      return;
    }

    try {
      await clearExecutionsRemote();
    } catch (error) {
      appendTerminalLog(
        `[SQLITE] Falha ao limpar execuções: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
        'error',
      );
      return;
    }

    setRawSqlInput('SELECT * FROM executions ORDER BY timestamp DESC');
    setSqlResults({ columns: [], rows: [], count: 0 });
    appendTerminalLog(`[SQLITE] Histórico de execuções zerado. Pronto para novos runs reais.`, 'success');
  };

  // Clean SQLite database (resets to the seed dataset on the backend).
  const handleResetDatabase = async () => {
    if (!window.confirm("Deseja realmente reiniciar o banco para o estado inicial? (Execuções, specs TMS e pastas demo serão restaurados)")) {
      return;
    }

    try {
      await resetDatabaseRemote();
    } catch (error) {
      appendTerminalLog(`[SQLITE] Falha ao reiniciar o banco: ${error instanceof Error ? error.message : 'erro desconhecido'}`, 'error');
      return;
    }

    setRawSqlInput('SELECT * FROM executions ORDER BY timestamp DESC');
    setSqlResults({ columns: [], rows: [], count: 0 });
    setTerminalLogs([]);

    // Reset sphere test cases status
    const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
    if (INITIAL_DB_SEED && INITIAL_DB_SEED.test_cases_sphere) {
      INITIAL_DB_SEED.test_cases_sphere.forEach(tc => {
        initialObj[tc.id] = 'Not executed';
      });
    }
    setSphereTestCaseStatuses(initialObj);
    localStorage.setItem('cardmais_sphere_statuses', JSON.stringify(initialObj));

    appendTerminalLog(`[SQLITE] Banco de dados local reiniciado com sucesso para as tabelas default.`, 'warn');
  };

  // --- TESTLINK SPECIFICATIONS CRUD ---

  const loadSpecToActiveWorkspace = (content: string) => {
    setGherkinContent(content);
    setGherkinTempText(content);
    const parsed = parseGherkinFeature(content);
    setParsedFeature(parsed);
    
    const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
    parsed.scenarios.forEach(sc => {
      initialObj[sc.id] = 'Not executed';
    });
    setScenarioStatuses(initialObj);
    
    setIsEditingGherkin(false);
    setSelectedScenarioId(null);
    setIsTestSpecsOpen(false); // Close modal once loaded
    
    setTerminalLogs([]);
    appendTerminalLog(`[TESTLINK] Carregado especificação do repositório no Workspace principal!`, 'success');
    appendTerminalLog(`[PARSER] ${parsed.scenarios.length} cenários de teste Gherkin mapeados e prontos para execução.`, 'info');
  };

  const handleOpenCreateSpec = () => {
    setIsCreatingSpec(true);
    setIsEditingSpec(false);
    const specs = sqliteDb.test_specs || [];
    const maxNumber = specs.reduce((max, s) => {
      const num = parseInt(s.id.replace('SPEC-', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextId = `SPEC-${String(maxNumber + 1).padStart(3, '0')}`;
    
    setFormSpecId(nextId);
    setFormSpecName('');
    setFormSpecCategory('Automação QA');
    setFormSpecTags('@dynamic, @robot');
    setFormSpecContent(`Feature: Nova Especificação Criada\n  Como QA da TMS\n  Quero validar um novo cenário do sistema\n\n  Scenario: Novo Cenário de Teste BDD\n    Dado que o usuário abriu a nova seção de automação\n    Quando realiza a interação com os cards de teste\n    Então o sistema deve registrar a ação com sucesso.`);
  };

  const handleOpenEditSpec = (spec: DbTestSpec) => {
    setIsEditingSpec(true);
    setIsCreatingSpec(false);
    setFormSpecId(spec.id);
    setFormSpecName(spec.name);
    setFormSpecCategory(spec.category);
    setFormSpecTags(spec.tags);
    setFormSpecContent(spec.content);
  };

  const handleSaveSpec = () => {
    if (!formSpecName.trim()) {
      alert("Por favor, preencha o Nome da Especificação.");
      return;
    }
    if (!formSpecContent.trim()) {
      alert("Por favor, preencha a escrita BDD/ATDD em formato Gherkin/Robot.");
      return;
    }

    const specs = sqliteDb.test_specs || [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (isCreatingSpec) {
      const newSpec = {
        id: formSpecId,
        name: formSpecName,
        category: formSpecCategory,
        tags: formSpecTags,
        content: formSpecContent,
        created_at: now
      };
      
      const updatedSpecs = [...specs, newSpec];
      const updatedDb = { ...sqliteDb, test_specs: updatedSpecs };
      setSqliteDb(updatedDb);
      setIsCreatingSpec(false);
      setSelectedSpecId(newSpec.id);
      appendTerminalLog(`[TESTLINK] Nova suite '${newSpec.name}' (${newSpec.id}) foi cadastrada com sucesso!`, 'success');
    } else if (isEditingSpec) {
      const updatedSpecs = specs.map(s => {
        if (s.id === formSpecId) {
          return {
            ...s,
            name: formSpecName,
            category: formSpecCategory,
            tags: formSpecTags,
            content: formSpecContent
          };
        }
        return s;
      });
      const updatedDb = { ...sqliteDb, test_specs: updatedSpecs };
      setSqliteDb(updatedDb);
      setIsEditingSpec(false);
      appendTerminalLog(`[TESTLINK] Suite '${formSpecName}' editada e salva com sucesso.`, 'success');
    }
  };

  const handleSaveCurrentWorkspaceAsSpec = () => {
    const parsed = parseGherkinFeature(gherkinContent);
    const specs = sqliteDb.test_specs || [];
    const maxNumber = specs.reduce((max, s) => {
      const num = parseInt(s.id.replace('SPEC-', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextId = `SPEC-${String(maxNumber + 1).padStart(3, '0')}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const tagsArr: string[] = [];
    parsed.scenarios.forEach(sc => {
      sc.tags.forEach(t => {
        if (t && !tagsArr.includes(t)) tagsArr.push(t);
      });
    });

    const newSpec = {
      id: nextId,
      name: parsed.title || "Especificação Importada",
      category: "Importados QA",
      tags: tagsArr.length > 0 ? tagsArr.join(', ') : '',
      content: gherkinContent,
      created_at: now
    };

    const updatedDb = { ...sqliteDb, test_specs: [...specs, newSpec] };
    setSqliteDb(updatedDb);
    setSelectedSpecId(nextId);
    appendTerminalLog(`[TESTLINK] Gravado Workspace Gherkin atual no Repositório como '${newSpec.name}' (${newSpec.id})!`, 'success');
    setIsTestSpecsOpen(true);
  };

  const handleDeleteSpec = (id: string) => {
    if (window.confirm("Deseja realmente excluir esta especificação do seu repositório de testes?")) {
      const specs = sqliteDb.test_specs || [];
      const updatedSpecs = specs.filter(s => s.id !== id);
      const updatedDb = { ...sqliteDb, test_specs: updatedSpecs };
      setSqliteDb(updatedDb);
      
      const firstLeft = updatedSpecs.length > 0 ? updatedSpecs[0].id : null;
      setSelectedSpecId(firstLeft);
      setIsCreatingSpec(false);
      setIsEditingSpec(false);
      appendTerminalLog(`[TESTLINK] Especificação ${id} removida do repositório.`, 'warn');
    }
  };

  const resolveFolderAcceptanceDoc = (folderPath: string): DbFolderAcceptanceDoc | null =>
    (sqliteDb.folder_acceptance_docs || []).find((doc) => doc.folder_path === folderPath) ?? null;

  const handleImportAcceptanceDocClick = () => {
    if (!selectedSphereFolder || selectedSphereFolder === 'all') return;
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
      appendTerminalLog(
        `[TMS] Critérios de aceite importados para "${selectedSphereFolder}" (${doc.repo_relative_path}).`,
        'success',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao importar critérios de aceite.';
      alert(message);
    }
  };

  const handleDeleteAcceptanceDoc = async (folderPath: string) => {
    const folderLabel = folderPath.includes('/') ? folderPath.split('/').pop()! : folderPath;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir os critérios de aceite de "${folderLabel}"?\n\nO arquivo será removido e a referência será retirada de todos os casos de teste desta pasta.`,
    );
    if (!confirmed) return;

    try {
      await apiClient.deleteAcceptanceDoc(folderPath);
      const deletionTime = getFormattedTimestamp();
      const updatedDocs = (sqliteDb.folder_acceptance_docs || []).filter(
        (doc) => doc.folder_path !== folderPath,
      );
      const updatedCases = (sqliteDb.test_cases_sphere || []).map((testCase) => {
        if (testCase.folder !== folderPath) return testCase;
        return {
          ...testCase,
          history: [
            ...(testCase.history || []),
            { user: 'TMS', action: 'deleted acceptance criteria', time: deletionTime },
          ],
        };
      });
      setSqliteDb({
        ...sqliteDb,
        folder_acceptance_docs: updatedDocs,
        test_cases_sphere: updatedCases,
      });
      appendTerminalLog(
        `[TMS] Critérios de aceite removidos da pasta "${folderPath}".`,
        'warn',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao excluir critérios de aceite.';
      alert(message);
    }
  };

  const handleCreateFolder = (folderName: string) => {
    if (!folderName.trim()) return;
    const folders = sqliteDb.test_folders || [];
    if (folders.includes(folderName)) {
      alert("Esta pasta já existe.");
      return;
    }
    const updatedDb = { ...sqliteDb, test_folders: [...folders, folderName] };
    setSqliteDb(updatedDb);
    setSelectedSphereFolder(folderName);
    setIsCreatingFolder(false);
    setNewFolderNameValue('');
    appendTerminalLog(`[TMS] Nova pasta criada: ${folderName}`, 'success');
  };

  const handleUpdateFolderName = async (oldFolderName: string, newFolderName: string) => {
    if (!newFolderName.trim()) return;
    if (oldFolderName === newFolderName) {
      setIsEditingFolder(false);
      return;
    }
    const folders = sqliteDb.test_folders || [];
    if (folders.includes(newFolderName)) {
      alert("Já existe uma pasta com este nome.");
      return;
    }
    
    // Update folder list
    const updatedFolders = folders.map(f => f === oldFolderName ? newFolderName : f);
    
    // Update all test cases' folders too!
    const testCases = sqliteDb.test_cases_sphere || [];
    const updatedTestCases = testCases.map(tc => {
      if (tc.folder === oldFolderName) {
        return { ...tc, folder: newFolderName };
      }
      return tc;
    });

    const updatedAcceptanceDocs = (sqliteDb.folder_acceptance_docs || []).map((doc) =>
      doc.folder_path === oldFolderName
        ? {
            ...doc,
            folder_path: newFolderName,
            doc_web_path: acceptanceDocWebPath(newFolderName),
            repo_relative_path: acceptanceDocRepoRelativePath(newFolderName),
          }
        : doc,
    );

    try {
      await apiClient.renameAcceptanceDocFolder(oldFolderName, newFolderName);
    } catch {
      // Pasta pode não ter critério importado — segue com rename local.
    }
    
    const updatedDb = {
      ...sqliteDb,
      test_folders: updatedFolders,
      test_cases_sphere: updatedTestCases,
      folder_acceptance_docs: updatedAcceptanceDocs,
    };
    
    setSqliteDb(updatedDb);
    setSelectedSphereFolder(newFolderName);
    setIsEditingFolder(false);
    setEditFolderNameValue('');
    appendTerminalLog(`[TMS] Pasta renomeada de '${oldFolderName}' para '${newFolderName}'`, 'success');
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!folderName || folderName === 'all') {
      alert("Selecione uma pasta válida para excluir.");
      return;
    }
    const folders = sqliteDb.test_folders || [];
    const testCases = sqliteDb.test_cases_sphere || [];
    const count = testCases.filter(tc => tc.folder === folderName).length;
    
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a pasta "${folderName}"?\nEsta ação excluirá permanentemente a pasta e todos os seus ${count} casos de teste associados.`
    );
    if (!confirmDelete) return;

    const updatedFolders = folders.filter(f => f !== folderName);
    const updatedTestCases = testCases.filter(tc => tc.folder !== folderName);
    const updatedAcceptanceDocs = (sqliteDb.folder_acceptance_docs || []).filter(
      (doc) => doc.folder_path !== folderName,
    );

    try {
      await apiClient.deleteAcceptanceDoc(folderName);
    } catch {
      // Pasta pode não ter critério importado.
    }

    const updatedDb = {
      ...sqliteDb,
      test_folders: updatedFolders,
      test_cases_sphere: updatedTestCases,
      folder_acceptance_docs: updatedAcceptanceDocs,
    };

    setSqliteDb(updatedDb);
    setSelectedSphereFolder('all');
    setSelectedSphereTestCaseId(null);
    appendTerminalLog(`[TMS] Pasta "${folderName}" e todos os seus ${count} casos de teste foram excluídos com sucesso.`, 'error');
    setToastMessage(`Pasta excluída com sucesso! (${count} testes removidos)`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateTestCaseSphere = (newCase: DbTestCaseSphere) => {
    const list = sqliteDb.test_cases_sphere || [];
    if (list.some(tc => tc.id === newCase.id)) {
      alert(`Caso de teste com ID ${newCase.id} já existe.`);
      return;
    }
    const updatedDb = { ...sqliteDb, test_cases_sphere: [...list, newCase] };
    setSqliteDb(updatedDb);
    setSelectedSphereTestCaseId(newCase.id);
    setIsCreatingSphereTestCase(false);

    setSphereTestCaseStatuses(prev => {
      const next = { ...prev, [newCase.id]: 'Not executed' };
      localStorage.setItem('cardmais_sphere_statuses', JSON.stringify(next));
      return next;
    });

    appendTerminalLog(`[TMS] Novo caso de teste criado: ${newCase.id} - ${newCase.title}`, 'success');
  };

  const handleUpdateTestCaseSphere = (id: string, updatedFields: Partial<DbTestCaseSphere>) => {
    const list = sqliteDb.test_cases_sphere || [];
    const idx = list.findIndex(tc => tc.id === id);
    if (idx < 0) return;

    const previousCase = list[idx];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    // Track edit history log
    const updatedHistory = previousCase.history ? [...previousCase.history] : [];
    if (updatedFields.title && updatedFields.title !== previousCase.title) {
      updatedHistory.unshift({
        user: "Reinaldo",
        action: `changed title '${previousCase.title}' to '${updatedFields.title}'`,
        time: getFormattedTimestamp()
      });
    } else {
      updatedHistory.unshift({
        user: "Reinaldo",
        action: `updated steps / content`,
        time: getFormattedTimestamp()
      });
    }

    const updatedCase = {
      ...previousCase,
      ...updatedFields,
      history: updatedHistory,
      updated_at: now
    };

    const updatedList = [...list];
    updatedList[idx] = updatedCase;

    const updatedDb = { ...sqliteDb, test_cases_sphere: updatedList };
    setSqliteDb(updatedDb);

    setSphereTestCaseStatuses(prev => {
      const next = { ...prev, [id]: 'Not executed' };
      localStorage.setItem('cardmais_sphere_statuses', JSON.stringify(next));
      return next;
    });

    setIsEditingSphereTestCase(false);
    appendTerminalLog(`[TMS] Caso de teste ${id} atualizado e status reiniciado para não executado no banco SQLite virtual!`, 'success');
  };

  const handleDeleteTestCaseSphere = (id: string) => {
    if (window.confirm(`Tem certeza de que deseja deletar o caso de teste ${id}?`)) {
      const list = sqliteDb.test_cases_sphere || [];
      const updatedList = list.filter(tc => tc.id !== id);
      const updatedDb = { ...sqliteDb, test_cases_sphere: updatedList };
      setSqliteDb(updatedDb);
      
      const inFolder = updatedList.filter(tc => tc.folder === selectedSphereFolder);
      setSelectedSphereTestCaseId(inFolder.length > 0 ? inFolder[0].id : null);
      setIsEditingSphereTestCase(false);
      appendTerminalLog(`[TMS] Caso de teste ${id} removido definitivamente do banco.`, 'warn');
    }
  };

  const handleLoadTestCaseToWorkspace = (caseId: string) => {
    const list = sqliteDb.test_cases_sphere || [];
    const tCase = list.find(tc => tc.id === caseId);
    if (!tCase) return;

    const cleanFolderName = tCase.folder.includes('/') ? tCase.folder.split('/').pop() : tCase.folder;
    let autoGherkin = `Feature: ${cleanFolderName || 'Recarga de telefone'} - Cenário Automatizado\n`;
    autoGherkin += `  Como analista de QA da TMS\n`;
    autoGherkin += `  Quero carregar a especificação do caso de teste ${tCase.id}\n`;
    autoGherkin += `  Para executar as rotinas e persistir os resultados no banco SQLite local.\n\n`;
    autoGherkin += `  @${tCase.id}\n`;
    autoGherkin += `  Scenario: ${tCase.title.replace(/^[^-]+-\s*/, '')}\n`;

    const stepLines = tCase.steps.split('\n');
    stepLines.forEach(line => {
      if (line.trim()) {
        autoGherkin += `    ${line.trim()}\n`;
      }
    });

    setGherkinContent(autoGherkin);
    appendTerminalLog(`[WORKSPACE] Caso de teste '${tCase.id}' carregado no Gherkin Workspace com sucesso! Pronto para execução.`, 'success');

    // Switch view / layout to Console (robot_execution_terminal)
    setActiveTab('terminal');
    setPendingExecutionOnLoad(true);
    setIsTestSpecsOpen(false);

    // Dynamic state update of query parameters in URL without triggering hard page reload
    if (typeof window !== 'undefined') {
      try {
        const newRawUrl = `${window.location.origin}/terminal`;
        window.history.pushState({ path: newRawUrl }, '', newRawUrl);
      } catch (e) {
        console.error("Failed to pushState dynamic URL change: ", e);
      }
    }
  };

  const handleLoadMultipleTestCasesToWorkspace = (cases: DbTestCaseSphere[]) => {
    if (!cases || cases.length === 0) return;

    const firstCase = cases[0];
    const cleanFolderName = firstCase.folder.includes('/') ? firstCase.folder.split('/').pop() : firstCase.folder;

    let autoGherkin = `Feature: ${cleanFolderName || 'Recarga de telefone'} - Cenário Automatizado Multi-teste\n`;
    autoGherkin += `  Como analista de QA da TMS\n`;
    autoGherkin += `  Quero carregar a especificação de múltiplos casos de teste\n`;
    autoGherkin += `  Para executar as rotinas e persistir os resultados no banco SQLite local.\n\n`;

    cases.forEach((tCase) => {
      autoGherkin += `  @${tCase.id}\n`;
      autoGherkin += `  Scenario: ${tCase.title.replace(/^[^-]+-\s*/, '')}\n`;

      const stepLines = tCase.steps.split('\n');
      stepLines.forEach(line => {
        if (line.trim()) {
          autoGherkin += `    ${line.trim()}\n`;
        }
      });
      autoGherkin += `\n`;
    });

    setGherkinContent(autoGherkin);
    appendTerminalLog(`[WORKSPACE] Suite de ${cases.length} casos de teste carregada com sucesso! Pronto para execução completa.`, 'success');

    // Switch view / layout to Console (robot_execution_terminal)
    setActiveTab('terminal');
    setPendingExecutionOnLoad(true);
    setIsTestSpecsOpen(false);

    // Dynamic state update of query parameters in URL without triggering hard page reload
    if (typeof window !== 'undefined') {
      try {
        const newRawUrl = `${window.location.origin}/terminal`;
        window.history.pushState({ path: newRawUrl }, '', newRawUrl);
      } catch (e) {
        console.error("Failed to pushState dynamic URL change: ", e);
      }
    }
  };

  const handleSaveCurrentWorkspaceAsCases = () => {
    const parsed = parseGherkinFeature(gherkinContent);
    const folderLabel = resolveRobotFolderLabel(
      gherkinContent,
      parsed.title !== 'Jornada TMS - Robot Suite' ? parsed.title : 'Workspace Importados',
    );
    const folderName = `br.com.grupocard.contacard.dev/${folderLabel}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const existingFolders = sqliteDb.test_folders || [];
    const updatedFolders = existingFolders.includes(folderName)
      ? existingFolders
      : [...existingFolders, folderName];

    const currentCases = sqliteDb.test_cases_sphere || [];
    const newCasesAdded: DbTestCaseSphere[] = [];

    parsed.scenarios.forEach((sc, index) => {
      let caseId = "";
      const tagMatch = sc.tags.find(t => t.match(/^@?RECEL\d+/i) || t.match(/^@?RCT\d+/i) || t.match(/^@?CT\d+/i));
      if (tagMatch) {
         caseId = tagMatch.replace(/^@/, '').toUpperCase();
      } else {
         caseId = `TC-${String(currentCases.length + index + 1).padStart(3, '0')}`;
      }

      const formattedSteps = sc.steps.map(st => `${st.rawType || 'And'} ${st.text}`).join('\n');
      
      const newTestCase = {
        id: caseId,
        folder: folderName,
        title: `${caseId} - Cenário de Teste Positivo - ${sc.title}`,
        preconditions: `*** Variables ***\n\${DEFAULT_TAG}=    ${sc.tags.map(t => '@' + t.replace(/^@/, '')).join('  ')}`,
        steps: formattedSteps,
        expected_result: sc.steps.filter(st => st.type === 'THEN').map(st => st.text).join('\n') || 'Validar execução com sucesso.',
        history: [
          { user: "Reinaldo", action: "created test case from Workspace Import", time: getFormattedTimestamp() }
        ],
        created_at: now
      };

      const dupIdx = currentCases.findIndex(c => c.id === caseId);
      if (dupIdx >= 0) {
        currentCases[dupIdx] = { ...currentCases[dupIdx], ...newTestCase };
      } else {
        newCasesAdded.push(newTestCase);
      }
    });

    const updatedDb = {
      ...sqliteDb,
      test_folders: updatedFolders,
      test_cases_sphere: [...currentCases, ...newCasesAdded]
    };

    setSqliteDb(updatedDb);

    setSphereTestCaseStatuses(prev => {
      const next = { ...prev };
      parsed.scenarios.forEach((sc, index) => {
        let caseId = "";
        const tagMatch = sc.tags.find(t => t.match(/^@?RECEL\d+/i) || t.match(/^@?RCT\d+/i) || t.match(/^@?CT\d+/i));
        if (tagMatch) {
          caseId = tagMatch.replace(/^@/, '').toUpperCase();
        } else {
          caseId = `TC-${String(currentCases.length + index + 1).padStart(3, '0')}`;
        }
        next[caseId] = 'Not executed';
      });
      localStorage.setItem('cardmais_sphere_statuses', JSON.stringify(next));
      return next;
    });

    setSelectedSphereFolder(folderName);
    if (parsed.scenarios.length > 0) {
      const firstTag = parsed.scenarios[0].tags.find(t => t.match(/^@?RECEL\d+/i) || t.match(/^@?RCT\d+/i) || t.match(/^@?CT\d+/i));
      const firstId = firstTag ? firstTag.replace(/^@/, '').toUpperCase() : `TC-${String(currentCases.length + 1).padStart(3, '0')}`;
      setSelectedSphereTestCaseId(firstId);
    }
    
    appendTerminalLog(`[TMS] Sucesso! ${parsed.scenarios.length} cenários importados da Workspace e arquivados no CRUD TMS na pasta '${folderName}'.`, 'success');
    window.open(`${window.location.origin}/tms`, '_blank');
  };

  /** Execução real Robot (Terminal Ao Vivo / Executar Feature / cenário único). */
  const handleRunFeatureReal = async (tagOverride?: string) => {
    if (isExecuting) return;

    const tag = (tagOverride?.replace(/^@/, '').trim() || filterTag.trim());
    if (!tag) {
      appendTerminalLog(
        t(
          '[ERRO] Nenhuma tag Robot selecionada. Abra Configurar tag e selecione uma tag (Test Tags ou [Tags]).',
          '[ERROR] No Robot tag selected. Open Configure tag and pick a Test Tags or [Tags] entry.',
        ),
        'error',
      );
      return;
    }
    setIsExecuting(true);
    setTerminalLogs([]);

    const active = executionTags.find((t) => t.value === tag);
    const cmd = buildFeatureRobotCommand(tag, active?.sourceFile);
    const timestamp = formatRobotRunTimestamp();
    const runFolder = createRunFolderForTimestamp(timestamp);

    appendTerminalLog(`$ ${cmd}`, 'cmd');

    let lineBuffer = '';
    const onChunk = (chunk: string) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length > 0) appendTerminalLog(line, 'info');
      }
    };

    try {
      const { aborted } = await runRobotCommandStreaming(cmd, runFolder, onChunk);
      if (lineBuffer.trim()) appendTerminalLog(lineBuffer.trim(), 'info');

      if (!aborted) {
        const result = await persistRobotRunOutput(runFolder, cmd, timestamp);
        if (result.ok) {
          const { execution, testCases, steps } = result.data;
          setSqliteDb((prev) => ({
            ...prev,
            executions: [execution, ...prev.executions],
            test_cases: [...testCases, ...prev.test_cases],
            steps: [...steps, ...prev.steps],
          }));
          appendTerminalLog(
            `[TMS] Execução registrada: ${execution.id} — ${execution.total_tests} testes (${execution.passed} ok, ${execution.failed} falhas).`,
            'success',
          );
          if (execution.report_screenshot_path) {
            appendTerminalLog(
              '[TMS] Report Robot capturado (report.html + log por cenário) para o PDF.',
              'info',
            );
          }
        } else {
          appendTerminalLog(`[TMS] Sem persistência: ${result.error}`, 'warn');
        }
      }
    } catch (err) {
      appendTerminalLog(`[ERRO] ${(err as Error).message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    if (pendingExecutionOnLoad && parsedFeature && !isExecuting) {
      setPendingExecutionOnLoad(false);
      void handleRunFeatureReal();
    }
  }, [parsedFeature, pendingExecutionOnLoad, isExecuting]);

  const renderTMSStandalone = () => {
    return (
      <div className="w-screen h-screen bg-slate-50 text-slate-850 flex flex-col font-sans select-none antialiased overflow-hidden">
        {/* Standalone Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span className="text-xs font-mono">{toastMessage}</span>
          </div>
        )}

        <input
          ref={acceptanceDocInputRef}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={handleAcceptanceDocFileChange}
        />

        {/* Header */}
        <header className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl">
              <Database className="w-6 h-6 text-sky-600" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-sm uppercase text-slate-850 tracking-tight flex items-center gap-2">
                {t("Sistema de Gestão de Testes", "Test Management System")}
                <span className="text-[10px] bg-sky-100 text-sky-700 font-extrabold px-1.5 py-0.5 rounded font-mono border border-sky-200">STANDALONE</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t("Gestão de Casos de Teste", "Test Case Management")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(l => l === 'PT' ? 'ENG' : 'PT')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 hover:text-sky-600 hover:border-sky-400 transition-all cursor-pointer shadow-sm"
              title={t("Alterar idioma para Inglês", "Switch language to Portuguese")}
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>{language === 'PT' ? 'PT 🇧🇷' : 'EN 🇺🇸'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-all font-mono flex items-center gap-1.5 cursor-pointer border border-slate-200 hover:border-blue-500 hover:text-blue-600"
              title={t("Voltar ao Painel TMS", "Return to TMS Panel")}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
              {t("Voltar", "Back")}
            </button>
          </div>
        </header>

        {/* Split Content (3-Panes TMS Layout) */}
        <div className="flex-1 flex min-h-0 divide-x divide-slate-200 bg-slate-50">
          
          {/* Left Pane (Folder Tree) */}
          <div className="w-[24%] flex flex-col bg-slate-50 p-3 min-w-[240px] h-full overflow-hidden shrink-0">
            {/* Redesigned Folder Action Center slightly below the main count to enrich UX */}
            <div className="flex flex-col gap-2.5 mb-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-extrabold tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full inline-block animate-pulse"></span>
                  {t("Pastas / Features", "Folders / Features")} ({(sqliteDb.test_folders || []).length})
                </span>
              </div>
              
              {/* Sleek action toolbar row: all actions inline, evenly spaced and responsive */}
              <div className="flex flex-wrap items-stretch gap-1.5 border-t border-slate-100 pt-2.5">
                {/* Create New Folder */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(true);
                    setIsEditingFolder(false);
                  }}
                  className="h-8 px-2.5 text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-all border border-sky-100 flex items-center justify-center gap-1 cursor-pointer font-bold grow basis-[68px]"
                  title={t("Criar Nova Pasta / Feature", "Create New Folder / Feature")}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-[10px] font-mono font-black pr-0.5 hidden sm:inline">{t("Nova", "New")}</span>
                </button>

                {/* Edit Folder Name */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSphereFolder && selectedSphereFolder !== 'all') {
                      setEditFolderNameValue(selectedSphereFolder);
                      setIsEditingFolder(true);
                      setIsCreatingFolder(false);
                    } else {
                      alert(t("Selecione uma pasta de teste específica para editar.", "Select a specific test folder/feature to edit."));
                    }
                  }}
                  className={`h-8 px-2.5 rounded-lg transition-all border flex items-center justify-center gap-1 cursor-pointer font-bold grow basis-[68px] ${
                    selectedSphereFolder && selectedSphereFolder !== 'all'
                      ? 'text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border-slate-200 hover:border-indigo-400'
                      : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                  title={t("Editar Pasta Selecionada", "Edit Selected Folder")}
                >
                  <Edit className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="text-[10px] font-mono font-black pr-0.5 hidden sm:inline">{t("Editar", "Edit")}</span>
                </button>

                {/* Delete Selected Folder with associated tests */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSphereFolder && selectedSphereFolder !== 'all') {
                      handleDeleteFolder(selectedSphereFolder);
                    } else {
                      alert(t("Selecione uma pasta de teste específica para excluir.", "Select a specific test folder to delete."));
                    }
                  }}
                  className={`h-8 px-2.5 rounded-lg transition-all border flex items-center justify-center gap-1 cursor-pointer font-bold grow basis-[68px] ${
                    selectedSphereFolder && selectedSphereFolder !== 'all'
                      ? 'text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border-slate-200 hover:border-rose-400'
                      : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                  title={t("Excluir Pasta com todos os Testes", "Delete Folder with All Associated Tests")}
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="text-[10px] font-mono font-black pr-0.5 hidden sm:inline">{t("Excluir", "Delete")}</span>
                </button>

                {/* Export Excel Button with elegant design */}
                <button
                  type="button"
                  onClick={() => {
                    const casesToExport = sqliteDb.test_cases_sphere || [];
                    const foldersList = sqliteDb.test_folders || [];
                    if (casesToExport.length === 0) {
                      alert(t("Não existem casos de teste cadastrados para exportar.", "There are no registered test cases to export."));
                      return;
                    }
                    handleExportToExcel(casesToExport, foldersList, sphereCustomSqlQuery, sphereCustomScriptLanguage, sphereTestCaseStatuses, language);
                    setToastMessage(t("Plataforma: Casos de teste exportados para Excel com sucesso!", "Platform: Test cases successfully exported to Excel!"));
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="h-8 px-2 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-400 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-bold grow basis-[68px]"
                  title={t("Exportar todos os Casos para Excel", "Export All Test Cases to Excel")}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-mono font-black hidden sm:inline">{t("Excel", "Excel")}</span>
                </button>

                {/* Export PDF Button */}
                <button
                  type="button"
                  onClick={() => {
                    const casesToExport = sqliteDb.test_cases_sphere || [];
                    const foldersList = sqliteDb.test_folders || [];
                    if (casesToExport.length === 0) {
                      alert(t("Não existem casos de teste cadastrados para exportar.", "There are no registered test cases to export."));
                      return;
                    }
                    handleExportTestCasesToPDF(casesToExport, foldersList, sphereTestCaseStatuses, language);
                    setToastMessage(t("Plataforma: Plano de testes exportado para PDF com sucesso!", "Platform: Test plan successfully exported to PDF!"));
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="h-8 px-2 bg-rose-50/70 hover:bg-rose-100/80 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-400 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-bold grow basis-[92px]"
                  title={t("Exportar Plano de Testes para PDF", "Export Test Plan to PDF")}
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px] font-mono font-black hidden sm:inline">{t("Exportar PDF", "Export PDF")}</span>
                </button>
              </div>
            </div>

            {isCreatingFolder && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 flex flex-col gap-2 shadow-sm scale-up text-left">
                <label className="text-[9px] font-mono text-slate-400 uppercase font-black">{t("Caminho da Pasta", "Folder Path")}</label>
                <input
                  type="text"
                  placeholder={t("Nome da pasta/caminho", "Folder name / path")}
                  value={newFolderNameValue}
                  onChange={(e) => setNewFolderNameValue(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
              <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 flex flex-col gap-2 shadow-sm scale-up text-left">
                <label className="text-[9px] font-mono text-slate-400 uppercase font-black">{t("Editar Caminho da Pasta", "Edit Folder Path")}</label>
                <input
                  type="text"
                  placeholder={t("Nome da pasta/caminho", "Folder name / path")}
                  value={editFolderNameValue}
                  onChange={(e) => setEditFolderNameValue(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
              {/* "All folders" special node */}
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

              {/* Render standard folders */}
              {(sqliteDb.test_folders || []).map((folder, i) => {
                const isSelected = selectedSphereFolder === folder;
                const folderLabel = folder.replace('br.com.grupocard.contacard.dev/', '');
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedSphereFolder(folder);
                      const filtered = (sqliteDb.test_cases_sphere || []).filter(tc => tc.folder === folder);
                      setSelectedSphereTestCaseId(filtered.length > 0 ? filtered[0].id : null);
                      setIsCreatingSphereTestCase(false);
                      setIsEditingSphereTestCase(false);
                    }}
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
                    <span className="truncate font-semibold">{folderLabel}</span>
                    <span className={`ml-auto font-mono text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-sky-200/60 text-sky-850' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {(sqliteDb.test_cases_sphere || []).filter(tc => tc.folder === folder).length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Pane (Test Cases list in Selected Folder) */}
          <div className="w-[28%] flex flex-col p-3 min-w-[280px] bg-white h-full overflow-hidden shrink-0">
            {/* Search */}
            <div className="relative mb-3.5">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={t("Filtrar por nome/id...", "Filter by name/ID...")}
                value={searchSphereQuery}
                onChange={(e) => setSearchSphereQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
              {searchSphereQuery && (
                <button
                  type="button"
                  onClick={() => setSearchSphereQuery('')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleImportAcceptanceDocClick}
              disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
              className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white py-2 text-[11px] font-mono font-bold text-sky-700 transition-colors"
              title={t(
                'Importar um arquivo .md compartilhado por todos os casos desta pasta',
                'Import a .md file shared by all cases in this folder',
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              {t('Importar Critérios de Aceite', 'Import Acceptance Criteria')}
            </button>

            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">{t("Casos de Teste", "Test Cases")}</span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                {
                  (sqliteDb.test_cases_sphere || [])
                    .filter(tc => selectedSphereFolder === 'all' || tc.folder === selectedSphereFolder)
                    .filter(tc => !searchSphereQuery.trim() || tc.id.toLowerCase().includes(searchSphereQuery.toLowerCase()) || tc.title.toLowerCase().includes(searchSphereQuery.toLowerCase())).length
                } {t("itens", "items")}
              </span>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
              {(() => {
                const filteredCases = (sqliteDb.test_cases_sphere || [])
                  .filter(tc => selectedSphereFolder === 'all' || tc.folder === selectedSphereFolder)
                  .filter(tc => {
                    if (!searchSphereQuery.trim()) return true;
                    const query = searchSphereQuery.toLowerCase();
                    return tc.id.toLowerCase().includes(query) || tc.title.toLowerCase().includes(query);
                  });

                if (filteredCases.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 font-mono text-xs">
                      {t("Nenhum caso encontrado.", "No cases found.")}
                    </div>
                  );
                }

                return filteredCases.map((tc) => {
                  const isSelected = selectedSphereTestCaseId === tc.id;
                  const cleanTitle = tc.title.replace(/^[^-]+-\s*(Cenário de Teste Positivo - |Cenário de Teste Alternativo - )?/i, '');
                  
                  return (
                    <div
                      key={tc.id}
                      onClick={() => {
                        setSelectedSphereTestCaseId(tc.id);
                        setIsCreatingSphereTestCase(false);
                        setIsEditingSphereTestCase(false);
                      }}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-sky-50/65 border-sky-600 text-sky-850 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tc.id}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[140px]" title={tc.folder}>
                          {tc.folder.split('/').pop()}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-2 font-sans">
                        {cleanTitle}
                      </h4>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Quick creation & Run all footer */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const count = (sqliteDb.test_cases_sphere || []).length + 1;
                  const nextId = `RECEL${String(count).padStart(2, '0')}`;
                  const nCase = {
                    id: nextId,
                    folder: selectedSphereFolder === 'all' ? 'br.com.grupocard.contacard.dev/Recarga de telefone' : selectedSphereFolder,
                    title: `${nextId} - Cenário de Teste Positivo - Nova recarga rápida de telefone inteligente`,
                    preconditions: `*** Variables ***\n\${DEFAULT_CPF}=    03533062236`,
                    steps: `Dado que o cliente realiza a recarga básica\nQuando insere DDD e número válido\nEntão a operação é concluída com impressão de comprovante.`,
                    expected_result: "Operação executada e confirmada nas tabelas SQLite de logs de execução.",
                    history: [{ user: "Reinaldo", action: "created test case via Quick creation", time: getFormattedTimestamp() }],
                    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
                  };
                  handleCreateTestCaseSphere(nCase);
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 py-3 rounded-xl text-xs font-mono text-sky-600 flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("Criar Caso", "Create Test Case")}
              </button>

              <button
                type="button"
                onClick={() => {
                  // Regra (apenas nesta tela): "Executar Testes" executa os casos da
                  // pasta/feature selecionada. Com "Todas as Pastas" ativo, executa a
                  // suíte completa. O filtro de busca não restringe a execução.
                  const folderCases = (sqliteDb.test_cases_sphere || [])
                    .filter(tc => selectedSphereFolder === 'all' || tc.folder === selectedSphereFolder);
                  if (folderCases.length === 0) {
                    alert(t("Não há casos de teste na feature selecionada para executar.", "There are no test cases in the selected feature to run."));
                    return;
                  }
                  handleLoadMultipleTestCasesToWorkspace(folderCases);
                }}
                className="bg-[#FF6600] hover:bg-[#E05500] text-white py-3 rounded-xl text-xs transition-colors font-mono flex items-center justify-center gap-1.5 font-extrabold shadow-md shadow-[#FF6600]/10 cursor-pointer"
                title={t("Executar todos os casos da feature/pasta selecionada", "Run all test cases of the selected feature/folder")}
              >
                <PlayCircle className="w-4 h-4 text-white stroke-[2.5px] fill-transparent" />
                {t("Executar Testes", "Run Automated Tests")}
              </button>
            </div>
          </div>

          {/* Right Pane (Selected Test Case Details / Editing Form) */}
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
                  <label className="text-slate-500 font-mono text-[10px] font-bold text-sky-600 font-bold">{t("CENÁRIO DE PASSOS (SINTAXE GHERKIN BDD):", "SCENARIO STEPS (GHERKIN BDD SYNTAX):")}</label>
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
                    className="bg-orange-50/30 border border-orange-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:bg-white focus:border-orange-400 focus:outline-none placeholder:text-slate-400 resize-y"
                  />
                </div>

                {/* Actions Form */}
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-1 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingSphereTestCase(false);
                      setIsEditingSphereTestCase(false);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border border-slate-200"
                  >
                    {t("Cancelar", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCreatingSphereTestCase) {
                        const nCase = {
                          id: formSphereId,
                          folder: formSphereFolder,
                          title: formSphereTitle,
                          preconditions: formSpherePreconditions,
                          steps: formSphereSteps,
                          expected_result: formSphereExpectedResult,
                          observation: formSphereObservation,
                          history: [{ user: "Reinaldo", action: "created test case", time: getFormattedTimestamp() }],
                          created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
                        };
                        handleCreateTestCaseSphere(nCase);
                      } else {
                        handleUpdateTestCaseSphere(formSphereId, {
                          folder: formSphereFolder,
                          title: formSphereTitle,
                          preconditions: formSpherePreconditions,
                          steps: formSphereSteps,
                          expected_result: formSphereExpectedResult,
                          observation: formSphereObservation
                        });
                      }
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-xs font-mono font-black transition-all cursor-pointer shadow-sm shadow-sky-600/10"
                  >
                    {t("Salvar", "Save")}
                  </button>
                </div>
              </div>
            ) : (
              /* Read details pane */
              (() => {
                const currentCase = (sqliteDb.test_cases_sphere || []).find(tc => tc.id === selectedSphereTestCaseId);
                if (!currentCase) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 font-mono text-xs gap-3">
                      <Compass className="w-10 h-10 text-slate-300 animate-pulse" />
                      {t("Selecione um Caso de Teste na lista ao lado para ver as precondições, passos e histórico.", "Select a Test Case from the list on the side to view preconditions, steps, and history.")}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full animate-fade-in font-sans">
                    {/* Title details */}
                    <div className="border-b border-slate-200 pb-3 bg-white">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200/80 uppercase">
                            {currentCase.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{currentCase.created_at || t("A pouco", "Just now")}</span>
                        </div>

                        {/* Live Execution Status Badge */}
                        {(() => {
                          const status = sphereTestCaseStatuses[currentCase.id] || 'Not executed';
                          let displayLabel = t("Não Iniciado", "Not Started");
                          let colorClasses = 'bg-slate-100 text-slate-600 border-slate-300';
                          let dotColor = 'bg-slate-400';
                          
                          if (status === 'PASS' || status === 'Passed' || status === 'PASSED') {
                            displayLabel = t("Aprovado", "Passed");
                            colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300/80';
                            dotColor = 'bg-emerald-500';
                          } else if (status === 'SKIP' || status === 'Skipped' || status === 'SKIPPED') {
                            displayLabel = t("Ignorado", "Skipped");
                            colorClasses = 'bg-amber-50 text-amber-700 border-amber-300/80';
                            dotColor = 'bg-amber-500';
                          } else if (status === 'FAIL' || status === 'Failed' || status === 'FAILED') {
                            displayLabel = t("Falhou", "Failed");
                            colorClasses = 'bg-rose-50 text-rose-700 border-rose-300/80';
                            dotColor = 'bg-rose-500';
                          } else if (status === 'BLOCKED' || status === 'Blocked') {
                            displayLabel = t("Bloqueado", "Blocked");
                            colorClasses = 'bg-violet-50 text-violet-700 border-violet-300/80';
                            dotColor = 'bg-violet-500';
                          } else if (status === 'IN_PROGRESS' || status === 'In Progress' || status === 'running') {
                            displayLabel = t("Em Progresso", "In Progress");
                            colorClasses = 'bg-blue-50 text-blue-700 border-blue-300/80';
                            dotColor = 'bg-blue-500';
                          }

                          return (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-bold font-mono border rounded-lg shadow-sm ${colorClasses}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              <span>{displayLabel}</span>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <h3 className="text-[15px] font-extrabold text-slate-800 mt-1.5 leading-snug font-sans">
                        {currentCase.title}
                      </h3>

                      {/* Detail Tabs */}
                      <div className="flex items-center gap-1.5 border-b border-slate-200 mt-3.5 bg-white">
                        <button
                          type="button"
                          onClick={() => setSphereActiveDetailTab('overview')}
                          className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                            sphereActiveDetailTab === 'overview'
                              ? 'border-sky-600 text-sky-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t("Visão Geral", "Overview")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSphereActiveDetailTab('evidence')}
                          className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                            sphereActiveDetailTab === 'evidence'
                              ? 'border-sky-600 text-sky-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t("Evidências", "Evidence")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSphereActiveDetailTab('insights')}
                          className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                            sphereActiveDetailTab === 'insights'
                              ? 'border-sky-600 text-sky-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t("Log de Auditoria", "Audit Log")} ({(currentCase.history || []).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSphereActiveDetailTab('scripts')}
                          className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                            sphereActiveDetailTab === 'scripts'
                              ? 'border-sky-600 text-sky-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t("Scripts", "Scripts")}
                        </button>
                      </div>
                    </div>

                    {sphereActiveDetailTab === 'overview' && (
                      /* Overview Panel */
                      <div className="flex flex-col gap-4">
                        {(() => {
                          const acceptanceDoc = resolveFolderAcceptanceDoc(currentCase.folder);
                          return (
                            <div className="flex flex-col gap-1 bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 text-left">
                              <span className="text-[10px] text-sky-700 uppercase font-mono font-extrabold tracking-wider font-bold">
                                {t('Critério de Aceite', 'Acceptance Criteria')}
                              </span>
                              {acceptanceDoc ? (
                                <a
                                  href={acceptanceDoc.doc_web_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-xs font-mono font-bold text-sky-700 hover:text-sky-900 border border-slate-200 hover:border-sky-500 rounded-lg px-3 py-2 w-fit bg-white transition-colors"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  {acceptanceDoc.doc_title}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <p className="text-[11px] font-sans text-slate-500">
                                  {t(
                                    'Nenhum critério importado para esta pasta.',
                                    'No acceptance criteria imported for this folder.',
                                  )}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Pre-conditions */}
                        {currentCase.preconditions && (
                          <div className="flex flex-col gap-1 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-mono font-extrabold tracking-wider">{t("Pré-condições (Variáveis)", "Pre-conditions (Variables)")}</span>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto whitespace-pre leading-normal">
                              {currentCase.preconditions}
                            </div>
                          </div>
                        )}

                        {/* Test Steps */}
                        <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left">
                          <span className="text-[10px] text-sky-700 uppercase font-mono font-extrabold tracking-wider block mb-1.5 font-bold">{t("Cenário de Teste / Passos Gherkin BDD", "Test Scenario / Gherkin BDD Steps")}</span>
                          <div className="flex flex-col gap-2">
                            {currentCase.steps.split('\n').map((line, idx) => {
                              const stepMatch = line.trim().match(/^(Dado que|Dado|Quando|Então|E|Mas|Given|When|Then|And|But)\s+(.*)$/i);
                              if (stepMatch) {
                                const keyword = stepMatch[1];
                                const text = stepMatch[2];
                                let kwColor = "text-[#FF6600] font-bold";
                                if (['Dado', 'Given'].includes(keyword)) kwColor = 'text-sky-600 font-semibold';
                                else if (['Quando', 'When'].includes(keyword)) kwColor = 'text-amber-600 font-semibold';
                                else if (['Então', 'Then'].includes(keyword)) kwColor = 'text-emerald-600 font-semibold';
                                
                                return (
                                  <div key={idx} className="flex gap-1.5 text-[11.5px] font-mono leading-tight">
                                    <span className={kwColor}>{keyword}</span>
                                    <span className="text-slate-750 font-medium">{text}</span>
                                  </div>
                                );
                              }
                              return (
                                <div key={idx} className="text-slate-500 text-[11px] font-mono leading-tight pl-3" style={{ contentVisibility: 'auto' }}>
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Expected Outcome */}
                        <div className="flex flex-col gap-1 bg-[#F0FDF4]/65 p-3.5 rounded-xl border border-emerald-200 leading-normal text-left font-sans">
                          <span className="text-[10px] text-emerald-805 uppercase font-mono font-extrabold tracking-wider font-bold">{t("Resultado Esperado (Expected Outcome)", "Expected Outcome")}</span>
                          <p className="text-[11.5px] font-sans text-slate-700 mt-1 pl-1 border-l-2 border-emerald-555 leading-normal">
                            {currentCase.expected_result}
                          </p>
                        </div>

                        {/* Observation / Notes (Soft Orange) */}
                        <div className="flex flex-col gap-1 bg-orange-50/60 p-3.5 rounded-xl border border-orange-200 leading-normal text-left font-sans">
                          <span className="text-[10px] text-orange-850 uppercase font-mono font-extrabold tracking-wider font-bold">{t("OBSERVAÇÃO", "OBSERVATION")}</span>
                          <p className="text-[11.5px] font-sans text-slate-700 mt-1 pl-1 border-l-2 border-orange-400 leading-normal whitespace-pre-wrap">
                            {currentCase.observation || t("Nenhuma observação registrada.", "No observation registered.")}
                          </p>
                        </div>
                      </div>
                    )}

                    {sphereActiveDetailTab === 'evidence' && currentCase && (
                      <TestCaseEvidenceTab testCaseId={currentCase.id} t={t} />
                    )}

                    {sphereActiveDetailTab === 'insights' && (
                      /* History (Insights) Panel */
                      <div className="flex flex-col gap-2.5 text-left font-mono">
                        <span className="text-[10px] text-sky-700 uppercase font-mono font-bold tracking-wider">{t("Histórico de Alterações", "Change History")}</span>
                        
                        <div className="relative border-l border-slate-200 pl-4 ml-1 flex flex-col gap-4 py-2">
                          {(currentCase.history || []).map((h, i) => (
                            <div key={i} className="relative text-[11px] flex flex-col">
                              {/* Timeline node bullet */}
                              <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-100 border-2 border-slate-350" />
                              <div className="flex items-center gap-1 text-slate-450 text-[10px]">
                                <span className="text-slate-650 font-bold">{h.user}</span>
                                <span>•</span>
                                <span className="text-slate-400">{h.time}</span>
                              </div>
                              <p className="text-slate-505 mt-0.5">{h.action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sphereActiveDetailTab === 'scripts' && (
                      /* Scripts Panel */
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4">
                          {/* SQL Query Field */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-mono font-extrabold tracking-wider font-bold">SQL QUERY:</span>
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

                          {/* Script Language Field */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-mono font-extrabold tracking-wider font-bold">SCRIPT LANGUAGE:</span>
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
                      </div>
                    )}

                    {/* Stored Specs Detail Actions */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 bg-white shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteTestCaseSphere(currentCase.id)}
                        className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-3.5 py-2 rounded-xl text-xs transition-all font-mono flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        {t("Excluir", "Delete")}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormSphereId(currentCase.id);
                            setFormSphereFolder(currentCase.folder);
                            setFormSphereTitle(currentCase.title);
                            setFormSpherePreconditions(currentCase.preconditions);
                            setFormSphereSteps(currentCase.steps);
                            setFormSphereExpectedResult(currentCase.expected_result);
                            setFormSphereObservation(currentCase.observation || '');
                            setIsEditingSphereTestCase(true);
                            setIsCreatingSphereTestCase(false);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-sky-600" />
                          {t("Editar", "Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadTestCaseToWorkspace(currentCase.id);
                          }}
                          className="bg-[#FF6600] hover:bg-[#E05500] text-white font-extrabold px-4.5 py-2 rounded-xl text-xs transition-colors font-mono flex items-center gap-1.5 shadow-md shadow-[#FF6600]/10 cursor-pointer ml-1"
                          title={t("Carregar e executar este caso de teste automatizado", "Load and execute this automated test case")}
                        >
                          <PlayCircle className="w-4 h-4 text-white stroke-[2.5px] fill-transparent" />
                          {t("Executar Teste Automatizado", "Run Automated Test")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-400 shrink-0 shadow-sm">
          <span></span>
          <span>{t("Total:", "Total:")} {(sqliteDb.test_cases_sphere || []).length} {t("casos de testes arquivados", "test cases archived")}</span>
        </footer>
      </div>
    );
  };

  if (activeTab === 'tms') {
    return renderTMSStandalone();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Dynamic Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-xl text-[#FF6600]">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-white font-sans">TMS - QA Execution Center</h1>
              <span className="text-[10px] bg-[#FF6600]/20 text-[#FF6600] border border-[#FF6600]/30 px-1.5 py-0.5 rounded-full font-mono font-bold uppercase">
                Robot v6.1.1
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {t("Dashboard de Execução de Testes Automatizados Online com base na especificação do Sistema em ATDD.", "Online Automated Test Execution Dashboard based on the System Specification in ATDD.")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active status tags representing local directories %ROBOT_HOME% */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400 uppercase font-bold text-[9px]">{t("DB:", "DB:")}</span>
            <span className="text-emerald-400 font-bold">{t("CONECTADO", "CONNECTED")}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono">
            <span className="text-slate-400 uppercase font-bold text-[9px]">{t("Repositório de Relatórios:", "Report Store:")}</span>
            <span className="text-[#FF6600] font-sans font-semibold">%ROBOT_HOME%/results/</span>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(l => l === 'PT' ? 'ENG' : 'PT')}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-sky-500 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-sm text-sky-400"
            title={t("Alterar idioma para Inglês", "Switch language to Portuguese")}
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>{language === 'PT' ? 'PT 🇧🇷' : 'EN 🇺🇸'}</span>
          </button>

          {/* Menu de Configuração Trigger */}
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer group"
            title={t("Abrir Painel de Configurações", "Open Settings Panel")}
          >
            <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF6600] group-hover:rotate-45 transition-all duration-300" />
            <span className="hidden leading-none sm:inline">{t("Configurações", "Settings")}</span>
          </button>

          {/* Menu Lateral Suspenso Trigger */}
          <button 
            onClick={() => setIsNavDrawerOpen(true)}
            className="flex items-center gap-2 bg-[#FF6600]/10 hover:bg-[#FF6600]/25 text-[#FF6600] border border-[#FF6600]/30 hover:border-[#FF6600]/55 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-sm relative group"
            title={t("Abrir Menu de Navegação de Painéis", "Open Panel Navigation Menu")}
            id="side-drawer-trigger"
          >
            <Sliders className="w-3.5 h-3.5 text-[#FF6600] group-hover:rotate-12 transition-transform" />
            <span className="leading-none">{t("Navegar Painéis", "Navigate Panels")}</span>
            <span className="bg-[#FF6600] text-slate-950 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-black shadow-inner leading-none">
              {activeTab === 'terminal' ? t('Terminal', 'Terminal') : activeTab === 'sqlite' ? t('Histórico', 'History') : activeTab === 'reports' ? t('Relatórios', 'Reports') : t('Emulador', 'Emulator')}
            </span>
          </button>
        </div>
      </header>

      {/* Stats Summary Panel */}
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

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 h-full">
        
        {/* Left Column: BDD Workspace & CLI Settings (occupies 1/3 broad screen) */}
        {activeTab === 'terminal' && (
          <div className="w-full lg:w-[420px] bg-slate-900 border-r border-slate-800 flex flex-col p-5 overflow-y-auto shrink-0 gap-5">
          
          {/* CLI execution configuration */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Sliders className="w-4 h-4 text-[#FF6600]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">{t("Argumentos do Robot Framework", "Robot Framework Arguments")}</h3>
            </div>
            
            <div className="flex flex-col gap-2 text-xs">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-slate-400 font-mono text-[10px]">{t("Tag de Execução (-i / --include):", "Execution Tag (-i / --include):")}</label>
                  <button
                    type="button"
                    onClick={() => {
                      void refreshExecutionTagsFromRobotSample().then(() => setIsTagModalOpen(true));
                    }}
                    className="text-[10px] text-[#FF6600] border border-[#FF6600]/30 hover:border-[#FF6600]/60 hover:bg-[#FF6600]/10 px-2 py-0.5 rounded flex items-center gap-1 font-mono transition-all font-bold"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {t("Configurar tag", "Configure tag")}
                  </button>
                </div>
                <select 
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-slate-200"
                >
                  {executionTags.map(tag => (
                    <option key={tag.value} value={tag.value}>{tag.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">{t("Arquivo de Configuração (-A):", "Configuration File (-A):")}</label>
                <input 
                  type="text" 
                  value={argsFile}
                  onChange={(e) => setArgsFile(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-slate-200"
                />
              </div>

              {/* Live Preview Command */}
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                <span className="text-[#FF6600] block uppercase tracking-wider font-extrabold text-[9px] mb-1">{t("Comando Final Compilado:", "Final Compiled Command:")}</span>
                <span className="break-all">{getCompiledCommand()}</span>
              </div>
            </div>
          </div>

          {/* Gherkin Workspace */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-slate-950/80 border rounded-xl p-4 flex-1 flex flex-col gap-3 min-h-[350px] relative transition-all duration-200 ${
              isDraggingFile ? 'border-[#FF6600] bg-slate-900/60 shadow-lg shadow-[#FF6600]/10' : 'border-slate-800'
            }`}
          >
            {/* Invisible File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".feature,.txt,.robot" 
              className="hidden" 
            />

            {/* Drag & Drop Visual Overlay */}
            {isDraggingFile && (
              <div className="absolute inset-0 bg-slate-950/90 border-2 border-dashed border-[#FF6600] rounded-xl flex flex-col items-center justify-center gap-2.5 z-30 p-6 pointer-events-none animate-fade-in">
                <Upload className="w-12 h-12 text-[#FF6600] animate-bounce" />
                <p className="text-sm font-extrabold text-slate-100 tracking-tight uppercase">Solte o Arquivo de Teste aqui</p>
                <p className="text-[11px] text-slate-400 font-mono">Suporta formatos .feature, .robot ou .txt</p>
              </div>
            )}

            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 relative z-10">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">{t("Workspace .feature", "Workspace .feature")}</h3>
              </div>
              
              {!isEditingGherkin ? (
                <div className="flex gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] bg-slate-900 hover:bg-slate-850 px-2 py-1 rounded border border-slate-850 hover:border-slate-700 text-slate-300 transition-all font-mono flex items-center gap-1 font-bold"
                    title={t("Selecione um arquivo Gherkin/Robot do seu computador", "Select Gherkin/Robot file from your computer")}
                  >
                    <Upload className="w-3.5 h-3.5 text-[#FF6600]" />
                    {t("Importar File", "Import File")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGherkinTempText(gherkinContent);
                      setIsEditingGherkin(true);
                    }}
                    className="text-[10px] bg-slate-900 hover:bg-slate-850 px-2 py-1 rounded border border-slate-700 text-slate-300 transition-all font-mono flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-sky-400" />
                    {t("Editar Gherkin", "Edit Gherkin")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrentWorkspaceAsCases}
                    className="text-[10px] bg-slate-900 hover:bg-slate-850 px-2 py-1 rounded border border-amber-800/60 hover:border-amber-700 text-amber-400 transition-all font-mono flex items-center gap-1 font-bold"
                    title={t("Armazenar todos os cenários individuais como casos de teste no TMS", "Store all individual scenarios as test cases in TMS")}
                  >
                    <Database className="w-3.5 h-3.5 text-amber-500" />
                    {t("Armazenar Testes", "Store Tests")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveGherkin}
                    className="text-[10px] bg-emerald-950 hover:bg-emerald-900 px-2.5 py-1 rounded border border-emerald-800 text-emerald-400 font-bold transition-all"
                  >
                    {t("Salvar", "Save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGherkin(false)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-850 px-2.5 py-1 rounded border border-slate-700 text-slate-400 transition-all"
                  >
                    {t("Cancelar", "Cancel")}
                  </button>
                </div>
              )}
            </div>

            {isEditingGherkin ? (
              <div className="flex-1 flex flex-col min-h-0 relative z-10">
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  {t("Edite a especificação abaixo. O parser irá reconstruir os logs em tempo real.", "Edit the specification below. The parser will rebuild logs in real time.")}
                </p>
                <textarea
                  value={gherkinTempText}
                  onChange={(e) => setGherkinTempText(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full bg-slate-900 border border-slate-700 rounded p-2.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 overflow-y-auto resize-none block min-h-[250px]"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between min-h-0 relative z-10">
                {/* Parsed Scenarios View Tree */}
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="mb-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">{t("Especificação do Negócio", "Business Specification")}</span>
                    <h4 className="font-extrabold text-white text-xs mt-0.5 line-clamp-1">{parsedFeature.title}</h4>
                  </div>

                  <span className="text-[10px] text-slate-400 uppercase font-mono block mb-2">{t("Cenários Mapeados pelo Parser", "Scenarios Mapped by Parser")} ({parsedFeature.scenarios.length})</span>
                  
                  <div className="flex flex-col gap-1.5">
                    {parsedFeature.scenarios.map((sc, idx) => {
                      const isSelected = selectedScenarioId === sc.id;
                      return (
                        <div 
                          key={sc.id}
                          onClick={() => setSelectedScenarioId(isSelected ? null : sc.id)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-slate-900 border-[#FF6600]/50 shadow-sm shadow-[#FF6600]/10' 
                              : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800/80'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-mono text-[9px] text-[#FF6600] font-bold">{sc.id}</span>
                            <div className="flex items-center gap-1.5">
                              {sc.tags && sc.tags.length > 0 && (
                                <span className="bg-slate-950 px-1 py-0.2 rounded font-mono text-[7.5px] text-slate-400 truncate max-w-[80px]">
                                  {sc.tags[0]}
                                </span>
                              )}
                              {/* Categoria/Tipo */}
                              <span className="bg-slate-950 px-1 py-0.5 rounded font-mono text-[7px] text-slate-400 capitalize">
                                {sc.type}
                              </span>
                              
                              {/* Live Status Badge */}
                              {(() => {
                                const status = scenarioStatuses[sc.id] || 'Not executed';
                                let displayLabel = t("Não Iniciado", "Not Started");
                                let styleClass = 'bg-slate-800 text-slate-400 border border-slate-700/60';
                                
                                if (status === 'PASS' || status === 'Passed' || status === 'PASSED') {
                                  displayLabel = t("Aprovado", "Passed");
                                  styleClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                                } else if (status === 'SKIP' || status === 'Skipped' || status === 'SKIPPED') {
                                  displayLabel = t("Ignorado", "Skipped");
                                  styleClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
                                } else if (status === 'FAIL' || status === 'Failed' || status === 'FAILED') {
                                  displayLabel = t("Falhou", "Failed");
                                  styleClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                                } else if (status === 'BLOCKED' || status === 'Blocked') {
                                  displayLabel = t("Bloqueado", "Blocked");
                                  styleClass = 'bg-violet-500/15 text-violet-400 border border-violet-500/20';
                                } else if (status === 'IN_PROGRESS' || status === 'In Progress' || status === 'running') {
                                  displayLabel = t("Em Progresso", "In Progress");
                                  styleClass = 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
                                }
                                
                                return (
                                  <span className={`text-[8.5px] font-mono px-1.5 py-0.5 shadow-sm rounded font-black uppercase tracking-wider ${styleClass}`}>
                                    {displayLabel}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <p className="font-bold text-slate-200 text-[11px] mt-1.5 pr-4 line-clamp-2 leading-tight">
                            {sc.title}
                          </p>

                          {/* Steps Drawer in case of expansion select */}
                          {isSelected && (
                            <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex flex-col gap-1.5 select-text">
                              {sc.documentation && (
                                <div className="p-2 border border-slate-800 rounded bg-slate-950 text-[10px] text-slate-300 italic whitespace-pre-line leading-relaxed">
                                  <span className="text-[#FF6600] font-bold font-sans not-italic text-[8.5px] block mb-0.5 uppercase tracking-wider">{t("Documentação", "Documentation")}</span>
                                  {sc.documentation}
                                </div>
                              )}
                              {sc.isSkipped && (
                                <div className="p-2 border border-amber-500/10 rounded bg-amber-500/5 text-[10px] text-amber-400 leading-relaxed">
                                  <span className="font-bold uppercase text-[8.5px] block">{t("⚠️ Ignorado / Skipped", "⚠️ Skipped / Ignored")}</span>
                                  {sc.skipMessage || t("Nenhuma mensagem de pulo fornecida", "No skip message provided")}
                                </div>
                              )}
                              <div className="flex flex-col gap-1 mt-1">
                                {sc.steps.map((st, sIdx) => {
                                  // Skip command shouldn't be printed as standard step
                                  if (st.rawType === 'Skip') return null;
                                  return (
                                    <div key={sIdx} className="leading-tight">
                                      <span className="text-[#FF6600] font-extrabold">{st.rawType}</span> {st.text}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Tags Specific Execução Button */}
                              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1 select-none">
                                  Tag: <span className="bg-slate-900 border border-slate-800 text-[#FF6600] font-mono px-1.5 py-0.5 rounded font-extrabold text-[9px]">{sc.tags && sc.tags.length > 0 ? sc.tags[0] : (filterTag ? `@${filterTag}` : '—')}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const tagToUse = sc.tags && sc.tags.length > 0
                                      ? sc.tags[0].replace(/^@/, '')
                                      : filterTag;
                                    if (!tagToUse) {
                                      appendTerminalLog('[ERRO] Selecione uma tag Robot em Configurar tag antes de executar.', 'error');
                                      setActiveTab('terminal');
                                      return;
                                    }
                                    void handleRunFeatureReal(tagToUse);
                                    setActiveTab('terminal');
                                  }}
                                  className="flex items-center gap-1.5 bg-[#FF6600] hover:bg-[#E05500] text-white px-2.5 py-1.5 rounded-md font-bold font-sans text-[10px] transition-all uppercase tracking-wider shadow-md shadow-[#FF6600]/10 select-none cursor-pointer"
                                  title={t(`Executar somente o teste selecionado: ${sc.title}`, `Run only the selected test: ${sc.title}`)}
                                >
                                  <Play className="w-3 h-3 fill-current text-white" />
                                  {t("Execução", "Execution")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950">
                  <span>{t("Validação Automática", "Automatic Validation")}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {t("Sintaxe Gherkin Válida", "Valid Gherkin Syntax")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Test Management System standalone button under the WORKSPACE */}
          <button
            type="button"
            onClick={() => window.open(`${window.location.origin}/tms`, '_blank')}
            className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-650 active:scale-[0.98] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all font-mono flex items-center justify-center gap-2 shadow-lg shadow-sky-600/15 cursor-pointer"
            title="Abrir Central de Testes e Gestão (Test Management System)"
          >
            <BookOpen className="w-4 h-4 text-white" />
            Test Management System
          </button>
        </div>
      )}

        {/* Right Column: Interactive Run control room and SQLite database view tab layout */}
        <div className="flex-1 bg-slate-950 flex flex-col min-h-0">
          
          {/* Active Panel Title & Control room */}
          <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-3 flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 select-none text-left">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 tracking-wider font-mono font-bold uppercase">{t("Painel Ativo:", "Active Panel:")}</span>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 py-1.5 px-3 rounded-lg text-xs font-extrabold text-[#FF6600] uppercase font-mono">
                {activeTab === 'terminal' && (
                  <>
                    <TerminalIcon className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{t("Terminal Robot Framework", "Robot Framework Terminal")}</span>
                  </>
                )}
                {activeTab === 'sqlite' && (
                  <>
                    <Database className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{t("Histórico de Execução Remoto", "Remote Execution History")}</span>
                  </>
                )}
                {activeTab === 'reports' && (
                  <>
                    <FileText className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{t("Relatórios", "Reports")}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(true)}
                className="text-[10px] hover:text-[#FF6600] text-slate-400 font-mono font-bold border border-slate-800 hover:border-[#FF6600]/30 px-2.5 py-1 rounded-md transition-colors bg-slate-950 cursor-pointer"
              >
                {t("Alterar ↗", "Change ↗")}
              </button>
            </div>

            {activeTab === 'terminal' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    window.location.assign('/reports');
                  }}
                  className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-800 hover:border-sky-500 active:scale-95 transition-all select-none cursor-pointer"
                  title={t('Abrir relatórios de execução', 'Open execution reports')}
                >
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>{t('Reporte', 'Report')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunFeatureReal()}
                  disabled={isExecuting}
                  className="flex items-center gap-2 bg-[#FF6600] hover:bg-[#FF6600]/90 text-white font-black text-xs px-5 py-2.5 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                  title={t('Executar todos os testes da feature (.feature)', 'Run all feature tests (.feature)')}
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('Executando Feature...', 'Running Feature...')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white animate-pulse" />
                      <span>{t('Executar Feature', 'Execute Feature')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Core Panel Content views */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 flex flex-col">
            
            {/* TERMINAL ROBOT FRAMEWORK VIEW */}
            {activeTab === 'terminal' && (
              <div className="flex-1 flex flex-col min-h-0 gap-4">
                
                {/* Console screen container */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl relative min-h-[350px]">
                  
                  {/* Terminal Header */}
                  <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-mono text-slate-400 ml-2 font-bold uppercase tracking-wider">
                        {t("Console / terminal_de_execucao_robot", "Console / robot_execution_terminal")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isExecuting && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#FF6600] font-mono leading-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] animate-ping"></span>
                          <span>STREAMING ACTIVE</span>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => {
                          setTerminalLogs([]);
                          appendTerminalLog(t('[SYSTEM] Console limpo pelo usuário.', '[SYSTEM] Console cleared by user.'), 'warn');
                        }}
                        className="text-[10px] text-slate-400 hover:text-white font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-all"
                      >
                        {t("Limpar log", "Clear log")}
                      </button>
                    </div>
                  </div>

                  {/* Terminal Logs scrolling body */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-900 select-text">
                    {terminalLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
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
                              {log.text.includes('Step  |') ? renderLoggedStep(log.text) : log.text}
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
                  onPersisted={({ execution, testCases, steps }) => {
                    setSqliteDb((prev) => ({
                      ...prev,
                      executions: [execution, ...prev.executions],
                      test_cases: [...testCases, ...prev.test_cases],
                      steps: [...steps, ...prev.steps],
                    }));
                  }}
                />

                {/* Automation Tip */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start gap-3.5 text-xs">
                  <div className="p-2 bg-[#FF6600]/10 border border-[#FF6600]/20 rounded-lg text-[#FF6600] shrink-0">
                    <Sparkles className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#FF6600] uppercase tracking-wider text-[10px] mb-1">{t("Como Funciona a Integração?", "How Does the Integration Work?")}</h4>
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
            )}

            {/* INTERACTIVE SQLITE DATABASE PANEL */}
            {activeTab === 'sqlite' && (
              <div className="flex-1 flex flex-col min-h-0 gap-4">
                
                {/* Tables & Query Mode select tabs */}
                <div className="bg-slate-900 p-1 border border-slate-800 rounded-lg flex gap-1 self-start">
                  <button
                    onClick={() => setSqliteSubTab('browse')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      sqliteSubTab === 'browse' 
                        ? 'bg-slate-950 text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    Tabelas do Banco (Layout Visual)
                  </button>

                  <button
                    onClick={() => setSqliteSubTab('playground')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      sqliteSubTab === 'playground' 
                        ? 'bg-slate-950 text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <DatabaseZap className="w-3.5 h-3.5" />
                    Console SQL Interativo (RAW SQL)
                  </button>
                </div>

                {sqliteSubTab === 'browse' ? (
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[350px] gap-4">
                    
                    {/* Browse tables selector */}
                    <div className="flex justify-between items-center gap-4 flex-wrap pb-3 border-b border-slate-800/80">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setBrowseTableName('executions')}
                          className={`px-3 py-1.2 rounded-lg text-xs font-bold border ${
                            browseTableName === 'executions'
                              ? 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/40'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                          }`}
                        >
                          Tabela: executions ({sqliteDb.executions.length} linhas)
                        </button>

                        <button
                          onClick={() => setBrowseTableName('test_cases')}
                          className={`px-3 py-1.2 rounded-lg text-xs font-bold border ${
                            browseTableName === 'test_cases'
                              ? 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/40'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                          }`}
                        >
                          Tabela: test_cases ({sqliteDb.test_cases.length} linhas)
                        </button>

                        <button
                          onClick={() => setBrowseTableName('steps')}
                          className={`px-3 py-1.2 rounded-lg text-xs font-bold border ${
                            browseTableName === 'steps'
                              ? 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/40'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                          }`}
                        >
                          Tabela: steps ({sqliteDb.steps.length} linhas)
                        </button>
                      </div>

                      {/* Filter Search Input */}
                      <div className="grow md:max-w-xs relative text-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 pointer-events-none">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          value={dbSearchQuery}
                          onChange={(e) => setDbSearchQuery(e.target.value)}
                          placeholder={`Buscar na tabela ${browseTableName}...`}
                          className="w-full bg-slate-950 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#FF6600] text-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    {/* Table Render */}
                    <div className="flex-1 overflow-x-auto min-h-0">
                      <table className="w-full text-xs font-mono text-slate-300 text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                            {browseTableName === 'executions' && (
                              <>
                                <th className="p-3">ID Execução</th>
                                <th className="p-3">Timestamp</th>
                                <th className="p-3">Comando Executado</th>
                                <th className="p-3">Duração</th>
                                <th className="p-3">Tests (Pass/Fail)</th>
                                <th className="p-3 text-center">Status</th>
                              </>
                            )}
                            {browseTableName === 'test_cases' && (
                              <>
                                <th className="p-3">ID Caso</th>
                                <th className="p-3">ID Execução</th>
                                <th className="p-3">Cenário / Caso de Teste</th>
                                <th className="p-3 text-slate-400/90">Categoria / Módulo</th>
                                <th className="p-3">Duração</th>
                                <th className="p-3 text-center">Status</th>
                              </>
                            )}
                            {browseTableName === 'steps' && (
                              <>
                                <th className="p-3">ID Passo</th>
                                <th className="p-3">ID Caso</th>
                                <th className="p-3 text-center">Tipo Passo</th>
                                <th className="p-3">Gherkin BDD Text</th>
                                <th className="p-3 text-center">Status</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {browseTableName === 'executions' && 
                            sqliteDb.executions
                              .filter(row => 
                                row.id.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.command.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.status.toLowerCase().includes(dbSearchQuery.toLowerCase())
                              )
                              .map(row => (
                                <tr key={row.id} className="hover:bg-slate-950/60 transition-all">
                                  <td className="p-3 font-semibold text-slate-200">{row.id}</td>
                                  <td className="p-3 text-slate-400">{row.timestamp}</td>
                                  <td className="p-3 text-slate-300 select-text max-w-xs truncate" title={row.command}>{row.command}</td>
                                  <td className="p-3 text-slate-400">{row.duration_s} s</td>
                                  <td className="p-3">
                                    <span className="text-slate-300 font-bold">{row.total_tests}</span> total 
                                    (<span className="text-emerald-400 font-semibold">{row.passed}P</span> / <span className="text-rose-400 font-semibold">{row.failed}F</span>)
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      row.status === 'PASS' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {row.status === 'PASS' ? 'Passed' : 'Failed'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                          }

                          {browseTableName === 'test_cases' && 
                            sqliteDb.test_cases
                              .filter(row => 
                                row.id.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.category.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.status.toLowerCase().includes(dbSearchQuery.toLowerCase())
                              )
                              .map(row => (
                                <tr key={row.id} className="hover:bg-slate-950/60 transition-all text-[11px]">
                                  <td className="p-3 font-semibold text-slate-200">{row.id}</td>
                                  <td className="p-3 text-slate-400">{row.execution_id}</td>
                                  <td className="p-3 text-slate-200 break-words max-w-sm">{row.name}</td>
                                  <td className="p-3 text-slate-400">{row.category}</td>
                                  <td className="p-3 text-slate-400">{row.duration_s} s</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      row.status === 'PASS' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : row.status === 'SKIP'
                                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {row.status === 'PASS' ? 'Passed' : (row.status === 'FAIL' ? 'Failed' : (row.status === 'SKIP' ? 'Skipped' : row.status))}
                                    </span>
                                  </td>
                                </tr>
                              ))
                          }

                          {browseTableName === 'steps' && 
                            sqliteDb.steps
                              .filter(row => 
                                row.id.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.text.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                                row.step_type.toLowerCase().includes(dbSearchQuery.toLowerCase())
                              )
                              .map(row => (
                                <tr key={row.id} className="hover:bg-slate-950/60 transition-all text-[11px]">
                                  <td className="p-3 font-semibold text-slate-200">{row.id}</td>
                                  <td className="p-3 text-slate-400">{row.test_case_id}</td>
                                  <td className="p-3 text-center">
                                    <span className="bg-slate-950 text-slate-300 border border-slate-800 px-1.5 py-0.2 rounded font-black text-[9px]">
                                      {row.step_type}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-200">{row.text}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      row.status === 'PASS' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : row.status === 'SKIP'
                                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {row.status === 'PASS' ? 'Passed' : (row.status === 'FAIL' ? 'Failed' : (row.status === 'SKIP' ? 'Skipped' : row.status))}
                                    </span>
                                  </td>
                                </tr>
                              ))
                          }
                        </tbody>
                      </table>

                      {(browseTableName === 'executions' ? sqliteDb.executions : browseTableName === 'test_cases' ? sqliteDb.test_cases : sqliteDb.steps).length === 0 && (
                        <div className="py-12 text-center text-slate-500 font-mono text-xs">
                          Nenhum dado cadastrado nesta tabela no momento.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // PLAYGROUND MODE
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[350px] gap-4">
                    <div className="mb-2">
                      <div className="flex justify-between items-center bg-slate-950 px-3 py-1 pb-2 border-b border-slate-800">
                        <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">SQLite raw console playground</span>
                        <span className="text-[9px] bg-sky-950 text-sky-400 px-1 rounded font-mono">SQLite v3 API Memory Link</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <span className="font-mono text-[#FF6600] font-black text-xs pt-2 select-none">sqlite&gt;</span>
                        <input
                          type="text"
                          value={rawSqlInput}
                          onChange={(e) => setRawSqlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleExecuteRawSQL();
                          }}
                          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#FF6600] text-emerald-400 select-text"
                        />
                        <button
                          onClick={handleExecuteRawSQL}
                          className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                          Executar SQL
                        </button>
                      </div>

                      {/* Command helpers */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 font-mono">
                        <span className="font-extrabold uppercase text-[9px] tracking-wider text-slate-500">Exemplos:</span>
                        <button 
                          onClick={() => setRawSqlInput('SELECT * FROM executions')} 
                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded"
                        >
                          SELECT * FROM executions
                        </button>
                        <button 
                          onClick={() => setRawSqlInput("SELECT * FROM test_cases WHERE status = 'PASS'")} 
                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded"
                        >
                          SELECT * FROM test_cases WHERE status = 'PASS'
                        </button>
                        <button 
                          onClick={() => setRawSqlInput("SELECT id, text, status FROM steps WHERE step_type = 'WHEN'")} 
                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded"
                        >
                          SELECT id, text...
                        </button>
                      </div>
                    </div>

                    {/* Query Execution Status */}
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>Resultado da consulta: {sqlResults.count} registros retornados</span>
                      {sqlLatency !== null && <span className="text-emerald-400">Latência de execução: {sqlLatency}ms</span>}
                    </div>

                    {/* Result table or Error display */}
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg overflow-y-auto overflow-x-auto p-2">
                      {sqlResults.error ? (
                        <div className="p-4 rounded-md bg-rose-950/20 border border-rose-800 text-rose-300 font-mono text-xs whitespace-pre-wrap">
                          ⚠️ {sqlResults.error}
                        </div>
                      ) : (
                        <table className="w-full text-xs font-mono text-slate-300 text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-200">
                              {sqlResults.columns.map(col => (
                                <th key={col} className="p-2.5 uppercase text-[10px] tracking-wider">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {sqlResults.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-900/40 transition-all font-mono">
                                {sqlResults.columns.map(col => {
                                  const cellVal = row[col];
                                  return (
                                    <td key={col} className="p-2.5 max-w-sm truncate text-slate-300" title={String(cellVal || '')}>
                                      {cellVal === 'PASS' ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-950/45 border border-emerald-900 rounded px-1 text-[9px]">Passed</span>
                                      ) : cellVal === 'FAIL' ? (
                                        <span className="text-rose-400 font-bold bg-rose-950/45 border border-rose-900 rounded px-1 text-[9px]">FAIL</span>
                                      ) : (
                                        String(cellVal !== undefined ? cellVal : 'NULL')
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Empty alert if needed */}
                    {!sqlResults.error && sqlResults.rows.length === 0 && (
                      <div className="py-12 text-center text-slate-600 font-mono">
                        Nenhum registro corresponde a esta consulta.
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}

          {/* RELATÓRIOS E XML VIEW */}
          {activeTab === 'reports' && (
            <div className="flex-1 flex flex-col min-h-0 gap-6 animate-fadeIn text-left">
              
              {/* Custom Allure-like reports component */}
              <ExecutionReports 
                sqliteDb={sqliteDb}
                onClearHistory={handleClearExecutionHistory}
                onRunFeature={() => handleRunFeatureReal()}
                language={language}
                onChangeLanguage={setLanguage}
              />

              {/* Diretório de Artefatos %ROBOT_HOME%/results/ */}
              <details className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group select-none">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-850 transition-colors">
                  <div className="flex items-center gap-2">
                    <FolderTree className="text-[#FF6600] w-5 h-5" />
                    <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight">
                      Diretório de Artefatos %ROBOT_HOME%/results/ <span className="text-xs text-slate-500 font-mono font-normal ml-2">(Clique para expandir)</span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono group-open:rotate-180 transition-transform">▼</span>
                </summary>

                <div className="p-5 border-t border-slate-800/60 bg-slate-950/20 flex flex-col gap-4 text-left">
                  <p className="text-xs text-slate-400">
                    Sempre que a execução real do Robot Framework termina, o motor salva os relatórios físicos estruturados de QA em <strong>results/</strong>.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Item 1: output.xml */}
                    <div 
                      onClick={() => handleOpenOutputXML()}
                      className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 active:scale-[0.985] transition-all gap-4 cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 font-bold text-xs uppercase font-mono">XML</span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">Gerado</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-200 group-hover:text-[#FF6600] transition-colors flex items-center gap-1.5">
                          output.xml
                          <span className="text-[10px] text-amber-500 font-normal font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                            ↗
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono text-left">
                          Informações completas estruturadas em XML para ingestão e controle por Webhook/DevOps CI.
                        </p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded font-mono text-[10px] text-slate-500 max-h-24 overflow-y-auto overflow-x-hidden text-left scrollbar-thin select-text mb-2">
                        {`<?xml version="1.0" encoding="UTF-8"?>
<robot generator="Robot 6.1" schemaversion="4">
  <suite id="S1" name="TMS BDD font-mono font-normal">
    <test id="T1" name="Recarga">
      <status status="PASS"/>
    </test>
  </suite>
</robot>`}
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenOutputXML(); }}
                        className="w-full py-2 px-3 bg-amber-500/10 group-hover:bg-amber-500/20 border border-amber-500/35 text-amber-400 font-bold font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        Visualizar em nova aba ↗
                      </button>
                    </div>

                    {/* Item 2: report.html */}
                    <div 
                      onClick={() => handleOpenReportHTML()}
                      className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 active:scale-[0.985] transition-all gap-4 cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="p-2 bg-sky-500/10 border border-sky-500/10 rounded-lg text-sky-450 font-bold text-xs uppercase font-mono">HTML</span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">Gerado</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-200 group-hover:text-[#FF6600] transition-colors flex items-center gap-1.5">
                          report.html
                          <span className="text-[10px] text-sky-450 font-normal font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                            ↗
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono text-left">
                          Página interativa resumida para supervisores do negócio, com tabelas de estatísticas consolidadas.
                        </p>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenReportHTML(); }}
                        className="w-full py-2 px-3 bg-sky-500/10 group-hover:bg-sky-500/20 border border-sky-500/35 text-sky-400 font-bold font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        Visualizar em nova aba ↗
                      </button>
                    </div>

                    {/* Item 3: log.html */}
                    <div 
                      onClick={() => handleOpenLogHTML()}
                      className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 active:scale-[0.985] transition-all gap-4 cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 font-bold text-xs uppercase font-mono">HTML</span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">Gerado</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-200 group-hover:text-[#FF6600] transition-colors flex items-center gap-1.5">
                          log.html
                          <span className="text-[10px] text-emerald-450 font-normal font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                            ↗
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono text-left">
                          Visão minuciosa com o passo a passo microscópico de chamadas de rede do sistema TMS.
                        </p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded font-mono text-[10px] text-slate-500 max-h-24 overflow-y-auto overflow-x-hidden text-left scrollbar-thin select-text">
                        {`<!-- Robot Log Source -->
<script type="text/javascript">
  window.output = {
    "stats": [ {"pass": 11, "fail": 0} ],
    "baseDir": "%ROBOT_HOME%/results/"
  };
</script>`}
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenLogHTML(); }}
                        className="w-full py-2 px-3 bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 font-bold font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        Visualizar em nova aba ↗
                      </button>
                    </div>

                  </div>
                </div>
              </details>

            </div>
          )}

            {/* Legacy analytics/artifacts dashboard removed (was dead code behind `false &&`). */}
            {false && (() => {
              const last10 = sqliteDb.executions.slice(0, 10);
              const passCount = last10.filter(e => e.status === 'PASS').length;
              const failCount = last10.filter(e => e.status === 'FAIL').length;
              
              const chartData = [
                { name: 'Passed (Sucesso)', value: passCount, color: '#10B981' },
                { name: 'Failed (Falha)', value: failCount, color: '#F43F5E' }
              ].filter(item => item.value > 0);

              const totalRuns = last10.length;
              const avgDuration = totalRuns > 0 ? parseFloat((last10.reduce((acc, c) => acc + c.duration_s, 0) / totalRuns).toFixed(2)) : 0;
              
              const totalTests = last10.reduce((acc, c) => acc + c.total_tests, 0);
              const totalPassed = last10.reduce((acc, c) => acc + c.passed, 0);
              const totalFailed = last10.reduce((acc, c) => acc + c.failed, 0);
              
              return (
                <div className="flex-1 flex flex-col min-h-0 gap-6">
                  
                  {/* Analytics Dashboard Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Pie Chart Section - 5 cols */}
                    <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[300px]">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Mapeamento Geométrico</span>
                        <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-tight mt-0.5">Status de Execuções (%)</h3>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono">
                          Proporção de conformidade das últimas {totalRuns} execuções registradas.
                        </p>
                      </div>

                      {totalRuns > 0 ? (
                        <div className="h-[180px] w-full flex items-center justify-center my-4 font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#020617', borderColor: '#1E293B', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#F1F5F9' }}
                                itemStyle={{ color: '#F1F5F9' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          
                          {/* Center Legend Overlay or side indicators */}
                          <div className="flex flex-col gap-2 shrink-0 justify-center ml-2 border-l border-slate-800/80 pl-4 text-xs font-mono">
                            {chartData.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: item.color }} />
                                <span className="text-slate-300 font-bold">{item.name.split(' ')[0]}:</span>
                                <span className="text-slate-400">{item.value} ({Math.round(item.value / totalRuns * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-505 font-mono text-center py-8">
                          <Sparkles className="w-10 h-10 text-slate-700 mb-2" />
                          <p className="text-xs">Sem execuções no SQLite.</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">Execute testes pelo Terminal para popular o histórico.</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800/60 flex justify-between text-[10px] font-mono text-slate-505">
                        <span>Amostragem: Últimas 10 Runs</span>
                        <span>Total: {totalRuns} / {sqliteDb.executions.length}</span>
                      </div>
                    </div>

                    {/* Breakdown Stats Section - 7 cols */}
                    <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[300px]">
                      <div>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-[#FF6600] font-mono uppercase tracking-wider font-bold">Sumário Numérico</span>
                            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-tight mt-0.5">Indicadores do Ciclo de Integração</h3>
                          </div>
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                            Performance Estável
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono">
                          Nossos integradores calcularam as seguintes métricas correspondentes à série temporal ativa:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                        
                        {/* Metric 1 */}
                        <div className="bg-slate-950 p-3 border border-slate-800/80 rounded-xl font-mono">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Execuções Triunfadas</span>
                          <span className="text-lg font-black text-emerald-400 block mt-1">{passCount} <span className="text-xs font-normal text-slate-500">runs</span></span>
                          <div className="w-full bg-slate-900 h-1 rounded overflow-hidden mt-2">
                            <div className="bg-emerald-400 h-full" style={{ width: `${totalRuns > 0 ? (passCount/totalRuns)*100 : 0}%` }} />
                          </div>
                        </div>

                        {/* Metric 2 */}
                        <div className="bg-slate-950 p-3 border border-slate-800/80 rounded-xl font-mono">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Execuções Falhadas</span>
                          <span className="text-lg font-black text-rose-400 block mt-1">{failCount} <span className="text-xs font-normal text-slate-505">runs</span></span>
                          <div className="w-full bg-slate-905 h-1 rounded overflow-hidden mt-2">
                            <div className="bg-rose-400 h-full" style={{ width: `${totalRuns > 0 ? (failCount/totalRuns)*100 : 0}%` }} />
                          </div>
                        </div>

                        {/* Metric 3 */}
                        <div className="bg-slate-950 p-3 border border-slate-800/80 rounded-xl font-mono">
                          <span className="text-[9px] text-slate-505 font-bold uppercase block">Duração Centesimal</span>
                          <span className="text-lg font-black text-indigo-400 block mt-1">{avgDuration} <span className="text-[10px] font-normal text-slate-550">s / run</span></span>
                          <span className="text-[9px] text-slate-500 block mt-1.5">Latência média local</span>
                        </div>

                      </div>

                      {/* Detailed individual BDD test scenarios breakdown in last 10 executions */}
                      <div className="bg-slate-950/65 border border-slate-880 p-3.5 rounded-xl font-mono text-xs text-left">
                        <span className="text-[9px] text-[#FF6600] font-bold uppercase block mb-1.5">Volume Consolidado de Casos de Testes (Nas Últimas 10)</span>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-400">Total de Casos Executados:</span>
                          <span className="text-slate-200 font-bold">{totalTests} cenários</span>
                        </div>
                        <div className="flex justify-between items-center mb-1.5 text-[11px]">
                          <span className="text-slate-404">{t("Passos Aprovados (Passed) vs Reprovados (Failed):", "Approved Steps (Passed) vs Failed (Failed):")}</span>
                          <span className="text-slate-205">
                            <span className="text-emerald-440 font-bold">{totalPassed} Passed</span>
                            <span className="text-slate-600 px-1">/</span>
                            <span className="text-rose-400 font-bold">{totalFailed} Failed</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-400 h-full" style={{ width: `${totalTests > 0 ? (totalPassed/totalTests)*100 : 0}%` }} />
                          <div className="bg-rose-400 h-full" style={{ width: `${totalTests > 0 ? (totalFailed/totalTests)*100 : 0}%` }} />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-501 flex justify-between">
                        <span>Coerência estrutural</span>
                        <span className="text-emerald-500 flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Sincronizado</span>
                      </div>
                    </div>

                  </div>

                  {/* Diretório de Artefatos %ROBOT_HOME%/results/ */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 min-h-[350px] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                      <div className="flex items-center gap-2">
                        <FolderTree className="text-[#FF6600] w-5 h-5" />
                        <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight">Diretório de Artefatos %ROBOT_HOME%/results/</h3>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">3 arquivos gerados por execução</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Sempre que a execução real do Robot Framework termina, o motor salva os relatórios físicos estruturados de QA em <strong>results/</strong>. 
                      Abaixo você pode pré-visualizar as estruturas dos relatórios no sandbox:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Item 1: output.xml */}
                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all gap-4">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 font-bold text-xs uppercase font-mono">XML</span>
                            <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">Gerado</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-200">output.xml</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono text-left">
                            Informações completas estruturadas em XML para ingestão e controle por Webhook/DevOps CI.
                          </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded font-mono text-[10px] text-slate-500 max-h-24 overflow-y-auto overflow-x-hidden text-left scrollbar-thin select-text">
                          {`<?xml version="1.0" encoding="UTF-8"?>
<robot generator="Robot 6.1" schemaversion="4">
  <suite id="S1" name="TMS BDD">
    <test id="T1" name="Recarga">
      <status status="PASS"/>
    </test>
  </suite>
</robot>`}
                        </div>
                      </div>

                      {/* Item 2: report.html */}
                      <div 
                        onClick={() => handleOpenReportHTML()}
                        className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 active:scale-[0.985] transition-all gap-4 cursor-pointer group"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400 font-bold text-xs uppercase font-mono">HTML</span>
                            <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">Gerado</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-200 group-hover:text-[#FF6600] transition-colors flex items-center gap-1.5">
                            report.html
                            <span className="text-[10px] text-sky-450 font-normal font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                              ↗
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono text-left">
                            Página interativa resumida para supervisores do negócio, com tabelas de estatísticas consolidadas.
                          </p>
                        </div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenReportHTML(); }}
                          className="w-full py-2 px-3 bg-sky-500/10 group-hover:bg-sky-500/20 border border-sky-500/35 text-sky-400 font-bold font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          Visualizar em nova aba ↗
                        </button>
                      </div>

                      {/* Item 3: log.html */}
                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all gap-4">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 font-bold text-xs uppercase font-mono">HTML</span>
                            <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">Gerado</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-200">log.html</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono text-left">
                            Visão minuciosa com o passo a passo microscópico de chamadas de rede do sistema TMS.
                          </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded font-mono text-[10px] text-slate-500 max-h-24 overflow-y-auto overflow-x-hidden text-left scrollbar-thin select-text">
                          {`<!-- Robot Log Source -->
<script type="text/javascript">
  window.output = {
    "stats": [ {"pass": 11, "fail": 0} ],
    "baseDir": "%ROBOT_HOME%/results/"
  };
</script>`}
                        </div>

                      </div>

                    </div>

                  </div>
                  
                </div>
              );
            })()}

          </div>

        </div>

      </main>

      {/* Footer System details */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-xs text-slate-500 font-mono">
        <div>
          <span>ID de Workspace: </span><span className="text-slate-400">8fb882a5-f0c1-4d89-bcfd-f94022af5674</span>
        </div>
        <div className="flex items-center gap-2">
          <span>TMS QA Inc</span>
        </div>
      </footer>

      {/* Dynamic Tag Manager Popup/Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#FF6600]" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight">Configuração de Tags de Execução</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t('Tags de Test Tags e [Tags] nos arquivos .robot', 'Tags from Test Tags and [Tags] in .robot files')}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setEditingTagIndex(null);
                  setIsTagModalOpen(false);
                }}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content list & forms */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
              {/* List of current tags */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-mono font-bold text-[#FF6600] tracking-wider">Tags Cadastradas</span>
                
                <div className="border border-slate-800 rounded-xl bg-slate-950/50 divide-y divide-slate-800/80 overflow-hidden">
                  {executionTags.map((tag, idx) => {
                    const isEditingThis = editingTagIndex === idx;
                    const isActive = filterTag === tag.value;
                    
                    return (
                      <div key={tag.value} className={`p-3.5 flex items-center justify-between gap-4 transition-all ${isActive ? 'bg-[#FF6600]/5' : ''}`}>
                        {isEditingThis ? (
                          <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-[9px] text-slate-500 font-mono">Chave (Sem espaços)</span>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-500 font-mono text-[11px] pointer-events-none">@</span>
                                <input
                                  type="text"
                                  value={editTagValue}
                                  onChange={(e) => setEditTagValue(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700/60 rounded pl-5 pr-2 py-1 focus:outline-none focus:border-[#FF6600] font-mono text-xs text-slate-200"
                                />
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-[9px] text-slate-500 font-mono">Nome de Exibição</span>
                              <input
                                type="text"
                                value={editTagLabel}
                                onChange={(e) => setEditTagLabel(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700/60 rounded px-2 py-1 focus:outline-none focus:border-[#FF6600] text-xs text-slate-200"
                              />
                            </div>
                            <div className="flex items-end gap-1.5 mt-2 sm:mt-0">
                              <button
                                type="button"
                                onClick={handleSaveEditTag}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-xs font-bold transition-all"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTagIndex(null)}
                                className="bg-slate-850 hover:bg-slate-800 text-slate-400 px-2.5 py-1 rounded text-xs transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#FF6600] animate-pulse' : 'bg-slate-700'}`} />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-200 truncate">{tag.label}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">ID / Chave: {tag.value} {isActive && <span className="text-[#FF6600] font-bold">(Ativa)</span>}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditTag(idx)}
                                title="Editar Tag"
                                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-[#FF6600] rounded-lg transition-all border border-slate-800/40"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTag(tag.value)}
                                title="Remover Tag"
                                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-all border border-slate-800/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add tag form inside modal */}
              <div className="border-t border-slate-800/60 pt-4 flex flex-col gap-2.5">
                <span className="text-[10px] uppercase font-mono font-bold text-[#FF6600] tracking-wider">Adicionar Nova Tag</span>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-mono text-[9px]">Chave da Tag (ex: recarga_rapida):</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 font-mono text-[11px] pointer-events-none">@</span>
                        <input
                          type="text"
                          placeholder="tag_id"
                          value={modalNewTagValue}
                          onChange={(e) => setModalNewTagValue(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/60 rounded pl-6 pr-2 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-xs text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-mono text-[9px]">Nome de Exibição (ex: @recarga_rapida (Foco)):</label>
                      <input
                        type="text"
                        placeholder="Nome de Exibição"
                        value={modalNewTagLabel}
                        onChange={(e) => setModalNewTagLabel(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] text-xs text-slate-200"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTagFromModal}
                    className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors font-mono flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Tag ao Sistema
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800/60 flex justify-end gap-2.5 font-mono text-[11px]">
              <span className="text-slate-500 mr-auto flex items-center">
                Total de tags carregadas: {executionTags.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingTagIndex(null);
                  setIsTagModalOpen(false);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 px-4 py-1.5 rounded-lg transition-all"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central de Testes e Especificações (TMS CRUD) */}
      {isTestSpecsOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-6 animate-fade-in text-slate-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-7xl h-[90vh] shadow-2xl flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
                  <Database className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-sm uppercase text-white tracking-tight flex items-center gap-2">
                    Test Management System
                    <span className="text-[10px] bg-sky-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded font-mono">PRODUCT RECL</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">CRUD de Casos de Teste Unitários e BDD • SQLite Virtual Integrado</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTestSpecsOpen(false);
                    setIsCreatingSphereTestCase(false);
                    setIsEditingSphereTestCase(false);
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-100 p-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Fechar Central"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Content (3-Panes TMS Layout) */}
            <div className="flex-1 flex min-h-0 divide-x divide-slate-800 animate-slide-in">
              
              {/* Left Pane (Folder Tree) */}
              <div className="w-[28%] flex flex-col bg-slate-950/20 p-3 min-w-[220px]">
                {/* Redesigned Folder Action Center slightly below the main count to enrich UX */}
                <div className="flex flex-col gap-2.5 mb-3 bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-extrabold tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#FF6600] rounded-full inline-block animate-pulse"></span>
                      Pastas / Features ({(sqliteDb.test_folders || []).length})
                    </span>
                    {selectedSphereFolder && selectedSphereFolder !== 'all' ? (
                      <span className="text-[9px] font-mono font-bold bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-850 max-w-[100px] truncate" title={selectedSphereFolder}>
                        {selectedSphereFolder.split('/').pop()}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold bg-emerald-950/45 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/40">
                        Todas Ativas
                      </span>
                    )}
                  </div>
                  
                  {/* Sleek action toolbar row */}
                  <div className="flex items-center justify-between gap-1 border-t border-slate-800/80 pt-2.5">
                    <div className="flex items-center gap-0.5">
                      {/* Create New Folder */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingFolder(true);
                          setIsEditingFolder(false);
                        }}
                        className="h-8 px-2 text-sky-400 hover:text-sky-300 bg-sky-950/30 hover:bg-sky-950/50 rounded-lg transition-all border border-sky-900/40 flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0"
                        title="Criar Nova Pasta / Feature"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[9.5px] font-mono font-black pr-0.5 hidden sm:inline">Nova</span>
                      </button>

                      {/* Edit Folder Name */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSphereFolder && selectedSphereFolder !== 'all') {
                            setEditFolderNameValue(selectedSphereFolder);
                            setIsEditingFolder(true);
                            setIsCreatingFolder(false);
                          } else {
                            alert("Selecione uma pasta de teste específica para editar.");
                          }
                        }}
                        className={`h-8 px-2 rounded-lg transition-all border flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0 ${
                          selectedSphereFolder && selectedSphereFolder !== 'all'
                            ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/35 hover:bg-indigo-950/55 border-indigo-900/40'
                            : 'text-slate-600 bg-slate-900/30 border-slate-800/80 cursor-not-allowed opacity-40'
                        }`}
                        disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                        title="Editar Pasta Selecionada"
                      >
                        <Edit className="w-3.5 h-3.5 stroke-[2]" />
                        <span className="text-[9.5px] font-mono font-black pr-0.5 hidden sm:inline">Editar</span>
                      </button>

                      {/* Delete Selected Folder with associated tests */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSphereFolder && selectedSphereFolder !== 'all') {
                            handleDeleteFolder(selectedSphereFolder);
                          } else {
                            alert("Selecione uma pasta de teste específica para excluir.");
                          }
                        }}
                        className={`h-8 px-2 rounded-lg transition-all border flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0 ${
                          selectedSphereFolder && selectedSphereFolder !== 'all'
                            ? 'text-rose-400 hover:text-rose-300 bg-rose-950/35 hover:bg-rose-950/55 border-rose-900/40'
                            : 'text-slate-600 bg-slate-900/30 border-slate-800/80 cursor-not-allowed opacity-40'
                        }`}
                        disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                        title="Excluir Pasta com todos os Testes"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                        <span className="text-[9.5px] font-mono font-black pr-0.5 hidden sm:inline">Excluir</span>
                      </button>
                    </div>

                    {/* Export Excel Button with elegant design */}
                    <button
                      type="button"
                      onClick={() => {
                        const casesToExport = sqliteDb.test_cases_sphere || [];
                        const foldersList = sqliteDb.test_folders || [];
                        if (casesToExport.length === 0) {
                          alert("Não existem casos de teste cadastrados para exportar.");
                          return;
                        }
                        handleExportToExcel(casesToExport, foldersList, sphereCustomSqlQuery, sphereCustomScriptLanguage, sphereTestCaseStatuses, language);
                        setToastMessage("Plataforma: Casos de teste exportados para Excel com sucesso!");
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="h-8 px-1.5 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0"
                      title="Exportar todos os Casos para Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9.5px] font-mono font-black hidden sm:inline">Excel</span>
                    </button>

                    {/* Export PDF Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const casesToExport = sqliteDb.test_cases_sphere || [];
                        const foldersList = sqliteDb.test_folders || [];
                        if (casesToExport.length === 0) {
                          alert("Não existem casos de teste cadastrados para exportar.");
                          return;
                        }
                        handleExportTestCasesToPDF(casesToExport, foldersList, sphereTestCaseStatuses, language);
                        setToastMessage("Plataforma: Plano de testes exportado para PDF com sucesso!");
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="h-8 px-1.5 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 border border-rose-900/50 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0"
                      title="Exportar Plano de Testes para PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[9.5px] font-mono font-black hidden sm:inline">Exportar PDF</span>
                    </button>
                  </div>
                </div>

                {isCreatingFolder && (
                  <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 mb-2 flex flex-col gap-2 scale-up">
                    <input
                      type="text"
                      placeholder="Nome da pasta/caminho"
                      value={newFolderNameValue}
                      onChange={(e) => setNewFolderNameValue(e.target.value)}
                      className="bg-slate-900 border border-slate-750 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCreatingFolder(false)}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-400"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateFolder(newFolderNameValue)}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-bold animate-pulse"
                      >
                        Criar
                      </button>
                    </div>
                  </div>
                )}

                {isEditingFolder && (
                  <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 mb-2 flex flex-col gap-2 scale-up">
                    <input
                      type="text"
                      placeholder="Nome da pasta/caminho"
                      value={editFolderNameValue}
                      onChange={(e) => setEditFolderNameValue(e.target.value)}
                      className="bg-slate-900 border border-slate-750 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingFolder(false)}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-400"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateFolderName(selectedSphereFolder, editFolderNameValue)}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-bold"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
                  {/* "All folders" special node */}
                  <div
                    onClick={() => {
                      setSelectedSphereFolder('all');
                      setSelectedSphereTestCaseId(null);
                    }}
                    className={`p-2.5 rounded-lg flex items-center gap-2 text-left text-xs cursor-pointer transition-all border ${
                      selectedSphereFolder === 'all'
                        ? 'bg-sky-500/15 border-sky-500 border-l-[5px] border-l-sky-500 text-sky-400 font-extrabold shadow-sm'
                        : 'text-slate-400 bg-slate-900/40 hover:bg-slate-850 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    {selectedSphereFolder === 'all' ? (
                      <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                    ) : (
                      <Folder className="w-4 h-4 shrink-0 text-slate-550" />
                    )}
                    <span className="truncate font-medium">Todas as Pastas</span>
                  </div>

                  {/* Render standard folders */}
                  {(sqliteDb.test_folders || []).map((folder, i) => {
                    const isSelected = selectedSphereFolder === folder;
                    const folderLabel = folder.replace('br.com.grupocard.contacard.dev/', '');
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedSphereFolder(folder);
                          const filtered = (sqliteDb.test_cases_sphere || []).filter(tc => tc.folder === folder);
                          setSelectedSphereTestCaseId(filtered.length > 0 ? filtered[0].id : null);
                          setIsCreatingSphereTestCase(false);
                          setIsEditingSphereTestCase(false);
                        }}
                        className={`p-2.5 rounded-lg flex items-center gap-2.5 text-left text-[11.5px] cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 border-l-[5px] border-l-sky-500 text-sky-400 font-extrabold shadow-sm'
                            : 'text-slate-350 bg-slate-900/40 hover:bg-slate-850 hover:text-slate-200 border-slate-800'
                        }`}
                        title={folder}
                      >
                        {isSelected ? (
                          <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                        ) : (
                          <Folder className="w-4 h-4 shrink-0 text-slate-500" />
                        )}
                        <span className="truncate font-medium">{folderLabel}</span>
                        {/* Show count badges */}
                        <span className={`ml-auto font-mono text-[9px] px-1 py-0.2 rounded font-semibold ${
                          isSelected ? 'bg-sky-950 text-sky-400' : 'bg-slate-950 text-slate-500'
                        }`}>
                          {(sqliteDb.test_cases_sphere || []).filter(tc => tc.folder === folder).length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Middle Pane (Test Cases list in Selected Folder) */}
              <div className="w-[32%] flex flex-col p-3 min-w-[240px]">
                {/* Search */}
                <div className="relative mb-3.5">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 pointer-events-none">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar por nome/id..."
                    value={searchSphereQuery}
                    onChange={(e) => setSearchSphereQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-550"
                  />
                  {searchSphereQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchSphereQuery('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleImportAcceptanceDocClick}
                  disabled={!selectedSphereFolder || selectedSphereFolder === 'all'}
                  className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl border border-slate-800 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-950 py-2 text-[11px] font-mono font-bold text-sky-400 transition-colors"
                  title="Importar um arquivo .md compartilhado por todos os casos desta pasta"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar Critérios de Aceite
                </button>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Casos de Teste</span>
                  <span className="text-[10px] font-mono text-slate-450">
                    Mostrando {
                      (sqliteDb.test_cases_sphere || [])
                        .filter(tc => selectedSphereFolder === 'all' || tc.folder === selectedSphereFolder)
                        .filter(tc => !searchSphereQuery.trim() || tc.id.toLowerCase().includes(searchSphereQuery.toLowerCase()) || tc.title.toLowerCase().includes(searchSphereQuery.toLowerCase())).length
                    }
                  </span>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
                  {(() => {
                    const filteredCases = (sqliteDb.test_cases_sphere || [])
                      .filter(tc => selectedSphereFolder === 'all' || tc.folder === selectedSphereFolder)
                      .filter(tc => {
                        if (!searchSphereQuery.trim()) return true;
                        const query = searchSphereQuery.toLowerCase();
                        return tc.id.toLowerCase().includes(query) || tc.title.toLowerCase().includes(query);
                      });

                    if (filteredCases.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-500 font-mono text-xs">
                          Nenhum caso encontrado.
                        </div>
                      );
                    }

                    return filteredCases.map((tc) => {
                      const isSelected = selectedSphereTestCaseId === tc.id;
                      const cleanTitle = tc.title.replace(/^[^-]+-\s*(Cenário de Teste Positivo - |Cenário de Teste Alternativo - )?/i, '');
                      
                      return (
                        <div
                          key={tc.id}
                          onClick={() => {
                            setSelectedSphereTestCaseId(tc.id);
                            setIsCreatingSphereTestCase(false);
                            setIsEditingSphereTestCase(false);
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-slate-800/80 border-sky-500 shadow-sm shadow-sky-500/10 text-sky-200'
                              : 'bg-slate-900/30 hover:bg-slate-900/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                              isSelected ? 'bg-sky-500 text-slate-950' : 'bg-slate-950 text-slate-300'
                            }`}>
                              {tc.id}
                            </span>
                            <span className="font-mono text-[8.5px] text-slate-500 block truncate max-w-[120px]" title={tc.folder}>
                              {tc.folder.split('/').pop()}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-slate-200 text-xs leading-snug line-clamp-2">
                            {cleanTitle}
                          </h4>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Quick creation footer */}
                <button
                  type="button"
                  onClick={() => {
                    const count = (sqliteDb.test_cases_sphere || []).length + 1;
                    const nextId = `RECEL${String(count).padStart(2, '0')}`;
                    const nCase = {
                      id: nextId,
                      folder: selectedSphereFolder === 'all' ? 'br.com.grupocard.contacard.dev/Recarga de telefone' : selectedSphereFolder,
                      title: `${nextId} - Cenário de Teste Positivo - Nova recarga rápida de telefone inteligente`,
                      preconditions: `*** Variables ***\n\${DEFAULT_CPF}=    03533062236`,
                      steps: `Dado que o cliente realiza a recarga básica\nQuando insere DDD e número válido\nEntão a operação é concluída com impressão de comprovante.`,
                      expected_result: "Operação executada e confirmada nas tabelas SQLite de logs de execução.",
                      history: [{ user: "Reinaldo", action: "created test case via Quick creation", time: getFormattedTimestamp() }],
                      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
                    };
                    handleCreateTestCaseSphere(nCase);
                  }}
                  className="mt-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 py-2 rounded-xl text-xs font-mono text-sky-400 flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Caso de Teste
                </button>
              </div>

              {/* Right Pane (Selected Test Case Details / Editing Form) */}
              <div className="w-[40%] flex flex-col overflow-y-auto p-5 bg-slate-950/40">
                {isCreatingSphereTestCase || isEditingSphereTestCase ? (
                  /* Create or Edit TestCase Form */
                  <div className="flex flex-col gap-4 text-left scale-up">
                    <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                      <div>
                        <h4 className="font-extrabold text-sm text-sky-400 uppercase font-mono">
                          {isCreatingSphereTestCase ? "Cadastrar Caso de Teste" : `Editar - ${formSphereId}`}
                        </h4>
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Sincroniza automaticamente com o Workspace Gherkin</p>
                      </div>
                      <span className="text-[10px] bg-slate-900 border border-slate-850 text-slate-400 font-mono px-2 py-0.5 rounded">
                        SQLite
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400 font-mono text-[10px] font-bold">ID:</label>
                        <input
                          type="text"
                          value={formSphereId}
                          onChange={(e) => setFormSphereId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                          disabled={isEditingSphereTestCase}
                          placeholder="RECEL17"
                          className="bg-slate-950 border border-slate-800 disabled:bg-slate-950/40 disabled:text-slate-550 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400 font-mono text-[10px] font-bold">Pasta:</label>
                        <select
                          value={formSphereFolder}
                          onChange={(e) => setFormSphereFolder(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          {(sqliteDb.test_folders || []).map((fold, idx) => (
                            <option key={idx} value={fold}>{fold.replace('br.com.grupocard.contacard.dev/', '')}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-mono text-[10px] font-bold">Título / Descrição do Caso de Teste:</label>
                      <input
                        type="text"
                        placeholder="Ex: RECEL01 - Cenário de Teste Positivo..."
                        value={formSphereTitle}
                        onChange={(e) => setFormSphereTitle(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-sans"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-mono text-[10px] font-bold font-semibold">Pré-condições (Robot Variables):</label>
                      <textarea
                        rows={3}
                        placeholder="*** Variables ***&#10;${CPF}=    03533062236"
                        value={formSpherePreconditions}
                        onChange={(e) => setFormSpherePreconditions(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[10.5px] text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-mono text-[10px] font-bold font-bold text-sky-400">Cenário de Passos (Sintaxe Gherkin BDD / Robot):</label>
                      <textarea
                        rows={5}
                        placeholder="Dado que...&#10;Quando...&#10;Então..."
                        value={formSphereSteps}
                        spellCheck={false}
                        onChange={(e) => setFormSphereSteps(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[10.5px] text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-mono text-[10px] font-bold">Resultado Esperado:</label>
                      <textarea
                        rows={3}
                        placeholder="Esperado..."
                        value={formSphereExpectedResult}
                        onChange={(e) => setFormSphereExpectedResult(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-y"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-orange-400 font-mono text-[10px] font-bold">OBSERVAÇÂO:</label>
                      <textarea
                        rows={3}
                        placeholder="Observação..."
                        value={formSphereObservation}
                        onChange={(e) => setFormSphereObservation(e.target.value)}
                        className="bg-slate-950 border border-orange-900/50 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 resize-y placeholder:text-slate-600"
                      />
                    </div>

                    {/* Actions Form */}
                    <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingSphereTestCase(false);
                          setIsEditingSphereTestCase(false);
                        }}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-400 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isCreatingSphereTestCase) {
                            const nCase = {
                              id: formSphereId,
                              folder: formSphereFolder,
                              title: formSphereTitle,
                              preconditions: formSpherePreconditions,
                              steps: formSphereSteps,
                              expected_result: formSphereExpectedResult,
                              observation: formSphereObservation,
                              history: [{ user: "Reinaldo", action: "created test case", time: getFormattedTimestamp() }],
                              created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
                            };
                            handleCreateTestCaseSphere(nCase);
                          } else {
                            handleUpdateTestCaseSphere(formSphereId, {
                              folder: formSphereFolder,
                              title: formSphereTitle,
                              preconditions: formSpherePreconditions,
                              steps: formSphereSteps,
                              expected_result: formSphereExpectedResult,
                              observation: formSphereObservation
                            });
                          }
                        }}
                        className="bg-sky-500 hover:bg-sky-600 text-slate-950 px-5 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Read details pane */
                  (() => {
                    const currentCase = (sqliteDb.test_cases_sphere || []).find(tc => tc.id === selectedSphereTestCaseId);
                    if (!currentCase) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs gap-3">
                          <Compass className="w-8 h-8 text-slate-700 animate-pulse" />
                          Selecione um Caso de Teste na lista ao lado para ver as precondições, passos e histórico.
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-4 text-left">
                        {/* Title details */}
                        <div className="border-b border-slate-800/80 pb-3.5 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                                {currentCase.id}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Data: {currentCase.created_at}
                              </span>
                            </div>

                            {/* Live Execution Status Badge */}
                            {(() => {
                              const status = sphereTestCaseStatuses[currentCase.id] || 'Not executed';
                              let displayLabel = t("Não Iniciado", "Not Started");
                              let colorClasses = 'bg-slate-800 text-slate-400 border-slate-700/60';
                              let dotColor = 'bg-slate-500';
                              
                              if (status === 'PASS' || status === 'Passed' || status === 'PASSED') {
                                displayLabel = t("Aprovado", "Passed");
                                colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                dotColor = 'bg-emerald-400';
                              } else if (status === 'SKIP' || status === 'Skipped' || status === 'SKIPPED') {
                                displayLabel = t("Ignorado", "Skipped");
                                colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/20';
                                dotColor = 'bg-amber-400';
                              } else if (status === 'FAIL' || status === 'Failed' || status === 'FAILED') {
                                displayLabel = t("Falhou", "Failed");
                                colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                                dotColor = 'bg-rose-400';
                              } else if (status === 'BLOCKED' || status === 'Blocked') {
                                displayLabel = t("Bloqueado", "Blocked");
                                colorClasses = 'bg-violet-500/15 text-violet-400 border-violet-500/20';
                                dotColor = 'bg-violet-400';
                              } else if (status === 'IN_PROGRESS' || status === 'In Progress' || status === 'running') {
                                displayLabel = t("Em Progresso", "In Progress");
                                colorClasses = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
                                dotColor = 'bg-blue-400';
                              }

                              return (
                                <div className={`flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold font-mono border rounded-lg shadow-sm ${colorClasses}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                  <span>{displayLabel}</span>
                                </div>
                              );
                            })()}
                          </div>

                          <h3 className="text-sm font-black text-white mt-1 leading-snug font-sans">
                            {currentCase.title}
                          </h3>

                          {/* Detail Tabs */}
                          <div className="flex items-center gap-1.5 border-b border-slate-800 mt-2.5">
                            <button
                              type="button"
                              onClick={() => setSphereActiveDetailTab('overview')}
                              className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                                sphereActiveDetailTab === 'overview'
                                  ? 'border-[#FF6600] text-[#FF6600]'
                                  : 'border-transparent text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Overview
                            </button>
                            <button
                              type="button"
                              onClick={() => setSphereActiveDetailTab('evidence')}
                              className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                                sphereActiveDetailTab === 'evidence'
                                  ? 'border-[#FF6600] text-[#FF6600]'
                                  : 'border-transparent text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Evidências
                            </button>
                            <button
                              type="button"
                              onClick={() => setSphereActiveDetailTab('insights')}
                              className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                                sphereActiveDetailTab === 'insights'
                                  ? 'border-[#FF6600] text-[#FF6600]'
                                  : 'border-transparent text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Audit Log ({(currentCase.history || []).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSphereActiveDetailTab('scripts')}
                              className={`px-3.5 py-1.5 text-[10.5px] font-mono font-bold transition-all border-b-2 ${
                                sphereActiveDetailTab === 'scripts'
                                  ? 'border-[#FF6600] text-[#FF6600]'
                                  : 'border-transparent text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Scripts
                            </button>
                          </div>
                        </div>

                        {sphereActiveDetailTab === 'overview' && (
                          /* Overview Panel */
                          <div className="flex flex-col gap-3.5">
                            {(() => {
                              const acceptanceDoc = resolveFolderAcceptanceDoc(currentCase.folder);
                              return (
                                <div className="flex flex-col gap-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                                  <span className="text-[10px] text-sky-400 uppercase font-mono font-extrabold tracking-wider">
                                    Critério de Aceite
                                  </span>
                                  {acceptanceDoc ? (
                                    <a
                                      href={acceptanceDoc.doc_web_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-xs font-mono font-bold text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500 rounded-lg px-3 py-2 w-fit bg-slate-950 transition-colors"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                      {acceptanceDoc.doc_title}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <p className="text-[11px] font-sans text-slate-500">
                                      Nenhum critério importado para esta pasta.
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Pre-conditions */}
                            {currentCase.preconditions && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-450 uppercase font-mono font-extrabold tracking-wider">Pre-conditions</span>
                                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre leading-normal">
                                  {currentCase.preconditions}
                                </div>
                              </div>
                            )}

                            {/* Test Steps */}
                            <div className="flex flex-col gap-1 bg-[#121620]/30 border border-slate-800/80 rounded-xl p-3">
                              <span className="text-[10px] text-[#FF6600] uppercase font-mono font-extrabold tracking-wider block mb-1">Cenário de Teste / Passos BDD</span>
                              <div className="flex flex-col gap-1.5">
                                {currentCase.steps.split('\n').map((line, idx) => {
                                  const stepMatch = line.trim().match(/^(Dado que|Dado|Quando|Então|E|Mas|Given|When|Then|And|But)\s+(.*)$/i);
                                  if (stepMatch) {
                                    const keyword = stepMatch[1];
                                    const text = stepMatch[2];
                                    let kwColor = "text-indigo-400 font-bold";
                                    if (['Dado', 'Given'].includes(keyword)) kwColor = 'text-[#FF6600] font-bold';
                                    else if (['Quando', 'When'].includes(keyword)) kwColor = 'text-yellow-400 font-bold';
                                    else if (['Então', 'Then'].includes(keyword)) kwColor = 'text-emerald-450 font-bold';
                                    
                                    return (
                                      <div key={idx} className="flex gap-1.5 text-[11px] font-mono leading-tight">
                                        <span className={kwColor}>{keyword}</span>
                                        <span className="text-slate-300">{text}</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} className="text-slate-450 text-[10px] font-mono leading-tight pl-3" style={{ contentVisibility: 'auto' }}>
                                      {line}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Expected Outcome */}
                            <div className="flex flex-col gap-1 bg-slate-950 p-3 rounded-xl border border-slate-850">
                              <span className="text-[10px] text-emerald-400 uppercase font-mono font-extrabold tracking-wider">Resultado Esperado (Expected Outcome)</span>
                              <p className="text-[11px] font-sans text-slate-300 mt-1 pl-1 border-l-2 border-emerald-500/60 leading-normal">
                                {currentCase.expected_result}
                              </p>
                            </div>

                            {/* Observation / Notes (Soft Orange Contrast) */}
                            <div className="flex flex-col gap-1 bg-orange-950/20 p-3 rounded-xl border border-orange-500/20">
                              <span className="text-[10px] text-orange-400 uppercase font-mono font-extrabold tracking-wider">OBSERVAÇÂO</span>
                              <p className="text-[11px] font-sans text-slate-300 mt-1 pl-1 border-l-2 border-orange-500/60 leading-normal whitespace-pre-wrap">
                                {currentCase.observation || 'Nenhuma observação registrada.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {sphereActiveDetailTab === 'evidence' && currentCase && (
                          <TestCaseEvidenceTab testCaseId={currentCase.id} />
                        )}

                        {sphereActiveDetailTab === 'insights' && (
                          /* History (Insights) Panel */
                          <div className="flex flex-col gap-2.5">
                            <span className="text-[10px] text-[#FF6600] uppercase font-mono font-bold tracking-wider">Histórico de Alterações</span>
                            
                            <div className="relative border-l border-slate-800 pl-4 ml-1 flex flex-col gap-4 py-2">
                              {(currentCase.history || []).map((h, i) => (
                                <div key={i} className="relative text-[11px] font-mono flex flex-col">
                                  {/* Timeline node bullet */}
                                  <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-950" />
                                  <div className="flex items-center gap-1 text-slate-450 text-[10px]">
                                    <span className="text-slate-300 font-bold">{h.user}</span>
                                    <span>•</span>
                                    <span>{h.time}</span>
                                  </div>
                                  <p className="text-slate-400 mt-0.5">{h.action}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {sphereActiveDetailTab === 'scripts' && (
                          /* Scripts Panel */
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-4">
                              {/* SQL Query Field */}
                              <div className="flex flex-col gap-1.5 text-left">
                                <span className="text-[10px] text-slate-400 uppercase font-mono font-extrabold tracking-wider font-bold">SQL QUERY:</span>
                                <textarea
                                  rows={10}
                                  value={sphereCustomSqlQuery[currentCase.id] !== undefined ? sphereCustomSqlQuery[currentCase.id] : getDefaultSqlQuery(currentCase.id)}
                                  onChange={(e) => {
                                    setSphereCustomSqlQuery(prev => ({
                                      ...prev,
                                      [currentCase.id]: e.target.value
                                    }));
                                  }}
                                  className="w-full bg-slate-950 border border-slate-805 rounded-xl p-3.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-[#FF6600] placeholder:text-slate-600 leading-relaxed resize-y"
                                  placeholder="Digite ou edite suas queries SQL aqui..."
                                />
                              </div>

                              {/* Script Language Field */}
                              <div className="flex flex-col gap-1.5 text-left">
                                <span className="text-[10px] text-slate-400 uppercase font-mono font-extrabold tracking-wider font-bold">SCRIPT LANGUAGE:</span>
                                <textarea
                                  rows={10}
                                  value={sphereCustomScriptLanguage[currentCase.id] !== undefined ? sphereCustomScriptLanguage[currentCase.id] : getDefaultScriptLanguage(currentCase.id, currentCase.title)}
                                  onChange={(e) => {
                                    setSphereCustomScriptLanguage(prev => ({
                                      ...prev,
                                      [currentCase.id]: e.target.value
                                    }));
                                  }}
                                  className="w-full bg-slate-950 border border-slate-805 rounded-xl p-3.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-[#FF6600] placeholder:text-slate-600 leading-relaxed resize-y"
                                  placeholder="# Digite ou edite seus scripts ou códigos aqui..."
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stored Specs Detail Actions */}
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3.5 mt-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteTestCaseSphere(currentCase.id)}
                            className="bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-[#F43F5E] text-rose-400 px-3.5 py-1.5 rounded-xl text-xs transition-all font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormSphereId(currentCase.id);
                                setFormSphereFolder(currentCase.folder);
                                setFormSphereTitle(currentCase.title);
                                setFormSpherePreconditions(currentCase.preconditions);
                                setFormSphereSteps(currentCase.steps);
                                setFormSphereExpectedResult(currentCase.expected_result);
                                setFormSphereObservation(currentCase.observation || '');
                                setIsEditingSphereTestCase(true);
                                setIsCreatingSphereTestCase(false);
                              }}
                              className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-indigo-400" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleLoadTestCaseToWorkspace(currentCase.id);
                                setIsTestSpecsOpen(false);
                              }}
                              className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-colors font-mono flex items-center gap-1.5 shadow-md shadow-sky-500/15 cursor-pointer ml-1"
                              title="Carregar e executar este caso de teste automatizado"
                            >
                              <PlayCircle className="w-4 h-4 text-slate-950 stroke-[2.5px] fill-slate-950" />
                              Executar Teste Automatizado
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Footer Status Metadata */}
            <div className="p-3 bg-slate-950 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span></span>
              <span>Total: {(sqliteDb.test_cases_sphere || []).length} casos de testes arquivados</span>
            </div>
          </div>
        </div>
      )}

      {/* Menu Lateral Suspenso a Direita */}
      <AnimatePresence>
        {isNavDrawerOpen && (
          <>
            {/* Backdrop click dismisser */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Suspended Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header of Drawer */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-lg text-[#FF6600]">
                      <Sliders className="w-4 h-4 text-[#FF6600]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight leading-none text-left">Painéis de Controle</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 text-left">Navegação e visões de execução QA</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsNavDrawerOpen(false)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Options - Menu List */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider text-left">Selecione uma Visualização</span>

                  {/* Option 1: Terminal Robot Framework */}
                  <div
                    onClick={() => {
                      window.open(`${window.location.origin}/terminal`, '_blank');
                      setIsNavDrawerOpen(false);
                    }}
                    className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all text-left cursor-pointer group active:scale-[0.98] ${
                      activeTab === 'terminal'
                        ? 'bg-[#FF6600]/10 border-[#FF6600] shadow-md shadow-[#FF6600]/5'
                        : 'bg-slate-950 border-slate-800/80 hover:border-[#FF6600]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${activeTab === 'terminal' ? 'bg-[#FF6600] text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                          <TerminalIcon className="w-4 h-4" />
                        </div>
                        <h4 className={`font-bold text-xs ${activeTab === 'terminal' ? 'text-white' : 'text-slate-200 group-hover:text-[#FF6600]'} transition-colors`}>
                          Terminal Robot Framework
                        </h4>
                      </div>
                      {activeTab === 'terminal' && (
                        <span className="text-[9px] font-mono bg-[#FF6600]/25 text-[#FF6600] border border-[#FF6600]/30 px-1.5 py-0.5 rounded font-black uppercase">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-mono text-left">
                      Console virtual com logs detalhados das etapas de execução BDD, filtragem de tags e logs do Robot.
                    </p>
                  </div>

                  {/* Option 2: Histórico de Execução Remoto */}
                  <div
                    onClick={() => {
                      window.open(`${window.location.origin}/sqlite`, '_blank');
                      setIsNavDrawerOpen(false);
                    }}
                    className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all text-left cursor-pointer group active:scale-[0.98] ${
                      activeTab === 'sqlite'
                        ? 'bg-[#FF6600]/10 border-[#FF6600] shadow-md shadow-[#FF6600]/5'
                        : 'bg-slate-950 border-slate-800/80 hover:border-[#FF6600]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${activeTab === 'sqlite' ? 'bg-[#FF6600] text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                          <Database className="w-4 h-4" />
                        </div>
                        <h4 className={`font-bold text-xs ${activeTab === 'sqlite' ? 'text-white' : 'text-slate-200 group-hover:text-[#FF6600]'} transition-colors`}>
                          Histórico de Execução Remoto
                        </h4>
                      </div>
                      {activeTab === 'sqlite' && (
                        <span className="text-[9px] font-mono bg-[#FF6600]/25 text-[#FF6600] border border-[#FF6600]/30 px-1.5 py-0.5 rounded font-black uppercase">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-mono text-left">
                      Navegador SQLite para analisar execuções de testes, tabelas estruturadas, casos executados e passos de BDD.
                    </p>
                  </div>

                  {/* Option 3: Relatórios */}
                  <div
                    onClick={() => {
                      window.open(`${window.location.origin}/reports`, '_blank');
                      setIsNavDrawerOpen(false);
                    }}
                    className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all text-left cursor-pointer group active:scale-[0.98] ${
                      activeTab === 'reports'
                        ? 'bg-[#FF6600]/10 border-[#FF6600] shadow-md shadow-[#FF6600]/5'
                        : 'bg-slate-950 border-slate-800/80 hover:border-[#FF6600]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${activeTab === 'reports' ? 'bg-[#FF6600] text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <h4 className={`font-bold text-xs ${activeTab === 'reports' ? 'text-white' : 'text-slate-200 group-hover:text-[#FF6600]'} transition-colors`}>
                          Relatórios
                        </h4>
                      </div>
                      {activeTab === 'reports' && (
                        <span className="text-[9px] font-mono bg-[#FF6600]/25 text-[#FF6600] border border-[#FF6600]/30 px-1.5 py-0.5 rounded font-black uppercase">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-mono text-left">
                      Visualização consolidada de estatísticas e gráficos de suite de testes, taxa de aprovação e report.html.
                    </p>
                  </div>

                  {/* Option 4: TMS Standalone */}
                  <div
                    onClick={() => {
                      window.open(`${window.location.origin}/tms`, '_blank');
                      setIsNavDrawerOpen(false);
                    }}
                    className="p-4 rounded-xl border flex flex-col gap-2.5 transition-all text-left cursor-pointer group active:scale-[0.98] bg-slate-950 border-slate-800/80 hover:border-sky-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg border bg-slate-900 border-slate-800 text-sky-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-xs text-slate-200 group-hover:text-sky-400 transition-colors">
                          TMS - Casos de Teste (Standalone) ↗
                        </h4>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal font-mono text-left">
                      Central avançada de gestão de casos de teste em tela cheia com fundo branco. Sincroniza em tempo real.
                    </p>
                  </div>

                </div>
              </div>

              {/* Bottom stats inside Drawer */}
              <div className="border-t border-slate-800 pt-4 flex flex-col gap-3 font-mono text-[10px] select-none text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Workspace Act:</span>
                  <span className="text-slate-300 font-bold truncate max-w-[180px]">8fb882a5-f0c1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Suite Status:</span>
                  <span className="text-emerald-400 font-bold">READY (ONLINE)</span>
                </div>
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-755 text-slate-200 font-bold rounded-lg text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  Fechar Menu de Navegação
                </button>
              </div>
            </motion.div>
          </>
        )}

        {isConfigOpen && (
          <>
            {/* Backdrop click dismisser */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Config Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header of Config Drawer */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-lg text-[#FF6600]">
                      <Settings className="w-4 h-4 text-[#FF6600]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight leading-none text-left">Menu de Configuração</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 text-left">Calibração e Administração</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsConfigOpen(false)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Configurations Body */}
                <div className="flex flex-col gap-6 text-left">

                  {/* REAL-TIME SYNC STATUS */}
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide font-mono">Sincronização Ativa</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold text-emerald-400 font-mono">CONECTADO (StorageEvent)</span>
                    </div>
                    <p className="text-[11px] leading-normal text-slate-400 font-mono">
                      Todas as guias secundárias de **Histórico Remoto** ou **Relatórios** abertas sincronizam suas execuções instantaneamente.
                    </p>
                  </div>

                  {/* SQLITE DB ADMINISTRATION (RESET DB) */}
                  <div className="bg-slate-950 border border-rose-950/40 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wide font-mono">Administração de Dados</span>
                    </div>
                    <p className="text-[11px] leading-normal text-slate-400 font-mono">
                      Ação destrutiva reversível. Reinicia todo o Histórico de Execuções e tabelas SQLite local, povoando-as com o Seed padrão.
                    </p>
                    <button
                      onClick={() => {
                        handleResetDatabase();
                        // Provide simple temporary state feedback within drawer
                        const key = 'cardmais_reset_success_feedback';
                        localStorage.setItem(key, 'true');
                        // Reset is already dispatched, show alert in terminal too
                      }}
                      className="w-full py-2 px-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 border border-rose-800/40 hover:border-rose-700 font-mono font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <DatabaseZap className="w-3.5 h-3.5" />
                      Resetar Banco de Dados (Reset DB)
                    </button>
                  </div>

                </div>
              </div>

              {/* Drawer footer */}
              <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
                <button
                  onClick={() => setIsConfigOpen(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-755 text-slate-200 font-bold rounded-lg text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  Confirmar e Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
