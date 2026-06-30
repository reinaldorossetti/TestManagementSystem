import {
  listExecutions,
  listTestCases,
  listSteps,
} from '@/src/server/repositories/executionRepository';
import { extractResultsFolderFromPath } from '@/src/utils/robotResultsFolder';
import type { DbTestCase, DbTestCaseEvidenceItem, DbTestCaseSphere } from '@/src/utils/sqliteEngine';

function buildMatchers(sphereId: string): string[] {
  const matchers = new Set<string>([sphereId.toUpperCase()]);

  const ctFromId = sphereId.match(/CT0*(\d+)/i);
  if (ctFromId) {
    const n = ctFromId[1];
    matchers.add(`CT${n}`);
    matchers.add(`CT${n.padStart(2, '0')}`);
  }

  const tcFromId = sphereId.match(/TC-?0*(\d+)/i);
  if (tcFromId) {
    const n = tcFromId[1];
    matchers.add(`CT${n}`);
    matchers.add(`CT${n.padStart(2, '0')}`);
    matchers.add(`TC-${n.padStart(3, '0')}`);
  }

  const recel = sphereId.match(/^RECEL(\d+)/i);
  if (recel) {
    matchers.add(`RECEL${recel[1]}`);
    matchers.add(`RCT${recel[1]}`);
  }

  return [...matchers];
}

function matchesSphereCase(
  testCase: DbTestCase,
  matchers: string[],
  sphereTitle: string,
): boolean {
  const name = testCase.name.toUpperCase();
  const category = testCase.category.toUpperCase();
  const robotId = testCase.robot_test_id?.toUpperCase() ?? '';

  if (matchers.some((token) => name.includes(token) || category.includes(token))) {
    return true;
  }
  if (robotId && matchers.some((token) => robotId.includes(token))) {
    return true;
  }

  const cleanTitle = sphereTitle
    .replace(/^[^-]+-\s*(Cenário de Teste Positivo - |Cenário de Teste Alternativo - )?/i, '')
    .trim()
    .toLowerCase();
  if (cleanTitle.length >= 8 && name.toLowerCase().includes(cleanTitle.slice(0, 48))) {
    return true;
  }

  return false;
}

function screenshotPreviewUrl(resultsFolder: string, relPath: string): string {
  return `/api/terminal/screenshot?folder=${encodeURIComponent(resultsFolder)}&path=${encodeURIComponent(relPath)}`;
}

export async function resolveAutomatedEvidence(
  sphereCase: DbTestCaseSphere,
): Promise<DbTestCaseEvidenceItem[]> {
  const [executions, testCases, steps] = await Promise.all([
    listExecutions(),
    listTestCases(),
    listSteps(),
  ]);

  const matchers = buildMatchers(sphereCase.id);

  // Executions are newest-first — history only includes the latest matching run.
  for (const execution of executions) {
    const resultsFolder =
      execution.results_folder?.trim() ||
      extractResultsFolderFromPath(execution.results_path) ||
      null;
    if (!resultsFolder) continue;

    const execTests = testCases.filter((tc) => tc.execution_id === execution.id);
    const matched = execTests.filter((tc) =>
      matchesSphereCase(tc, matchers, sphereCase.title),
    );
    if (matched.length === 0) continue;

    const items: DbTestCaseEvidenceItem[] = [];

    for (const testCase of matched) {
      if (testCase.report_screenshot_path) {
        items.push({
          id: `auto-report-${execution.id}-${testCase.id}`,
          test_case_id: sphereCase.id,
          source: 'automated',
          evidence_type: 'image',
          title: testCase.name,
          created_at: execution.timestamp,
          created_by: 'Robot Framework',
          preview_url: screenshotPreviewUrl(resultsFolder, testCase.report_screenshot_path),
          label: 'Relatório do cenário (log.html)',
          execution_id: execution.id,
          results_folder: resultsFolder,
          screenshot_path: testCase.report_screenshot_path,
        });
      }

      const caseSteps = steps.filter((step) => step.test_case_id === testCase.id);
      for (const step of caseSteps) {
        if (!step.screenshot_path) continue;
        items.push({
          id: `auto-step-${step.id}`,
          test_case_id: sphereCase.id,
          source: 'automated',
          evidence_type: 'image',
          title: step.text,
          created_at: execution.timestamp,
          created_by: 'Robot Framework',
          preview_url: screenshotPreviewUrl(resultsFolder, step.screenshot_path),
          label: `Passo ${step.step_type}`,
          execution_id: execution.id,
          results_folder: resultsFolder,
          screenshot_path: step.screenshot_path,
        });
      }
    }

    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return [];
}
