/** Executa todas as suítes `.robot` da pasta `robot-sample/`. */
export const ROBOT_RUN_ALL_COMMAND = 'python -m robot robot-sample/';

/** Executa somente a feature tag `login_tests`. */
export const ROBOT_RUN_LOGIN_TESTS_COMMAND =
  'python -m robot -i login_tests robot-sample/login_tests.robot';

/**
 * Monta o comando Robot filtrado pela tag ativa (`Test Tags` ou `[Tags]`).
 */
export function buildFeatureRobotCommand(tag: string, sourceFile?: string): string {
  const clean = (tag || '').replace(/^@/, '').trim();
  if (!clean) {
    return ROBOT_RUN_ALL_COMMAND;
  }
  const target = sourceFile ? `robot-sample/${sourceFile}` : 'robot-sample/';
  return `python -m robot -i ${clean} ${target}`;
}
