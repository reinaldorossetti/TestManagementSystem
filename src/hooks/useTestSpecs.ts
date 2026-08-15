/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  getInitialWorkspaceContent, 
  INITIAL_GHERKIN_CONTENT 
} from '../constants/initialSpecs';
import { 
  parseRobotGherkinFeature, 
  ParsedFeature 
} from '../utils/featureLoader';
import { 
  extractRobotExecutionTags, 
  extractSuiteExecutionTags,
  type ExecutionTagOption 
} from '../utils/robotTagLoader';

interface UseTestSpecsOptions {
  selectedProjectFolder: string | null;
  applyExecutionTagsFromRobot: (
    newTags: Array<{ tag: string; sourceFile?: string; sourceFolder?: string; isSuiteTestTag?: boolean }>,
    options?: { logPrefix?: string }
  ) => void;
  appendTerminalLog: (text: string, mode?: 'normal' | 'cmd' | 'success' | 'warn' | 'error' | 'header') => void;
}

export function useTestSpecs({
  selectedProjectFolder,
  applyExecutionTagsFromRobot,
  appendTerminalLog,
}: UseTestSpecsOptions) {
  const [gherkinContent, setGherkinContent] = useState<string>(getInitialWorkspaceContent);
  const [parsedFeature, setParsedFeature] = useState<ParsedFeature>(() => {
    const initialText = getInitialWorkspaceContent();
    return parseRobotGherkinFeature(initialText);
  });

  useEffect(() => {
    localStorage.setItem('cardmais_gherkin_content', gherkinContent);
    try {
      setParsedFeature(parseRobotGherkinFeature(gherkinContent));
    } catch (e) {
      console.error("Syntax error parsing Gherkin:", e);
    }
  }, [gherkinContent]);

  const [scenarioStatuses, setScenarioStatuses] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('cardmais_scenario_statuses');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    const parsed = parseRobotGherkinFeature(INITIAL_GHERKIN_CONTENT);
    const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
    parsed.scenarios.forEach(sc => {
      initialObj[sc.id] = 'Not executed';
    });
    return initialObj;
  });

  useEffect(() => {
    localStorage.setItem('cardmais_scenario_statuses', JSON.stringify(scenarioStatuses));
  }, [scenarioStatuses]);

  const [isEditingGherkin, setIsEditingGherkin] = useState<boolean>(false);
  const [gherkinTempText, setGherkinTempText] = useState<string>(INITIAL_GHERKIN_CONTENT);

  const importFileContent = (text: string, filename: string) => {
    try {
      setGherkinContent(text);
      setGherkinTempText(text);
      const parsed = parseRobotGherkinFeature(text);
      setParsedFeature(parsed);
      
      const initialObj: Record<string, 'Not executed' | 'PASS' | 'FAIL' | 'SKIP'> = {};
      parsed.scenarios.forEach(sc => {
        initialObj[sc.id] = 'Not executed';
      });
      setScenarioStatuses(initialObj);

      appendTerminalLog(`==============================================================================`, 'header');
      appendTerminalLog(`[IMPORT] Arquivo "${filename}" carregado com sucesso via upload!`, 'success');
      appendTerminalLog(`==============================================================================`, 'header');
      appendTerminalLog(`[PARSER] ${parsed.scenarios.length} cenários de teste identificados com sucesso.`, 'info');

      if (filename.toLowerCase().endsWith('.robot')) {
        const suiteExecutionTags = new Set(extractSuiteExecutionTags(text));
        const robotTags = extractRobotExecutionTags(text).map((tag) => ({
          tag,
          sourceFile: filename,
          sourceFolder: selectedProjectFolder ?? '',
          isSuiteTestTag: suiteExecutionTags.has(tag),
        }));
        applyExecutionTagsFromRobot(robotTags, { logPrefix: '[TAGS]' });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      appendTerminalLog(`[ERROR] Erro ao carregar arquivo importado: ${message}`, 'error');
      alert("Erro ao decodificar o arquivo. Certifique-se de que é um formato válido BDD ou Gherkin.");
    }
  };

  const decodeFeatureFile = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return new TextDecoder('windows-1252').decode(bytes);
    }
  };

  const readFeatureFile = (file: File, onRead: (text: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        onRead(decodeFeatureFile(event.target.result));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return {
    gherkinContent,
    setGherkinContent,
    parsedFeature,
    setParsedFeature,
    scenarioStatuses,
    setScenarioStatuses,
    isEditingGherkin,
    setIsEditingGherkin,
    gherkinTempText,
    setGherkinTempText,
    importFileContent,
    readFeatureFile,
  };
}
