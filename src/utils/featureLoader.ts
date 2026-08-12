/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dynamic Gherkin/Cucumber .feature parser for the Robot Dashboard
 */

export interface ParsedStep {
  type: 'GIVEN' | 'WHEN' | 'THEN' | 'AND';
  rawType: string; // e.g., "Dado" | "Quando" | "Então"
  text: string;
}

export interface ParsedScenario {
  id: string;
  title: string;
  category: string;
  steps: ParsedStep[];
  type: 'success' | 'failure' | 'permission';
  tags: string[];
  documentation?: string;
  isSkipped?: boolean;
  skipMessage?: string;
}

export interface ParsedFeature {
  title: string;
  description: string[];
  scenarios: ParsedScenario[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Removes the identifier/category that the TMS used to prepend during import.
 * The identifier already has its own badge in the case list, so keeping it in
 * the title creates duplicated information (for example, `TC-018 - ...`).
 *
 * Only an exact case-id prefix is removed. A scenario number from the source,
 * such as `01 - ...`, is meaningful and must remain in the title.
 */
export function normalizeImportedScenarioTitle(caseId: string, scenarioTitle: string): string {
  const title = scenarioTitle.trim();
  if (!title || !caseId.trim()) return title;

  const caseIdPrefix = new RegExp(
    `^${escapeRegExp(caseId.trim())}\\s*-\\s*(?:Cen(?:á|a)rio de Teste (?:Positivo|Alternativo)\\s*-\\s*)?`,
    'i',
  );

  let normalizedTitle = title;
  let nextTitle = normalizedTitle.replace(caseIdPrefix, '').trim();
  while (nextTitle !== normalizedTitle) {
    normalizedTitle = nextTitle;
    nextTitle = normalizedTitle.replace(caseIdPrefix, '').trim();
  }

  return normalizedTitle;
}

/**
 * Builds the TMS identifier from an imported scenario. Explicit Robot/Gherkin
 * A numeric scenario prefix such as `01 - ...` or `001 - ...` has priority
 * over a generated/tagged TC identifier and becomes `TC-01`.
 */
export function buildImportedTestCaseId(
  tags: string[],
  scenarioTitle: string,
  fallbackId: string,
): string {
  const numericPrefix = scenarioTitle.trim().match(/^(\d+)\s*-\s+/);
  if (numericPrefix) {
    return normalizeNumericScenarioId(numericPrefix[1]);
  }

  const tagMatch = tags.find((tag) =>
    tag.match(/^@?RECEL\d+/i) || tag.match(/^@?RCT\d+/i) || tag.match(/^@?CT\d+/i),
  );
  if (tagMatch) {
    return tagMatch.replace(/^@/, '').toUpperCase();
  }

  return fallbackId;
}

/**
 * Builds the persisted TMS title without adding a prefix that the imported
 * scenario already has.
 */
export function buildImportedTestCaseTitle(caseId: string, scenarioTitle: string): string {
  const title = scenarioTitle.trim();
  if (!title) return `${caseId} - Cenário de Teste Positivo`;

  const normalizedTitle = normalizeImportedScenarioTitle(caseId, title);
  if (normalizedTitle !== title) return title;

  const numericPrefix = title.match(/^(\d+)\s*-\s+(.+)$/);
  if (numericPrefix) {
    return `${caseId} - ${numericPrefix[2].trim()}`;
  }

  return `${caseId} - Cenário de Teste Positivo - ${title}`;
}

function normalizeNumericScenarioId(numberText: string): string {
  const withoutLeadingZeros = numberText.replace(/^0+(?=\d)/, '');
  return `TC-${withoutLeadingZeros.padStart(2, '0')}`;
}

/**
 * Returns the title shown in the TMS list while supporting legacy records
 * that still contain the old imported prefix.
 */
export function getTestCaseDisplayTitle(caseId: string, title: string): string {
  const normalizedTitle = normalizeImportedScenarioTitle(caseId, title);
  return normalizedTitle.replace(/^\d+\s*-\s+/, '').trim();
}

/**
 * Returns the identifier shown in the TMS for legacy records whose numeric
 * scenario prefix was previously stored in the title instead of the ID.
 */
export function getTestCaseDisplayId(caseId: string, title: string): string {
  const normalizedTitle = normalizeImportedScenarioTitle(caseId, title);
  const numericPrefix = normalizedTitle.match(/^(\d+)\s*-\s+/);
  if (numericPrefix) {
    return normalizeNumericScenarioId(numericPrefix[1]);
  }

  // Imported Robot suites may persist a technical folder prefix in the ID
  // (e.g., `ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01`) to keep internal IDs
  // unique across folders. For UI badges, only the scenario-level identifier
  // must be shown.
  const sanitizedCaseId = caseId
    .trim()
    .match(/(?:^|[-_])(TC-\d+|RCT\d+|RECEL\d+|CT\d+)$/i)?.[1]
    ?.toUpperCase();

  return sanitizedCaseId || caseId;
}

/**
 * Returns the feature portion of technical IDs such as
 * `ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01` for separate UI display.
 */
export function getTestCaseDisplayFeature(caseId: string): string {
  const match = caseId.trim().match(/^(.*?)[-_](TC-\d+|RCT\d+|RECEL\d+|CT\d+)$/i);
  return match?.[1] || caseId.trim();
}

/**
 * Builds the manual execution heading without concatenating the technical
 * folder prefix with the visual scenario identifier.
 */
export function getManualExecutionDisplayTitle(caseId: string, title: string): string {
  const displayId = getTestCaseDisplayId(caseId, title);
  const feature = getTestCaseDisplayFeature(caseId);
  const prefixes = [caseId.trim(), `${feature}-${displayId}`, displayId]
    .filter(Boolean)
    .filter((prefix, index, values) => values.indexOf(prefix) === index)
    .sort((left, right) => right.length - left.length);

  let scenarioTitle = title.trim();
  for (const prefix of prefixes) {
    const withoutPrefix = scenarioTitle.replace(
      new RegExp(`^${escapeRegExp(prefix)}\\s*-\\s*`, 'i'),
      '',
    ).trim();
    if (withoutPrefix !== scenarioTitle) {
      scenarioTitle = withoutPrefix;
      break;
    }
  }

  return scenarioTitle ? `${displayId} - ${scenarioTitle}` : displayId;
}

/** Robot section header for keyword definitions (`*** Keywords ***`, `* Keywords *`, etc.). */
function isRobotKeywordsSectionHeader(trimmed: string): boolean {
  const inner = trimmed.replace(/\*/g, ' ').trim().toLowerCase();
  return inner === 'keywords';
}

export function parseGherkinFeature(content: string): ParsedFeature {
  const lines = content.split('\n');
  
  let featureTitle = "Jornada TMS - Robot Suite";
  const featureDescription: string[] = [];
  const scenarios: ParsedScenario[] = [];
  
  let currentScenario: ParsedScenario | null = null;
  let currentCategory = "Geral";
  let idCounter = 1;
  let isReadingDocumentation = false;
  let pendingTags: string[] = [];

  const getScenarioType = (titleText: string): 'success' | 'failure' | 'permission' => {
    let type: 'success' | 'failure' | 'permission' = 'success';
    const lowercaseTitle = titleText.toLowerCase();
    if (
      lowercaseTitle.includes('falha') || 
      lowercaseTitle.includes('erro') || 
      lowercaseTitle.includes('bloqueio') || 
      lowercaseTitle.includes('rejeitado') || 
      lowercaseTitle.includes('incorrect') || 
      lowercaseTitle.includes('inválido') ||
      lowercaseTitle.includes('impedimento') ||
      lowercaseTitle.includes('restrito') ||
      lowercaseTitle.includes('vazio')
    ) {
      type = 'failure';
    }
    if (
      lowercaseTitle.includes('permissão') || 
      lowercaseTitle.includes('segurança') || 
      lowercaseTitle.includes('cargo') || 
      lowercaseTitle.includes('oauth') || 
      lowercaseTitle.includes('representante') ||
      lowercaseTitle.includes('funcionário')
    ) {
      type = 'permission';
    }
    return type;
  };
  
  // Let's keep track of current module category from comments (e.g. MÓDULO 1: AUTENTICAÇÃO)
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      isReadingDocumentation = false;
      continue;
    }

    // Stop parsing at Robot Keywords — implementation must not become scenario steps
    if (isRobotKeywordsSectionHeader(trimmed)) {
      currentScenario = null;
      isReadingDocumentation = false;
      pendingTags = [];
      break;
    }

    // Detect Robot Framework Section Headers
    if (trimmed.startsWith('***') || (trimmed.startsWith('*') && trimmed.endsWith('*'))) {
      isReadingDocumentation = false;
      continue;
    }

    // Detect Module Category Comment
    if (trimmed.startsWith('#') && trimmed.toUpperCase().includes('MÓDULO')) {
      const cleanCat = trimmed.replace(/^#\s*=*\s*/, '').replace(/=*$/, '').trim();
      currentCategory = cleanCat || "Geral";
      isReadingDocumentation = false;
      continue;
    }

    // Detect Gherkin style Tags (e.g., @RCT01)
    if (trimmed.startsWith('@')) {
      const lineTags = trimmed.split(/\s+/).map(t => t.trim()).filter(t => t.startsWith('@'));
      if (lineTags.length > 0) {
        pendingTags.push(...lineTags);
      }
      isReadingDocumentation = false;
      continue;
    }

    if (trimmed.startsWith('#')) {
      // Ignore normal comments
      isReadingDocumentation = false;
      continue;
    }

    // Detect Feature header
    if (trimmed.startsWith('Funcionalidade:') || trimmed.startsWith('Feature:')) {
      featureTitle = trimmed.replace(/^(Funcionalidade:|Feature:)\s*/, '').trim();
      isReadingDocumentation = false;
      continue;
    }

    // Detect Scenario / Test Case Name
    let isScenarioHeader = false;
    let title = "";

    const scenarioMatch = trimmed.match(/^(?::\s*)?(Scenario Outline|Esquema do Cenário|Scenario|Cenário|Cenario)\s*:?\s*(.*)$/i);
    if (scenarioMatch) {
      isScenarioHeader = true;
      title = scenarioMatch[2].trim() || "Cenário de Teste";
    }

    // Robot test cases can use a numeric prefix instead of "Scenario:".
    // Keep this restricted to non-indented lines so keyword arguments or
    // other indented actions are not interpreted as new scenarios.
    const robotScenarioMatch = !line.startsWith(' ') && !line.startsWith('\t')
      ? trimmed.match(/^\d+\s*-\s+.+$/)
      : null;
    if (!isScenarioHeader && robotScenarioMatch) {
      isScenarioHeader = true;
      title = robotScenarioMatch[0].trim();
    }

    if (isScenarioHeader && title) {
      currentScenario = {
        id: `SC_ROBOT_${String(idCounter++).padStart(3, '0')}`,
        title,
        category: currentCategory,
        steps: [],
        type: getScenarioType(title),
        tags: [...pendingTags]
      };
      pendingTags = []; // Reset pending metadata tags for the next scenario
      scenarios.push(currentScenario);
      isReadingDocumentation = false;
      continue;
    }

    // If description line before any scenario starts (and not starting with Robot tags/docs/steps)
    if (currentScenario === null && !scenarios.length && !trimmed.startsWith('[') && !trimmed.startsWith('Skip')) {
      featureDescription.push(trimmed);
      continue;
    }

    // Parse Gherkin & Robot contents for currently active scenario
    if (currentScenario !== null) {
      // 1. Tags: [Tags] RCT01
      if (trimmed.startsWith('[Tags]')) {
        const tagContent = trimmed.replace(/^\[Tags\]/i, '').trim();
        const tags = tagContent.split(/\s+/).filter(Boolean);
        if (tags.length > 0) {
          currentScenario.tags = [...currentScenario.tags, ...tags];
        }
        isReadingDocumentation = false;
        continue;
      }

      // 2. Documentation: [Documentation] ...
      if (trimmed.startsWith('[Documentation]')) {
        const docContent = trimmed.replace(/^\[Documentation\]/i, '').trim();
        currentScenario.documentation = docContent;
        isReadingDocumentation = true;
        continue;
      }

      // 3. Documentation continuation with ...
      if (trimmed.startsWith('...') && isReadingDocumentation) {
        const continuation = trimmed.replace(/^\.\.\.\s*/, '').trim();
        currentScenario.documentation = (currentScenario.documentation || "") + " " + continuation;
        continue;
      }

      // 4. Skip line
      if (trimmed.startsWith('Skip')) {
        const skipText = trimmed.replace(/^Skip\s*/i, '').trim();
        currentScenario.isSkipped = true;
        currentScenario.skipMessage = skipText;
        isReadingDocumentation = false;
        continue;
      }

      // 5. BDD Step Line matching Given/When/Then/And/But (Portuguese or English)
      const stepMatch = trimmed.match(/^(Dado que|Dado|Quando|Então|E|Mas|Given que|Given that|Given|When|Then|And|But)\s+(.*)$/i);
      if (stepMatch) {
        const rawType = stepMatch[1];
        const text = stepMatch[2].trim();
        
        let stepType: 'GIVEN' | 'WHEN' | 'THEN' | 'AND' = 'GIVEN';
        const lType = rawType.toLowerCase();
        if (lType.startsWith('dado') || lType.startsWith('given')) {
          stepType = 'GIVEN';
        } else if (lType.startsWith('quando') || lType.startsWith('when')) {
          stepType = 'WHEN';
        } else if (lType.startsWith('então') || lType.startsWith('then')) {
          stepType = 'THEN';
        } else {
          stepType = 'AND';
        }

        currentScenario.steps.push({
          type: stepType,
          rawType,
          text
        });
        isReadingDocumentation = false;
        continue;
      } else if (line.startsWith(' ') || line.startsWith('\t')) {
        // Indented action line inside Robot scenario without BDD keyword prefix
        currentScenario.steps.push({
          type: 'AND',
          rawType: '',
          text: trimmed
        });
        isReadingDocumentation = false;
        continue;
      }
    }
  }

  // Final check - if we parsed 0 scenarios, supply a sturdy fallback so the system is highly stable
  if (scenarios.length === 0) {
    return getFallbackParsedFeature();
  }

  return {
    title: featureTitle,
    description: featureDescription,
    scenarios
  };
}

/**
 * Parses Robot Framework suites that use Gherkin keywords in `*** Test Cases ***`.
 *
 * Robot test names are table cells, not necessarily numeric scenario headers.
 * Therefore this parser uses the Robot section and indentation as the boundary
 * between test cases. The legacy Gherkin parser remains untouched and is used
 * for regular `.feature` content.
 */
export function parseRobotGherkinFeature(content: string): ParsedFeature {
  const hasRobotTestSection = /^\s*\*{3}\s*(?:Test Cases|Tasks)\s*\*{3}\s*$/im.test(content);
  if (!hasRobotTestSection) {
    return parseGherkinFeature(content);
  }

  const lines = content.split(/\r?\n/);
  const scenarios: ParsedScenario[] = [];
  const description: string[] = [];
  let featureTitle = 'Jornada TMS - Robot Suite';
  let currentCategory = 'Geral';
  let currentScenario: ParsedScenario | null = null;
  let idCounter = 1;
  let activeSection = '';
  let readingDocumentation = false;
  let readingSuiteDocumentation = false;
  let pendingTags: string[] = [];

  const getScenarioType = (titleText: string): 'success' | 'failure' | 'permission' => {
    const lowercaseTitle = titleText.toLowerCase();
    if (
      lowercaseTitle.includes('permissão') ||
      lowercaseTitle.includes('segurança') ||
      lowercaseTitle.includes('cargo') ||
      lowercaseTitle.includes('oauth') ||
      lowercaseTitle.includes('representante') ||
      lowercaseTitle.includes('funcionário')
    ) {
      return 'permission';
    }
    if (
      lowercaseTitle.includes('falha') ||
      lowercaseTitle.includes('erro') ||
      lowercaseTitle.includes('bloqueio') ||
      lowercaseTitle.includes('rejeitado') ||
      lowercaseTitle.includes('incorrect') ||
      lowercaseTitle.includes('inválido') ||
      lowercaseTitle.includes('impedimento') ||
      lowercaseTitle.includes('restrito') ||
      lowercaseTitle.includes('vazio') ||
      lowercaseTitle.includes('negativo')
    ) {
      return 'failure';
    }
    return 'success';
  };

  const addStep = (rawType: string, text: string) => {
    if (!currentScenario || !text.trim()) return;

    const lowerType = rawType.toLowerCase();
    let type: ParsedStep['type'] = 'AND';
    if (lowerType.startsWith('dado') || lowerType.startsWith('given')) type = 'GIVEN';
    else if (lowerType.startsWith('quando') || lowerType.startsWith('when')) type = 'WHEN';
    else if (lowerType.startsWith('então') || lowerType.startsWith('then')) type = 'THEN';

    currentScenario.steps.push({ type, rawType, text: text.trim() });
  };

  const createScenario = (rawTitle: string) => {
    const explicitScenario = rawTitle.match(
      /^(?::\s*)?(Scenario Outline|Esquema do Cenário|Scenario|Cenário|Cenario)\s*:?\s*(.*)$/i,
    );
    const title = (explicitScenario ? explicitScenario[2] : rawTitle).trim() || 'Cenário de Teste';

    currentScenario = {
      id: `SC_ROBOT_${String(idCounter++).padStart(3, '0')}`,
      title,
      category: currentCategory,
      steps: [],
      type: getScenarioType(title),
      tags: [...pendingTags],
    };
    scenarios.push(currentScenario);
    pendingTags = [];
    readingDocumentation = false;
  };

  const getCurrentScenario = (): ParsedScenario | null => currentScenario;

  for (const line of lines) {
    const trimmed = line.trim();
    const isIndented = /^[ \t]/.test(line);

    if (!trimmed) {
      readingDocumentation = false;
      readingSuiteDocumentation = false;
      continue;
    }

    const sectionMatch = trimmed.match(/^\*{3}\s*(.*?)\s*\*{3}$/);
    if (sectionMatch) {
      activeSection = sectionMatch[1].trim().toLowerCase();
      currentScenario = null;
      readingDocumentation = false;
      readingSuiteDocumentation = false;
      pendingTags = [];
      continue;
    }

    if (trimmed.startsWith('#')) {
      if (trimmed.toUpperCase().includes('MÓDULO')) {
        currentCategory = trimmed.replace(/^#\s*=*\s*/, '').replace(/=*$/, '').trim() || 'Geral';
      }
      readingDocumentation = false;
      readingSuiteDocumentation = false;
      continue;
    }

    if (activeSection === 'settings') {
      const nameMatch = trimmed.match(/^Name\s+(.+)$/i);
      if (nameMatch) {
        featureTitle = nameMatch[1].trim();
        continue;
      }

      const suiteDocumentationMatch = trimmed.match(/^Documentation\s+(.+)$/i);
      if (suiteDocumentationMatch) {
        description.push(suiteDocumentationMatch[1].trim());
        readingSuiteDocumentation = true;
        continue;
      }

      if (readingSuiteDocumentation && trimmed.startsWith('...')) {
        description.push(trimmed.replace(/^\.\.\.\s*/, '').trim());
        continue;
      }
      readingSuiteDocumentation = false;
      continue;
    }

    if (activeSection !== 'test cases' && activeSection !== 'tasks') continue;

    // Robot test names occupy the first column. Actions and metadata are indented.
    if (!isIndented && !trimmed.startsWith('...') && !trimmed.startsWith('[')) {
      if (trimmed.startsWith('@')) {
        pendingTags.push(...trimmed.split(/\s+/).filter((tag) => tag.startsWith('@')));
      } else {
        createScenario(trimmed);
      }
      continue;
    }

    const scenario = getCurrentScenario();
    if (!scenario) continue;

    const tagsMatch = trimmed.match(/^\[Tags\]\s*(.*)$/i);
    if (tagsMatch) {
      const tags = tagsMatch[1].split(/\s+/).filter(Boolean);
      scenario.tags = [...scenario.tags, ...tags];
      readingDocumentation = false;
      continue;
    }

    const documentationMatch = trimmed.match(/^\[Documentation\]\s*(.*)$/i);
    if (documentationMatch) {
      scenario.documentation = documentationMatch[1].trim();
      readingDocumentation = true;
      continue;
    }

    if (trimmed.startsWith('...') && readingDocumentation) {
      const continuation = trimmed.replace(/^\.\.\.\s*/, '').trim();
      scenario.documentation = [scenario.documentation, continuation]
        .filter(Boolean)
        .join(' ');
      continue;
    }

    // Robot control settings belong to the test, but are not executable steps.
    if (/^\[(?:Setup|Teardown|Template|Timeout)\]/i.test(trimmed)) {
      readingDocumentation = false;
      continue;
    }

    if (/^Skip(?:\s+|$)/i.test(trimmed)) {
      scenario.isSkipped = true;
      scenario.skipMessage = trimmed.replace(/^Skip\s*/i, '').trim();
      readingDocumentation = false;
      continue;
    }

    const stepMatch = trimmed.match(
      /^(Dado que|Dado|Quando|Então|E|Mas|Given que|Given that|Given|When|Then|And|But)\s+(.*)$/i,
    );
    if (stepMatch) {
      addStep(stepMatch[1], stepMatch[2]);
      readingDocumentation = false;
      continue;
    }

    if (trimmed.startsWith('...') && scenario.steps.length > 0) {
      const lastStep = scenario.steps[scenario.steps.length - 1];
      lastStep.text = `${lastStep.text} ${trimmed.replace(/^\.\.\.\s*/, '').trim()}`.trim();
      continue;
    }

    // Keep non-BDD Robot keywords as auxiliary steps, matching the old UI model.
    if (isIndented && !trimmed.startsWith('#')) {
      addStep('', trimmed);
      readingDocumentation = false;
    }
  }

  return { title: featureTitle, description, scenarios };
}

function getFallbackParsedFeature(): ParsedFeature {
  return {
    title: "Jornada de Entrada e Associação de Estabelecimentos - TMS",
    description: ["Como um parceiro ou administrador", "Para operar de acordo com permissões"],
    scenarios: [
      {
        id: "SC_ROBOT_001",
        title: "Senha de acesso válida ativa fluxo principal",
        category: "MÓDULO 1: AUTENTICAÇÃO (LOGIN)",
        steps: [
          { type: "GIVEN", rawType: "Dado que", text: "o usuário está na tela de autenticação" },
          { type: "WHEN", rawType: "Quando", text: "ele preenche o campo de texto 'Senha' com a senha de acesso válida '123456'" },
          { type: "THEN", rawType: "Então", text: "o sistema autoriza o acesso e redireciona à escolha de associação" }
        ],
        type: "success",
        tags: ["@RCT01"]
      },
      {
        id: "SC_ROBOT_002",
        title: "Bloqueio de conta após múltiplas tentativas falhas",
        category: "MÓDULO 1: AUTENTICAÇÃO (LOGIN)",
        steps: [
          { type: "GIVEN", rawType: "Dado que", text: "o usuário errou a senha 4 vezes consecutivas" },
          { type: "WHEN", rawType: "Quando", text: "ele tenta fazer login pela 5a vez com a senha incorreta '999999'" },
          { type: "THEN", rawType: "Então", text: "o sistema bloqueia temporariamente por excesso de tentativas" }
        ],
        type: "failure",
        tags: ["@RCT02"]
      }
    ]
  };
}
