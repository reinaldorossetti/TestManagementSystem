export type ExecutionTagOption = {
  value: string;
  label: string;
  sourceFile?: string;
  /** Pasta do projeto em `test_projects/` de onde a tag foi extraída (`''` = raiz). */
  sourceFolder?: string;
  /** Indica que a tag foi declarada na diretiva `Test Tags` da suíte Robot. */
  isSuiteTestTag?: boolean;
};

export type RobotTestTagEntry = {
  tag: string;
  sourceFile?: string;
  /** Pasta do projeto em `test_projects/` de onde o arquivo `.robot` foi lido (`''` = raiz). */
  sourceFolder?: string;
  /** Indica que a tag foi declarada na diretiva `Test Tags` da suíte Robot. */
  isSuiteTestTag?: boolean;
};

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
export function extractSuiteTestTags(content: string): string[] {
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
 * `Force Tags` na seção *** Settings ***. Esses valores identificam a pasta
 * funcional usada pelo TMS ao armazenar os casos importados.
 */
export function extractForceTags(content: string): string[] {
  const tags: string[] = [];
  const lines = content.split('\n');
  let inSettings = false;
  let readingForceTags = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\*\*\*\s*Settings\s*\*\*\*/i.test(trimmed)) {
      inSettings = true;
      readingForceTags = false;
      continue;
    }
    if (/^\*\*\*/.test(trimmed)) {
      inSettings = false;
      readingForceTags = false;
      continue;
    }
    if (!inSettings) continue;

    const forceTagsMatch = trimmed.match(/^Force Tags\s+(.+)$/i);
    if (forceTagsMatch) {
      readingForceTags = true;
      pushTagsFromSeparatedList(tags, forceTagsMatch[1]);
      continue;
    }

    if (readingForceTags && trimmed.startsWith('...')) {
      pushTagsFromSeparatedList(tags, trimmed.replace(/^\.\.\.\s*/, ''));
      continue;
    }

    if (readingForceTags && trimmed && !trimmed.startsWith('...')) {
      readingForceTags = false;
    }
  }

  return tags;
}

/**
 * Tags que representam a suíte para execução de feature. Ambas as diretivas
 * Robot são aceitas: `Test Tags` e `Force Tags`. A ordem preserva primeiro
 * `Test Tags` e depois `Force Tags`, removendo duplicidades.
 */
export function extractSuiteExecutionTags(content: string): string[] {
  const tags: string[] = [];
  for (const tag of [...extractSuiteTestTags(content), ...extractForceTags(content)]) {
    pushUniqueTag(tags, tag);
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
 * Tags Robot para execução: tags de suíte (`Test Tags` e `Force Tags`) +
 * `[Tags]` (cenários), na ordem de prioridade da suíte.
 */
export function extractRobotExecutionTags(content: string): string[] {
  const tags: string[] = [];
  for (const tag of extractSuiteExecutionTags(content)) {
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

  for (const { tag, sourceFile, sourceFolder, isSuiteTestTag } of entries) {
    const value = normalizeExecutionTagValue(tag);
    const seenKey = JSON.stringify([sourceFolder ?? '', value]);
    if (!value || seen.has(seenKey)) continue;
    seen.add(seenKey);
    const label = sourceFile ? `@${value} (${sourceFile})` : `@${value}`;
    options.push({ value, label, sourceFile, sourceFolder, isSuiteTestTag });
  }

  return options;
}

/** Ex.: `login_tests` → `Login Tests`; `Login_Feature` → `Login Feature`. */
export function formatTestTagAsFolderLabel(tag: string): string {
  return normalizeExecutionTagValue(tag)
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Nome de pasta TMS derivado do primeiro `Force Tags` do arquivo .robot.
 * O valor é convertido para um nome amigável (`adicionar_tests` →
 * `Adicionar Tests`). `Test Tags` é usado como fallback quando não houver
 * `Force Tags`; por fim, usa-se o fallback recebido (ex.: import .feature).
 */
export function resolveRobotFolderLabel(content: string, fallback = 'Workspace Importados'): string {
  const forceTags = extractForceTags(content);
  if (forceTags.length > 0) {
    return formatTestTagAsFolderLabel(forceTags[0]);
  }

  const suiteTags = extractSuiteTestTags(content);
  if (suiteTags.length > 0) {
    return formatTestTagAsFolderLabel(suiteTags[0]);
  }
  return fallback;
}

/** Projeto derivado de uma pasta dentro de `test_projects/`. */
export type RobotProjectOption = {
  /** Caminho da pasta do projeto relativo a `test_projects/` (`''` = raiz). */
  folder: string;
  /** Nome de exibição do projeto (ex.: `Login Tests`). */
  name: string;
  /** Rótulo completo do dropdown (ex.: `Login Tests (test_projects/login_tests/)`). */
  label: string;
};

/**
 * Agrupa as `ExecutionTagOption` pela pasta de origem, projetando a lista de
 * "projetos" existentes em `test_projects/` (um projeto por pasta, não por
 * arquivo `.robot` individual — vários arquivos na mesma pasta pertencem ao
 * mesmo projeto).
 */
export function buildProjectOptionsFromExecutionTags(
  tags: ExecutionTagOption[],
): RobotProjectOption[] {
  const projects: RobotProjectOption[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const folder = tag.sourceFolder ?? '';
    if (seen.has(folder)) continue;
    seen.add(folder);
    const baseName = folder !== '' ? folder : (tag.sourceFile?.replace(/\.robot$/i, '') ?? '');
    const name = formatTestTagAsFolderLabel(baseName) || baseName || 'Test Projects';
    const path = folder ? `test_projects/${folder}/` : 'test_projects/';
    projects.push({ folder, name, label: `${name} (${path})` });
  }

  return projects;
}
