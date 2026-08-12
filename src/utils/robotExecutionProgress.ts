export interface RobotExecutionProgress {
  total: number;
  passed: number;
  failed: number;
  /** O Robot imprimiu o resumo definitivo de testes. */
  isFinal: boolean;
}

export const INITIAL_ROBOT_EXECUTION_PROGRESS: RobotExecutionProgress = {
  total: 0,
  passed: 0,
  failed: 0,
  isFinal: false,
};

const SUMMARY_PATTERN = /\b(\d+)\s+tests?\s*,\s*(\d+)\s+passed\s*,\s*(\d+)\s+failed\b/i;
const RESULT_PATTERN = /\|\s*(PASS|FAIL)\s*\|/i;

/**
 * Atualiza os totais usando a saída de console do Robot Framework.
 *
 * Linhas de resultado atualizam os cartões imediatamente. Quando o Robot
 * imprime o resumo final (`N tests, P passed, F failed`), os valores passam a
 * ser definitivos, corrigindo quaisquer linhas de suíte exibidas no console.
 */
export function updateRobotExecutionProgress(
  current: RobotExecutionProgress,
  outputLine: string,
): RobotExecutionProgress {
  const summary = outputLine.match(SUMMARY_PATTERN);
  if (summary) {
    return {
      total: Number(summary[1]),
      passed: Number(summary[2]),
      failed: Number(summary[3]),
      isFinal: true,
    };
  }

  if (current.isFinal) return current;

  const status = outputLine.match(RESULT_PATTERN)?.[1]?.toUpperCase();
  if (status === 'PASS') {
    return { total: current.total + 1, passed: current.passed + 1, failed: current.failed, isFinal: false };
  }
  if (status === 'FAIL') {
    return { total: current.total + 1, passed: current.passed, failed: current.failed + 1, isFinal: false };
  }
  return current;
}
