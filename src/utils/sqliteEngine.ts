/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Virtual SQLite Relational Database Engine Parser & Storage for BDD/Robot executions.
 */

export interface DbExecution {
  id: string; // e.g., RUN_20260617_1234
  timestamp: string;
  command: string;
  duration_s: number;
  total_tests: number;
  passed: number;
  failed: number;
  status: 'PASS' | 'FAIL';
  results_path: string; // caminho absoluto do output.xml
  /** Nome da pasta em results/ (ex.: RUN-2026-06-25_17-51-30-47841). */
  results_folder?: string;
  /** Screenshot do report.html da suíte (ex.: artifacts/robot-report.png). */
  report_screenshot_path?: string;
}

export interface DbTestCase {
  id: string;
  execution_id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration_s: number;
  /** ID do nó <test> no output.xml do Robot (ex.: s1-t1) — usado na captura do log. */
  robot_test_id?: string;
  /** Screenshot do trecho do log.html deste cenário. */
  report_screenshot_path?: string;
}

export interface DbStepLog {
  id: string;
  test_case_id: string;
  step_type: 'GIVEN' | 'WHEN' | 'THEN' | 'AND';
  text: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  /** Caminho relativo dentro de results/<runId>/ (ex.: browser/screenshot/when-standard_user.png). */
  screenshot_path?: string;
}

export interface DbFolderAcceptanceDoc {
  folder_path: string;
  doc_title: string;
  doc_web_path: string;
  repo_relative_path: string;
  updated_at: string;
}

export interface DbFolderAcceptanceDocHistory {
  id: number;
  folder_path: string;
  user: string;
  action: string;
  summary: string;
  time: string;
}

export interface DbTestCaseSphere {
  id: string; // e.g. "RECEL01" or "BRC-026"
  folder: string; // e.g. "br.com.grupocard.contacard.dev/Recarga de telefone"
  title: string; // e.g. "RECEL01 - Cenário de Teste Positivo - Realizar uma nova recarga de telefonia Vivo."
  preconditions: string;
  steps: string;
  expected_result: string;
  observation?: string;
  history?: { user: string; action: string; time: string }[];
  created_at: string;
}

export type TestCaseEvidenceType = 'image' | 'video' | 'link';
export type TestCaseEvidenceSource = 'automated' | 'manual';

export interface DbTestCaseEvidenceItem {
  id: string;
  test_case_id: string;
  source: TestCaseEvidenceSource;
  evidence_type: TestCaseEvidenceType;
  title: string;
  mime_type?: string;
  file_name?: string;
  storage_path?: string;
  external_url?: string;
  created_at: string;
  created_by: string;
  preview_url: string;
  label?: string;
  execution_id?: string;
  results_folder?: string;
  screenshot_path?: string;
}

export interface DbTestCaseEvidenceBundle {
  latest: DbTestCaseEvidenceItem | null;
  items: DbTestCaseEvidenceItem[];
}

export interface DbTestSpec {
  id: string;
  name: string;
  category: string;
  tags: string;
  content: string;
  created_at: string;
}

export interface VirtualDatabase {
  executions: DbExecution[];
  test_cases: DbTestCase[];
  steps: DbStepLog[];
  test_specs?: DbTestSpec[]; // Make optional to prevent breaking any legacy parsed sessions gracefully
  test_cases_sphere?: DbTestCaseSphere[];
  test_folders?: string[];
  folder_acceptance_docs?: DbFolderAcceptanceDoc[];
}

// Initial seed data — execuções vazias; novos runs reais preenchem via Terminal Ao Vivo.
export const INITIAL_DB_SEED: VirtualDatabase = {
  executions: [],
  test_cases: [],
  steps: [],
  test_specs: [
    {
      id: "SPEC-001",
      name: "Validações de Vínculo e Configuração de Loja",
      category: "Configurações de Associado",
      tags: "@all_scenarios, @RCT01, @RCT02, @RCT12",
      content: `Feature: Cadastro e Configurações de Associado - Validações do TMS
  Como desenvolvedor do software TMS
  Quero garantir o comportamento correto de novos fluxos de cadastro e vinculação
  Para evitar duplicidade ou transições financeiras incorretas na base de dados SQLite.

  Scenario: CT01 Teste de Ativação do Terminal
    Dado que o lojista abriu o modulo de ativação
    Quando digita o código do lojista válido
    Então o sistema ativa o terminal com sucesso e mostra o status verde.`,
      created_at: "2026-06-17 14:00:00"
    },
    {
      id: "SPEC-002",
      name: "Rotinas de Recargas de Bilhetes e Limites",
      category: "Módulo Financeiro",
      tags: "@finance, @RCT03, @RCT04",
      content: `Feature: Módulo Financeiro - Recarga de Bilhetes e Limites Daily
  Como operador de caixa do parceiro comercial TMS
  Quero simular recargas de transporte e limites operacionais
  Para certificar que transações excedentes sofram bloqueio temporário.

  Scenario: CT02 Recarga de bilhete com valor dentro do limite
    Dado que o lojista selecionou a função Recargas
    Quando insere o número do cartão "99.8827-1" e define R$ 15.00
    Então a venda é processada e o recibo de autorização é impresso.`,
      created_at: "2026-06-18 09:20:00"
    }
  ],
  test_folders: [
    "br.com.grupocard.contacard.dev",
    "br.com.grupocard.contacard.dev/Recarga de Conteúdo",
    "br.com.grupocard.contacard.dev/Pix",
    "br.com.grupocard.contacard.dev/Pix/Pix Automático",
    "br.com.grupocard.contacard.dev/Pagamento de Boleto",
    "br.com.grupocard.contacard.dev/Consolidado FGTS",
    "br.com.grupocard.contacard.dev/Recarga de telefone",
    "br.com.grupocard.contacard.dev/Cadastro - Onboarding",
    "br.com.grupocard.contacard.dev/Calculadora",
    "br.com.grupocard.contacard.dev/Adicionar Dinheiro",
    "br.com.grupocard.contacard.dev/Meus Dados",
    "br.com.grupocard.contacard.dev/Esim",
    "br.com.grupocard.contacard.dev/Nota fiscal",
    "br.com.grupocard.contacard.dev/Aprovações de Contrato",
    "br.com.grupocard.contacard.dev/Transferência P2P",
    "br.com.grupocard.contacard.dev/Pendências",
    "br.com.grupocard.contacard.dev/Sorte e capitalização",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/AL DA SORTE",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/Loterias Online",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/PE da Sorte",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/SP da Sorte",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/MS CAP",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/PALPITE DO MILHÃO",
    "br.com.grupocard.contacard.dev/Sorte e capitalização/FAMILHAO DO HUCK"
  ],
  test_cases_sphere: [
    {
      id: "RECEL01",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL01 - Cenário de Teste Positivo - Realizar uma nova recarga de telefonia Vivo.",
      preconditions: `*** Variables ***\n\${CPF}=           03533062236\n\${CNPJ_CONTA}=    50.430.319/0001-25\n\${SENHA}=         Teste123#\n\${LOJA_ID}=       935`,
      steps: `[Documentation]   Rota: Acessar Minha Conta > Ver mais > Vender > Recarga de telefone > Preencher DDD e Número de Celular > Selecionar a Operadora (Claro, TIM, Vivo) > Confirmar > Senha Transacional > Mensagem de Sucesso\n...\nDado Que Tenha Efetuado O Login No APP  \${CPF}  \${SENHA}  \${CNPJ_USER2}\nE Esteja Na Tela de Recarga de Celular\nQuando Cadastrar o DDD e Numero de Celular  19  97150-8381\nE Selecionar a operadora de Telefonia e o Valor  Vivo  R$ 25,00\nE Confirmar os Dados com forma de pagamento "saldo da carteira"\nEntão validar a Recarga realizada com Sucesso`,
      expected_result: "Realizar a recarga com sucesso.\nValidar o numero do celular e a Operadora inserida.",
      observation: "Validar se o saldo da carteira do lojista é subtraído corretamente após a confirmação.",
      history: [
        { user: "Reinaldo", action: "changed title RECEL01 - Cenário de Teste Positivo - Realizar uma nova recarga de telefonia Vivo. to RECEL01 - Cenário de Teste Positivo - Realizar uma nova recarga de telefonia Vivo.", time: "over 1 year ago" },
        { user: "Reinaldo", action: "created test case", time: "over 1 year ago" }
      ],
      created_at: "2026-06-15 08:30:00"
    },
    {
      id: "RECEL02",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL02 - Cenário de Teste Positivo - Realizar uma nova recarga de telefonia Claro.",
      preconditions: `*** Variables ***\n\text_number=       11988887777`,
      steps: `Dado Que Tenha Efetuado O Login No APP  \${CPF}  \${SENHA}\nE Esteja Na Tela de Recarga de Celular\nQuando Cadastrar o DDD e Numero de Celular  11  98888-7777\nE Selecionar a operadora de Telefonia e o Valor  Claro  R$ 15,00\nE Confirmar os Dados com transação autorizada\nEntão obter o comprovante de recarga da Claro na tela.`,
      expected_result: "Recarga realizada com sucesso para a operadora Claro.",
      observation: "Focar em testes de regressão com a operadora Claro devido à nova API de integração.",
      history: [
        { user: "Reinaldo", action: "created test case", time: "over 1 year ago" }
      ],
      created_at: "2026-06-15 09:12:00"
    },
    {
      id: "RECEL03",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL03 - Cenário de Teste Alternativo - Realizar uma nova recarga de telefonia TIM sem a opção do Produto cadastrado.",
      preconditions: ``,
      steps: `Dado que o usuário tentou recarregar um chip TIM desativado\nQuando insere o número inválido "11-91000-0000"\nEntão o sistema rejeita e avisa que o Produto não está ativo em catálogo.`,
      expected_result: "Apresentação correta de erro: Operação não disponível para produto selecionado.",
      history: [
        { user: "Reinaldo", action: "created test case", time: "over 1 year ago" }
      ],
      created_at: "2026-06-15 10:20:00"
    },
    {
      id: "RECEL04",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL04 - Cenário de Teste Positivo - Realizar uma nova recarga, gerar comprovante do cliente e validar as formas de compartilhamento",
      preconditions: ``,
      steps: `Dado que o usuário realizou uma nova recarga com sucesso\nQuando abre as opções do comprovante gerado\nEntão valida as funções de compartilhamento via email, WhatsApp e PDF.`,
      expected_result: "Comprovante compartilhado sem quebras de layout.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 11:00:00"
    },
    {
      id: "RECEL05",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL05 - Cenário de Teste Positivo - Realizar uma nova recarga, gerar comprovante do cliente e compartilhar via email",
      preconditions: ``,
      steps: `Dado que o usuário finalizou a recarga\nQuando compartilha via email do cliente\nEntão o email com o anexo do comprovante é enviado com sucesso.`,
      expected_result: "Envio de email dispara gatilho de microserviço de mensageria.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 11:30:00"
    },
    {
      id: "RECEL06",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL06 - Cenário de Teste Positivo - Realizar uma nova recarga, gerar comprovante do cliente e compartilhar via SMS",
      preconditions: ``,
      steps: `Dado que o usuário finalizou a recarga de telefonia\nQuando compartilha o comprovante via SMS do destinatário\nEntão o sistema notifica envio efetuado de link do SMS.`,
      expected_result: "Protocolo de SMS recebido pelo gateway virtual.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 12:00:00"
    },
    {
      id: "RECEL07",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL07 - Cenário de Teste Positivo - Realizar uma nova recarga e gerar comprovante do Cliente e validar uma nova recarga.",
      preconditions: ``,
      steps: `Dado que o cliente realiza a carga\nQuando um novo limite é atingido na mesma conta\nEntão uma nova recarga ainda é autorizada com comprovante individualizado.`,
      expected_result: "Validar múltiplos comprovantes na fila de impressão.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 13:00:00"
    },
    {
      id: "RECEL08",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL08 - Cenário de Teste Positivo - Realizar uma nova recarga, gerar comprovante do Vendedor e acessar nova recarga.",
      preconditions: ``,
      steps: `Dado que a transação de telefonia foi concluída pelo lojista\nQuando o comprovante do Vendedor é impresso contendo as taxas operacionais\nEntão o fluxo retorna ao início da tela de recarga limpa.`,
      expected_result: "Fidelização de dados de taxa administrativa nas tabelas SQLite.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 13:20:00"
    },
    {
      id: "RECEL09",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL09 - Cenário de Teste Positivo - Realizar uma nova recarga, gerar comprovante do Cliente e acessar nova recarga.",
      preconditions: ``,
      steps: `Dado que a transação de telefonia foi concluída\nQuando o comprovante de Cliente é impresso\nEntão o fluxo retorna à tela inicial de recargas de telefone.`,
      expected_result: "Imprimir dados sem vazamento de dados de outros usuários.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 14:00:00"
    },
    {
      id: "RECEL10",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL10 - Cenário de Teste Positivo - Limite Pós-Pago, validar comprovante do cliente e formas de compartilhamento",
      preconditions: ``,
      steps: `Dado que a conta possui faturamento pós-pago habilitada\nQuando o cliente solicita limite extra e realiza a recarga\nEntão o comprovante exibe 'Modo Pós-Pago' com sucesso.`,
      expected_result: "Exibir carimbo pós-pago com termos de uso integrados.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 14:30:00"
    },
    {
      id: "RECEL11",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL11 - Cenário de Teste Positivo - Limite Pós-Pago, validar comprovante do vendedor e formas de compartilhamento",
      preconditions: ``,
      steps: `Dado que a conta faturada pós-paga foi recarregada\nQuando visualiza o extrato do Vendedor\nEntão as taxas de faturamento aparecem de forma clara.`,
      expected_result: "Apresentar impostos devidamente destacados no rodapé.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 15:00:00"
    },
    {
      id: "RECEL12",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL12 - Cenário de Teste Positivo - Realizar uma nova recarga de telefone com Pix - QR Code.",
      preconditions: `*** Variables ***\n\${PIX_KEY}=        grupocard_dev_key`,
      steps: `Dado que o usuário selecionou pagar com Pix\nQuando o QR Code dinâmico é gerado em tela\nEntão o sistema aguarda a notificação de recebimento para aprovar a carga.`,
      expected_result: "Mudança instantânea de status para processado.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 15:40:00"
    },
    {
      id: "RECEL13",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL13 - Cenário de Teste Positivo - Realizar uma nova recarga com PIX e realizar o cancelamento na Confirmação.",
      preconditions: ``,
      steps: `Dado que o QR Code Pix foi gerado\nQuando o usuário clica no botão cancelar da tela de confirmação\nEntão a reserva do Pix é desfeita de imediato e o fluxo limpa.`,
      expected_result: "Status na tabela SQLite de transições alterado para CANCELADO.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 16:00:00"
    },
    {
      id: "RECEL14",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL14 - Cenário de Teste Positivo - Realizar uma nova recarga com PIX e Pix copia e cola.",
      preconditions: ``,
      steps: `Dado que o Pix foi gerado\nQuando o usuário copia a chave Pix copia e cola para transferência externa\nEntão realiza a liquidação e o app atualiza o status de sucesso.`,
      expected_result: "Copiar com sucesso para o clipboard e disparar notificação.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 16:30:00"
    },
    {
      id: "RECEL15",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL15 - Cenário de Teste Positivo - Realizar uma nova recarga de telefone com Pix e Compartilhar o comprovante do Vendedor.",
      preconditions: ``,
      steps: `Dado que a recarga com Pix foi efetivada\nQuando solicita o recibo do logista / vendedor\nEntão gera o PDF exportável com carimbo Pix validado.`,
      expected_result: "Garante visualização exata de ID Pix e hora transacional.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 17:00:00"
    },
    {
      id: "RECEL16",
      folder: "br.com.grupocard.contacard.dev/Recarga de telefone",
      title: "RECEL16 - Cenário de Teste Positivo - Realizar uma nova recarga de telefone com Pix e Compartilhar via Email e WhatsApp.",
      preconditions: ``,
      steps: `Dado que a recarga com Pix foi efetuada\nQuando seleciona múltiplos canais de compartilhamento simultâneos\nEntão realiza o envio em ambas as pontas.`,
      expected_result: "Dispara envio concorrente para os canais de recebimento do cliente.",
      history: [{ user: "Reinaldo", action: "created test case", time: "over 1 year ago" }],
      created_at: "2026-06-15 17:30:00"
    }
  ]
};

/**
 * Super lightweight relational SQL query parser simulator.
 * Parses simple SQL like:
 *   SELECT col1, col2 OR * FROM executions|test_cases|steps 
 *   [WHERE col = 'value'] 
 *   [ORDER BY col ASC|DESC] 
 *   [LIMIT number]
 */
export function executeVirtualSQL(sql: string, db: VirtualDatabase): { columns: string[]; rows: any[]; error?: string; count: number } {
  try {
    const cleanedSql = sql.trim().replace(/\s+/g, ' ').replace(/;$/, '');
    const selectMatch = cleanedSql.match(/^SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+([\w_]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);

    if (!selectMatch) {
      return {
        columns: [],
        rows: [],
        count: 0,
        error: "Erro de Sintaxe SQL. Formato suportado: SELECT * OR col1, col2 FROM [tabela] [WHERE col='val'] [ORDER BY col [ASC|DESC]] [LIMIT n]"
      };
    }

    const selectFieldsStr = selectMatch[1].trim();
    const tableName = selectMatch[2].trim().toLowerCase();
    const whereClause = selectMatch[3] ? selectMatch[3].trim() : null;
    const orderByCol = selectMatch[4] ? selectMatch[4].trim() : null;
    const orderDirection = selectMatch[5] ? selectMatch[5].toUpperCase() : 'ASC';
    const limitCount = selectMatch[6] ? parseInt(selectMatch[6], 10) : null;

    // Validate table
    let sourceData: any[] = [];
    if (tableName === 'executions') {
      sourceData = [...db.executions];
    } else if (tableName === 'test_cases' || tableName === 'testcases') {
      sourceData = [...db.test_cases];
    } else if (tableName === 'steps') {
      sourceData = [...db.steps];
    } else if (tableName === 'test_specs' || tableName === 'testspecs' || tableName === 'test_specifications') {
      sourceData = [...(db.test_specs || [])];
    } else {
      return {
        columns: [],
        rows: [],
        count: 0,
        error: `Tabela inexistente: '${tableName}'. Escolha entre: executions, test_cases, steps, test_specs`
      };
    }

    // Filter with simple WHERE
    let filteredData = [...sourceData];
    if (whereClause) {
      // Handles simple filters like status = 'PASS', execution_id = 'RUN-1718610001', etc.
      const equalsMatch = whereClause.match(/^([\w_]+)\s*=\s*['"]?([^'"]+)['"]?$/i);
      if (equalsMatch) {
        const colName = equalsMatch[1].toLowerCase();
        const rawValue = equalsMatch[2];
        filteredData = filteredData.filter(row => {
          const rowValue = String(row[colName] || '').toLowerCase();
          return rowValue === rawValue.toLowerCase();
        });
      } else {
        // Simple sub-string lookup
        const likeMatch = whereClause.match(/^([\w_]+)\s+LIKE\s+['"]?%?([^'%"]+)%?['"]?$/i);
        if (likeMatch) {
          const colName = likeMatch[1].toLowerCase();
          const rawValue = likeMatch[2].toLowerCase();
          filteredData = filteredData.filter(row => {
            const rowValue = String(row[colName] || '').toLowerCase();
            return rowValue.includes(rawValue);
          });
        }
      }
    }

    // Order by column
    if (orderByCol) {
      const col = orderByCol.toLowerCase();
      filteredData.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return orderDirection === 'DESC' ? valB - valA : valA - valB;
        } else {
          const strA = String(valA || '').toLowerCase();
          const strB = String(valB || '').toLowerCase();
          if (strA < strB) return orderDirection === 'DESC' ? 1 : -1;
          if (strA > strB) return orderDirection === 'DESC' ? -1 : 1;
          return 0;
        }
      });
    }

    // Apply Limit
    if (limitCount !== null) {
      filteredData = filteredData.slice(0, limitCount);
    }

    // Determine output columns
    let columns: string[] = [];
    if (filteredData.length > 0) {
      if (selectFieldsStr === '*') {
        columns = Object.keys(filteredData[0]);
      } else {
        columns = selectFieldsStr.split(',').map(c => c.trim().toLowerCase());
        // Verify columns existence
        const actualCols = Object.keys(filteredData[0]);
        columns = columns.filter(c => actualCols.includes(c));
        if (columns.length === 0) {
          columns = actualCols;
        }
      }
    } else {
      // Default placeholder columns for empty outputs
      columns = tableName === 'executions' 
        ? ['id', 'timestamp', 'command', 'duration_s', 'status'] 
        : tableName === 'test_cases' 
          ? ['id', 'execution_id', 'name', 'category', 'status'] 
          : tableName === 'steps'
            ? ['id', 'test_case_id', 'step_type', 'text', 'status']
            : ['id', 'name', 'category', 'tags', 'created_at'];
    }

    // Map rows to match columns selection
    const rows = filteredData.map(row => {
      const mappedRow: any = {};
      columns.forEach(col => {
        mappedRow[col] = row[col];
      });
      return mappedRow;
    });

    return {
      columns,
      rows,
      count: rows.length
    };
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      count: 0,
      error: `Erro de análise de Consulta SQLite: ${err?.message || 'Erro Desconhecido'}`
    };
  }
}
