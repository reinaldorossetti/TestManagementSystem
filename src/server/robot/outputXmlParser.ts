import { XMLParser } from 'fast-xml-parser';
import type { DbExecution, DbTestCase, DbStepLog } from '@/src/utils/sqliteEngine';

/**
 * Parser do `output.xml` do Robot Framework para o modelo relacional do TMS
 * (executions / test_cases / steps). Suporta os formatos de status do RF 6
 * (starttime/endtime) e RF 7 (elapsed em segundos).
 */

export interface ParsedRun {
  execution: DbExecution;
  testCases: DbTestCase[];
  steps: DbStepLog[];
}

export interface ParseOptions {
  runId: string;
  command: string;
  resultsPath: string;
  /** Timestamp "YYYY-MM-DD HH:MM:SS" de fallback caso o XML não traga `generated`. */
  fallbackTimestamp: string;
}

type RunStatus = 'PASS' | 'FAIL' | 'SKIP';
type StepType = 'GIVEN' | 'WHEN' | 'THEN' | 'AND';

interface XmlNode {
  [key: string]: unknown;
}

const ARRAY_TAGS = new Set(['suite', 'test', 'kw', 'tag', 'arg', 'msg']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ARRAY_TAGS.has(name),
});

const GHERKIN_KEYWORD = /^(Dado que|Dada que|Dado|Dada|Given|Quando|When|Então|Entao|Then|E|And|Mas|But)\b\s*/i;

const mapStepType = (keyword: string): StepType => {
  const k = keyword.trim().toLowerCase();
  if (k.startsWith('dado') || k.startsWith('dada') || k.startsWith('given')) return 'GIVEN';
  if (k.startsWith('quando') || k.startsWith('when')) return 'WHEN';
  if (k.startsWith('então') || k.startsWith('entao') || k.startsWith('then')) return 'THEN';
  return 'AND';
};

const normalizeStatus = (raw: string | undefined): RunStatus => {
  const s = (raw || '').toUpperCase();
  if (s === 'PASS') return 'PASS';
  if (s === 'FAIL') return 'FAIL';
  return 'SKIP'; // SKIP, NOT RUN, NOT SET, etc.
};

/** Converte "YYYYMMDD HH:MM:SS.mmm" para epoch em milissegundos. */
const robotTimeToMs = (value: string | undefined): number | null => {
  if (!value) return null;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac] = m;
  const ms = frac ? Number(`0.${frac}`) * 1000 : 0;
  return new Date(
    Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), ms,
  ).getTime();
};

/** Duração em segundos a partir do nó <status> (RF7 `elapsed` ou RF6 start/end). */
const durationFromStatus = (status: XmlNode | undefined): number => {
  if (!status) return 0;
  const elapsed = status['@_elapsed'];
  if (elapsed !== undefined && elapsed !== null && `${elapsed}` !== '') {
    const n = Number(elapsed);
    if (!Number.isNaN(n)) return n; // RF7: segundos
  }
  const start = robotTimeToMs(status['@_starttime'] as string | undefined);
  const end = robotTimeToMs(status['@_endtime'] as string | undefined);
  if (start !== null && end !== null) return Math.max(0, (end - start) / 1000);
  return 0;
};

/** Normaliza o `generated` do robot para "YYYY-MM-DD HH:MM:SS" (RF7 ISO ou RF6). */
const robotGeneratedToTimestamp = (value: string | undefined): string | null => {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/); // RF7: 2026-06-25T16:47:41
  if (iso) {
    const [, y, mo, d, h, mi, s] = iso;
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }
  const legacy = value.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/); // RF6: 20260617 10:57:58
  if (legacy) {
    const [, y, mo, d, h, mi, s] = legacy;
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }
  return null;
};

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

const getKwName = (kw: XmlNode): string => {
  const name = kw['@_name'];
  return typeof name === 'string' ? name : '';
};

const getMsgText = (msg: unknown): string => {
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object') {
    const node = msg as XmlNode;
    const text = node['#text'];
    return typeof text === 'string' ? text : '';
  }
  return '';
};

/** Extrai o caminho relativo do screenshot gerado pelo Browser Library (Playwright). */
const SCREENSHOT_PATH_RE = /browser\/screenshot\/[^"'<>\s]+\.(?:png|jpe?g)/i;

const extractScreenshotPath = (kw: XmlNode): string | null => {
  for (const msg of asArray<unknown>(kw.msg as unknown[])) {
    const match = getMsgText(msg).match(SCREENSHOT_PATH_RE);
    if (match) return match[0];
  }
  for (const child of asArray<XmlNode>(kw.kw as XmlNode[])) {
    const nested = extractScreenshotPath(child);
    if (nested) return nested;
  }
  return null;
};

const isExecutableStep = (kw: XmlNode): boolean => {
  const type = `${kw['@_type'] || ''}`.toUpperCase();
  return type !== 'SETUP' && type !== 'TEARDOWN';
};

interface CollectedTest {
  test: XmlNode;
  category: string;
}

/** Percorre recursivamente as suítes coletando todos os <test> e a categoria (suíte pai). */
const collectTests = (suite: XmlNode, tests: CollectedTest[]): void => {
  const suiteName = (suite['@_name'] as string) || 'Suite';
  for (const test of asArray<XmlNode>(suite.test as XmlNode[])) {
    tests.push({ test, category: suiteName });
  }
  for (const child of asArray<XmlNode>(suite.suite as XmlNode[])) {
    collectTests(child, tests);
  }
};

export function parseRobotOutputXml(xml: string, options: ParseOptions): ParsedRun {
  const root = parser.parse(xml) as XmlNode;
  const robot = root.robot as XmlNode | undefined;
  if (!robot) {
    throw new Error("output.xml inválido: elemento <robot> ausente.");
  }

  const collected: CollectedTest[] = [];
  for (const suite of asArray<XmlNode>(robot.suite as XmlNode[])) {
    collectTests(suite, collected);
  }

  const testCases: DbTestCase[] = [];
  const steps: DbStepLog[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;

  collected.forEach(({ test, category }, tIndex) => {
    const caseId = `${options.runId}-T${tIndex + 1}`;
    const testStatusNode = test.status as XmlNode | undefined;
    const status = normalizeStatus(testStatusNode?.['@_status'] as string | undefined);
    const duration = durationFromStatus(testStatusNode);
    totalDuration += duration;

    if (status === 'PASS') passed += 1;
    else if (status === 'FAIL') failed += 1;
    else skipped += 1;

    testCases.push({
      id: caseId,
      execution_id: options.runId,
      name: (test['@_name'] as string) || `Test ${tIndex + 1}`,
      category,
      status,
      duration_s: Number(duration.toFixed(3)),
      robot_test_id: (test['@_id'] as string) || undefined,
    });

    const stepKws = asArray<XmlNode>(test.kw as XmlNode[]).filter(isExecutableStep);
    stepKws.forEach((kw, sIndex) => {
      const rawName = getKwName(kw);
      const match = rawName.match(GHERKIN_KEYWORD);
      const stepType = match ? mapStepType(match[1]) : 'AND';
      const text = match ? rawName.slice(match[0].length).trim() : rawName.trim();
      const kwStatus = normalizeStatus((kw.status as XmlNode | undefined)?.['@_status'] as string | undefined);
      const screenshotPath = extractScreenshotPath(kw) ?? undefined;
      steps.push({
        id: `${caseId}-S${sIndex + 1}`,
        test_case_id: caseId,
        step_type: stepType,
        text: text || rawName,
        status: kwStatus,
        ...(screenshotPath ? { screenshot_path: screenshotPath } : {}),
      });
    });
  });

  const rootSuiteStatus = asArray<XmlNode>(robot.suite as XmlNode[])[0]?.status as XmlNode | undefined;
  const suiteDuration = durationFromStatus(rootSuiteStatus);
  const duration_s = Number((suiteDuration || totalDuration).toFixed(2));

  const timestamp =
    robotGeneratedToTimestamp(robot['@_generated'] as string | undefined) || options.fallbackTimestamp;

  const execution: DbExecution = {
    id: options.runId,
    timestamp,
    command: options.command,
    duration_s,
    total_tests: testCases.length,
    passed,
    failed,
    status: failed > 0 ? 'FAIL' : 'PASS',
    results_path: options.resultsPath,
    results_folder: options.runId,
  };

  // `skipped` é derivável (total - passed - failed) e o schema aceita opcional;
  // mantido implícito para preservar a forma existente das tabelas.
  void skipped;

  return { execution, testCases, steps };
}
