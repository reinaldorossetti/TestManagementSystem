export type ExecutionTagOption = {
  value: string;
  label: string;
  sourceFile?: string;
};

export type RobotTestTagEntry = { tag: string; sourceFile?: string };

/** Normaliza chave do dropdown / `-i` (sem @, sem espaços). */
export function normalizeExecutionTagValue(tag: string): string {
  return tag.replace(/^@/, '').replace(/\s+/g, '_').trim();
}

const pushUniqueTag = (tags: string[], raw: string) => {
  const clean = normalizeExecutionTagValue(raw);
  if (clean && !tags.includes(clean)) {
    tags.push(clean);
  }
};

const pushTagsFromSeparatedList = (tags: string[], raw: string) => {
  const byColumns = raw
    .split(/\s{2,}|\t+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byColumns.length > 1) {
    byColumns.forEach((t) => pushUniqueTag(tags, t));
    return;
  }
  raw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((t) => pushUniqueTag(tags, t));
};

/**
 * `Test Tags` na seção *** Settings *** (ex.: `Test Tags    login_tests`).
 */
function extractSuiteTestTags(content: string): string[] {
  const tags: string[] = [];
  const lines = content.split('\n');
  let inSettings = false;
  let readingTestTags = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\*\*\*\s*Settings\s*\*\*\*/i.test(trimmed)) {
      inSettings = true;
      readingTestTags = false;
      continue;
    }
    if (/^\*\*\*/.test(trimmed)) {
      inSettings = false;
      readingTestTags = false;
      continue;
    }
    if (!inSettings) continue;

    const testTagsMatch = trimmed.match(/^Test Tags\s+(.+)$/i);
    if (testTagsMatch) {
      readingTestTags = true;
      pushTagsFromSeparatedList(tags, testTagsMatch[1]);
      continue;
    }

    if (readingTestTags && trimmed.startsWith('...')) {
      pushTagsFromSeparatedList(tags, trimmed.replace(/^\.\.\.\s*/, ''));
      continue;
    }

    if (readingTestTags && trimmed && !trimmed.startsWith('...')) {
      readingTestTags = false;
    }
  }

  return tags;
}

/**
 * `[Tags]` em casos de teste (ex.: `[Tags]    LT06`).
 */
function extractTestCaseTags(content: string): string[] {
  const tags: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const match = trimmed.match(/^\[Tags\]\s+(.+)$/i);
    if (match) {
      pushTagsFromSeparatedList(tags, match[1]);
    }
  }
  return tags;
}

/**
 * Tags Robot para execução: `Test Tags` (suíte) + `[Tags]` (cenários), na ordem do arquivo.
 */
export function extractRobotExecutionTags(content: string): string[] {
  const tags: string[] = [];
  for (const tag of extractSuiteTestTags(content)) {
    pushUniqueTag(tags, tag);
  }
  for (const tag of extractTestCaseTags(content)) {
    pushUniqueTag(tags, tag);
  }
  return tags;
}

/** @deprecated Use {@link extractRobotExecutionTags}. */
export function extractRobotTestTags(content: string): string[] {
  return extractRobotExecutionTags(content);
}

export function buildExecutionTagsFromRobotTestTags(
  entries: RobotTestTagEntry[],
): ExecutionTagOption[] {
  const options: ExecutionTagOption[] = [];
  const seen = new Set<string>();

  for (const { tag, sourceFile } of entries) {
    const value = normalizeExecutionTagValue(tag);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = sourceFile ? `@${value} (${sourceFile})` : `@${value}`;
    options.push({ value, label, sourceFile });
  }

  return options;
}
