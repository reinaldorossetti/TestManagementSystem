/** Retorna a chamada do Python ideal segundo o SO do host (python3 no Linux/macOS, python no Windows). */
export function getPythonExecutable(): string {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32' ? 'python' : 'python3';
  }
  if (typeof navigator !== 'undefined') {
    const ua = (navigator.userAgent || navigator.platform || '').toLowerCase();
    if (ua.includes('win')) return 'python';
    return 'python3';
  }
  return 'python3';
}

/** Executa todas as suítes `.robot` da pasta `test_projects/`. */
export const ROBOT_RUN_ALL_COMMAND = `${getPythonExecutable()} -m robot test_projects/`;

/** Executa somente a feature tag `login_tests`. */
export const ROBOT_RUN_LOGIN_TESTS_COMMAND =
  `${getPythonExecutable()} -m robot -i login_tests test_projects/login_tests.robot`;

/**
 * Adds the persisted Robot repository to the compiled command. The backend
 * resolves this logical value to the physical RUN folder before spawning it.
 */
export function withRobotOutputDirectory(command: string, outputDirectory?: string): string {
  const directory = (outputDirectory?.trim() || 'results/robot_framework/').replace(/\\/g, '/');
  if (!directory || /\s--outputdir(?:\s|=)/i.test(command)) return command;
  return command.replace(
    /(python[0-9]*\s+-m\s+robot|py\s+-m\s+robot|robot)\b/i,
    `$1 --outputdir "${directory}"`,
  );
}

/**
 * Monta o comando Robot filtrado pela tag ativa (`Test Tags` ou `[Tags]`).
 *
 * O alvo da execução é o diretório raiz (`./`), conforme o contrato das
 * suítes mobile: o arquivo de argumentos resolve os caminhos e variáveis do
 * projeto. `sourceFolder` é mantido somente por compatibilidade com os fluxos
 * que usam o metadado para selecionar a `Test Tags` correta.
 */
export function buildFeatureRobotCommand(
  tag: string,
  sourceFolder?: string,
  argsFile?: string,
  outputDir?: string,
): string {
  const py = getPythonExecutable();
  const clean = (tag || '').replace(/^@/, '').trim();
  void sourceFolder;
  const args = argsFile?.trim()
    ? ` -A ${argsFile.trim()}`
    : '';
  const outDir = (outputDir?.trim() || '').replace(/\\/g, '/');
  const outOption = outDir ? ` --outputdir "${outDir}"` : '';
  if (!clean) {
    return `${py} -m robot${outOption}${args} ./`;
  }
  return `${py} -m robot${outOption}${args} -i ${clean} ./`;
}

/** Monta o comando do TMS para executar todos os casos selecionados da feature. */
export function buildMultipleTestRobotCommand(
  tags: string[],
  sourceFolder?: string,
  argsFile?: string,
): string {
  const py = getPythonExecutable();
  const cleanTags = [...new Set(
    tags
      .map((tag) => tag.replace(/^@/, '').trim())
      .filter(Boolean),
  )];
  const target = sourceFolder ? `test_projects/${sourceFolder}/` : 'test_projects/';
  const args = argsFile?.trim()
    ? ` -A ${argsFile.trim()}` : '';

  if (cleanTags.length === 0) {
    return `${py} -m robot${args} ${target}`;
  }

  return `${py} -m robot${args} ${cleanTags.map((tag) => `--include ${tag}`).join(' ')} ${target}`;
}

/** Monta o comando da execução singular de um caso Robot pela tag do teste. */
export function buildSingleTestRobotCommand(tag: string, sourceFolder?: string): string {
  const py = getPythonExecutable();
  const clean = (tag || '').replace(/^@/, '').trim();
  // O backend já executa na pasta `sourceFolder` por `workingDirectory`.
  // Repetir `test_projects/<sourceFolder>/` aqui faria o Robot procurar uma
  // subpasta duplicada dentro do próprio projeto.
  void sourceFolder;
  return `${py} -m robot --include ${clean} ./`;
}
