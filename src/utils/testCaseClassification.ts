/**
 * Shared heuristics that classify a test case (severity, criticality, automation
 * complexity) and normalize its lifecycle status label. Centralizing this logic
 * keeps the Excel and PDF exporters consistent and avoids duplication.
 */

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

/** Formal lifecycle labels (see AGENTS.md). */
export type StatusLabel = 'Passed' | 'Failed' | 'Skipped' | 'Blocked' | 'Not Started';

/** Infers a severity level from the case title keywords. */
export const getSeverityLevel = (title: string, _id: string): Severity => {
  const lower = title.toLowerCase();
  if (
    lower.includes('senha') ||
    lower.includes('login') ||
    lower.includes('autentic') ||
    lower.includes('token') ||
    lower.includes('segurança') ||
    lower.includes('crítico')
  ) {
    return 'Critical';
  }
  if (
    lower.includes('pagar') ||
    lower.includes('pagamento') ||
    lower.includes('recarga') ||
    lower.includes('saldo') ||
    lower.includes('carteira') ||
    lower.includes('erro') ||
    lower.includes('limite')
  ) {
    return 'High';
  }
  if (
    lower.includes('filtro') ||
    lower.includes('busca') ||
    lower.includes('detalhe') ||
    lower.includes('consultar') ||
    lower.includes('visualizar') ||
    lower.includes('histórico')
  ) {
    return 'Medium';
  }
  return 'Low';
};

/** Derives a criticality level from the severity and the case id. */
export const getCriticalityLevel = (severity: Severity, id: string): Severity => {
  const lastChar = id.slice(-1);
  const num = parseInt(lastChar, 10);
  if (!isNaN(num) && num % 4 === 0) {
    return 'Critical';
  }
  return severity;
};

/** Returns a descriptive automation-complexity note for the given severity. */
export const getComplexityDetails = (severity: Severity): string => {
  if (severity === 'Critical') {
    return 'Complexidade Alta:\n- Os elementos não possuem ID único, fazer uma solicitação para o time de desenvolvimento. Ou solicitar o acesso para o QA realizar o ajuste na aplicação com supervisão do Dev Senior.\n- Massa de Dados não pode ser feita de forma aleatórias, é preciso modificar os dados na base de dados antes de realizar os testes, ou testar fazer via API.';
  }
  if (severity === 'High') {
    return 'Complexidade Média:\n- Requer setup de massa de dados dinâmico via query SQLite prévia.\n- Necessário capturar token de sessão e passar nos headers para simulação de requisições paralelas.';
  }
  if (severity === 'Medium') {
    return 'Complexidade Média:\n- Validação de respostas em grade de dados com propriedades dinâmicas.\n- Necessário assincronismo estrito devido ao atraso de renderização de componentes de tela de terceiros.';
  }
  return 'Complexidade Baixa:\n- Elementos web com IDs estáticos bem definidos.\n- Fluxo linear sem condicionais complexas, facilmente mapeável nas suítes automatizadas.';
};

/**
 * Maps an internal status code (`PASS`/`FAIL`/`SKIP`) to a formal lifecycle
 * label. Cases that were never executed report "Not Started".
 */
export const getStatusLabel = (status?: string): StatusLabel => {
  switch (status) {
    case 'PASS':
      return 'Passed';
    case 'FAIL':
      return 'Failed';
    case 'SKIP':
      return 'Skipped';
    default:
      return 'Not Started';
  }
};
