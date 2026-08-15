/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef } from 'react';
import type { DbExecution, DbTestCase, DbStepLog, VirtualDatabase } from '../utils/sqliteEngine';
import { 
  INITIAL_ROBOT_EXECUTION_PROGRESS, 
  updateRobotExecutionProgress 
} from '../utils/robotExecutionProgress';
import { 
  buildFeatureRobotCommand, 
  buildSingleTestRobotCommand, 
  withRobotOutputDirectory 
} from '../utils/robotCommands';
import { 
  createRunFolderForTimestamp, 
  formatRobotRunTimestamp, 
  persistRobotRunOutput, 
  runRobotCommandStreaming 
} from '../utils/robotRunner';
import { 
  ExecutionTagOption, 
  RobotTestTagEntry, 
  buildExecutionTagsFromRobotTestTags, 
  normalizeExecutionTagValue 
} from '../utils/robotTagLoader';
import { apiClient } from '../lib/api/client';

export interface TerminalLogEntry {
  id: string;
  text: string;
  mode?: 'normal' | 'cmd' | 'success' | 'warn' | 'error' | 'header';
}

interface UseTerminalRunnerOptions {
  robotResultsDirectory: string;
  language: 'PT' | 'ENG';
  t: (pt: string, en: string) => string;
  setSqliteDb: React.Dispatch<React.SetStateAction<VirtualDatabase>>;
}

export function useTerminalRunner({
  robotResultsDirectory,
  language,
  t,
  setSqliteDb,
}: UseTerminalRunnerOptions) {
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([]);
  const [robotExecutionProgress, setRobotExecutionProgress] = useState(
    INITIAL_ROBOT_EXECUTION_PROGRESS,
  );
  const [isExecutingFeature, setIsExecutingFeature] = useState<boolean>(false);
  const [executionTags, setExecutionTags] = useState<ExecutionTagOption[]>([]);
  const [projectFolders, setProjectFolders] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string>('');
  const [selectedProjectFolder, setSelectedProjectFolder] = useState<string | null>(null);
  const [argsFile, setArgsFile] = useState<string>('');

  const appendTerminalLog = useCallback(
    (text: string, mode: 'normal' | 'cmd' | 'success' | 'warn' | 'error' | 'header' = 'normal') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setTerminalLogs((prev) => [...prev, { id, text, mode }]);

      if (mode === 'normal' || mode === 'cmd') {
        setRobotExecutionProgress((current) => updateRobotExecutionProgress(current, text));
      }
    },
    [],
  );

  const applyExecutionTagsFromRobot = useCallback(
    (
      newTags: Array<{ tag: string; sourceFile?: string; sourceFolder?: string; isSuiteTestTag?: boolean }>,
      options?: { log?: boolean; logPrefix?: string },
    ) => {
      const optionsFromRobot = buildExecutionTagsFromRobotTestTags(newTags);

      if (optionsFromRobot.length > 0) {
        setExecutionTags(optionsFromRobot);
        const savedTag = localStorage.getItem('qa_tms_execution_tag');

        if (savedTag && optionsFromRobot.some((item) => item.value === savedTag)) {
          setFilterTag(savedTag);
        } else {
          setFilterTag(optionsFromRobot[0].value);
        }
      }

      if (options?.log !== false) {
        const prefix = options?.logPrefix ?? '[TAGS]';
        appendTerminalLog(
          `${prefix} ${optionsFromRobot.length} tags sincronizadas com sucesso.`,
          'success',
        );
      }
    },
    [appendTerminalLog],
  );

  const refreshExecutionTagsFromRobotSample = useCallback(
    async (options?: { log?: boolean }) => {
      try {
        const res = await fetch('/api/terminal/robot-tags');
        if (!res.ok) throw new Error(res.statusText);
        const data = (await res.json()) as {
          tags: RobotTestTagEntry[];
          projectFolders?: string[];
        };
        const folders = data.projectFolders ?? [];
        setProjectFolders(folders);
        if (folders.length > 0) {
          setSelectedProjectFolder((current) => {
            if (current && folders.includes(current)) return current;
            return folders[0];
          });
        }
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
    },
    [applyExecutionTagsFromRobot, appendTerminalLog],
  );

  const getSuiteTestTagForProject = useCallback(
    (projectFolder: string | null): string =>
      executionTags.find(
        (tag) => tag.isSuiteTestTag && (tag.sourceFolder ?? '') === (projectFolder ?? ''),
      )?.value ?? '',
    [executionTags],
  );

  const resolveTagAndFolderForFeatureExecution = useCallback(
    (tagOverride?: string) => {
      const overrideNormalized = tagOverride ? normalizeExecutionTagValue(tagOverride) : null;
      const tagMeta = overrideNormalized
        ? executionTags.find((opt) => opt.value === overrideNormalized)
        : null;

      if (tagOverride && tagMeta) {
        const folder = tagMeta.sourceFolder ?? selectedProjectFolder ?? '';

        return {
          resolvedTag: tagOverride,
          workingFolder: folder,
          command: buildFeatureRobotCommand(
            tagOverride,
            tagMeta.sourceFile,
            folder,
            argsFile,
          ),
        };
      }

      const activeProjectTag = getSuiteTestTagForProject(selectedProjectFolder);
      const activeProjectTagMeta = activeProjectTag
        ? executionTags.find((opt) => opt.value === activeProjectTag)
        : null;

      const fallbackTagMeta = filterTag
        ? executionTags.find((opt) => opt.value === filterTag)
        : null;

      const finalTagMeta = activeProjectTagMeta ?? fallbackTagMeta;
      const effectiveTag =
        activeProjectTag || filterTag || executionTags[0]?.value || 'login_tests';
      const effectiveFolder =
        finalTagMeta?.sourceFolder ?? selectedProjectFolder ?? '';

      return {
        resolvedTag: effectiveTag,
        workingFolder: effectiveFolder,
        command: buildFeatureRobotCommand(
          effectiveTag,
          finalTagMeta?.sourceFile,
          effectiveFolder,
          argsFile,
        ),
      };
    },
    [argsFile, executionTags, filterTag, getSuiteTestTagForProject, selectedProjectFolder],
  );

  const handleRunFeatureReal = useCallback(
    async (tagOverride?: string) => {
      if (isExecutingFeature) return;
      setIsExecutingFeature(true);

      setTerminalLogs([]);
      setRobotExecutionProgress(INITIAL_ROBOT_EXECUTION_PROGRESS);

      const runTimestampStr = formatRobotRunTimestamp();
      const runFolder = createRunFolderForTimestamp(runTimestampStr);

      const { resolvedTag, workingFolder, command: baseCommand } =
        resolveTagAndFolderForFeatureExecution(tagOverride);

      const command = withRobotOutputDirectory(baseCommand, robotResultsDirectory, runFolder);

      appendTerminalLog('==============================================================================', 'header');
      appendTerminalLog(`[EXEC] Iniciando suíte de testes Robot Framework (-i ${resolvedTag})...`, 'cmd');
      appendTerminalLog(`[CMD] ${command}`, 'cmd');
      appendTerminalLog('==============================================================================', 'header');

      const fullOutputRef = { current: '' };

      try {
        await runRobotCommandStreaming(
          command,
          runFolder,
          (line) => {
            fullOutputRef.current += `${line}\n`;
            appendTerminalLog(line);
          },
          undefined,
          workingFolder,
        );

        appendTerminalLog('==============================================================================', 'header');
        appendTerminalLog('[EXEC] Processo Robot concluído. Gravando relatórios e SQLite...', 'success');

        const result = await persistRobotRunOutput(
          runFolder,
          command,
          runTimestampStr,
        );

        if (result.ok) {
          const { execution, testCases, steps } = result.data;
          setSqliteDb((prev) => ({
            ...prev,
            executions: [execution, ...prev.executions],
            test_cases: [...testCases, ...prev.test_cases],
            steps: [...steps, ...prev.steps],
          }));

          setRobotExecutionProgress((current) => ({
            ...current,
            total: current.total || execution.total_tests || testCases.length,
            passed: current.passed || execution.passed,
            failed: current.failed || execution.failed,
            isFinal: true,
          }));

          appendTerminalLog(
            `[SQLITE] Execução ${execution.id} persistida: ${execution.passed} PASS, ${execution.failed} FAIL.`,
            'success',
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appendTerminalLog(`[ERROR] Falha na execução Robot: ${message}`, 'error');
      } finally {
        setIsExecutingFeature(false);
      }
    },
    [
      appendTerminalLog,
      isExecutingFeature,
      resolveTagAndFolderForFeatureExecution,
      robotResultsDirectory,
      setSqliteDb,
    ],
  );

  return {
    terminalLogs,
    setTerminalLogs,
    robotExecutionProgress,
    setRobotExecutionProgress,
    isExecutingFeature,
    setIsExecutingFeature,
    executionTags,
    setExecutionTags,
    projectFolders,
    setProjectFolders,
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
    resolveTagAndFolderForFeatureExecution,
    handleRunFeatureReal,
  };
}
