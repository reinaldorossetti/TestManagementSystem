/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedFeature, parseRobotGherkinFeature, buildImportedTestCaseId } from '../utils/featureLoader';

/**
 * Initial contents representing the Portuguese BDD Feature file (/features/tms.feature)
 */
export const INITIAL_GHERKIN_CONTENT = `# language: pt
# encoding: utf-8

Funcionalidade: Jornada de Entrada e Associação de Estabelecimentos - TMS
  Como um parceiro ou administrador de estabelecimento comercial,
  Eu quero me autenticar com segurança, ler as diferenças entre os formatos e associar meu novo cadastro (Cliente Separado ou Vinculado),
  Para que eu possa gerenciar minhas contas de liquidação bancária e operar de acordo com as permissões da minha conta.

  # =========================================================================
  # MÓDULO 1: AUTENTICAÇÃO (LOGIN)
  # =========================================================================

  @RCT01
  Cenário: Senha de acesso válida ativa fluxo principal
    Dado que o usuário está na tela de autenticação 'Digite sua senha de acesso'
    E que a conta de acesso correspondente está ativa no sistema
    Quando ele preenche o campo de texto 'Senha' com a senha de acesso válida '123456'
    E clica no botão 'Continuar'
    Então o sistema autoriza o acesso no servidor de autenticação
    E o usuário é redirecionado imediatamente para a tela de 'Escolha de associação'.

  @RCT02
  Cenário: Desabilitação do botão continuar com campo de senha vazio
    Dado que o usuário está na tela de senha do TMS
    Quando o campo de digitação 'Senha' estiver totalmente vazio
    Então o botão de ação principal 'Continuar' deve permanecer bloqueado em estado visual cinza desabilitado
    E qualquer tentativa de clique ou envio não deve disparar nenhuma requisição ou erro de API.

  @RCT03
  Cenário: Exibição de alerta visual ao digitar senha incorreta
    Dado que o usuário está na tela de acesso do TMS
    Quando insere uma senha incorreta ex: '999999' no campo 'Senha'
    E clica no botão 'Continuar'
    Então o sistema impede o logon.

  # =========================================================================
  # MÓDULO 2: ENTENDA A DIFERENÇA (ONBOARDING)
  # =========================================================================

  @RCT04
  Cenário: Navegação avançando pelas orientações do carrossel
    Dado que o usuário abriu a ajuda explicativa 'Entenda a diferença'
    Quando clica no botão ativo laranja 'Próximo ->'
    Então o carrossel realiza a transição para o Slide 2 explicativo de texto detalhado.

  @RCT05
  Cenário: Conclusão do onboarding direcionará à seleção
    Dado que o usuário está analisando os tópicos de saldo no Slide 2 do tutorial
    Quando clica no botão laranja com rótulo 'Entendi' na parte inferior da tela
    Então o onboarding deve ser fechado com suavidade.

  # =========================================================================
  # MÓDULO 3: ESCOLHA DE ASSOCIAÇÃO
  # =========================================================================

  @RCT06
  Cenário: Inexistência de atalho para cadastrar novas lojas no menu suspenso de alternação
    Dado que o lojista está logado no painel do TMS
    Quando abre o menu flutuante de alternação rápida e verifica os comandos disponíveis
    Então o sistema não deve exibir o botão ou link para 'Cadastrar nova loja' no atalho 'Alternar entre lojas'
    E mantém apenas a listagem limpa de filiais autorizadas já ativas para seleção rápida.

  @RCT07
  Cenário: Supressão do botão cadastral sob o menu Meu Negócio - Lojas
    Dado que o usuário navega na seção 'Meu Negócio'
    E acessa a sub-página de gerenciamento de 'Lojas'
    Quando a lista de filiais ativas é carregada na tela
    Então a opção para inicializar abertura ou cadastro de nova loja não aparece mais em Meu Negócio > Lojas.

  @RCT08
  Cenário: Abertura automática do painel de associação após leitura de QR Code de Vínculo
    Dado que o lojista iniciou a câmera integrada do dispositivo móvel
    E apota para um QR Code de ativação de novo PDV ou filial
    Quando realiza com sucesso a leitura do QR Code de vínculo
    Então o lojista visualiza a tela 'Escolha como quer associar seu novo cadastro' preenchendo as informações contextuais da nova unidade.

  @RCT09
  Cenário: Exibição clara de Cliente Separado e Cliente Vinculado com definições operacionais
    Dado que a tela de seleção de tipo de associação 'Escolha como quer associar seu novo cadastro' está carregada
    Quando o usuário revisa as opções de associação
    Então as opções 'Cliente Separado' e 'Cliente Vinculado' são exibidas com suas respectivas descrições e características detalhadas.

  @RCT10
  Cenário: Disponibilidade do link Entenda a Diferença e bloqueio de prosseguimento sem seleção prévia
    Dado que o usuário está na tela de decisão de vínculo e associação
    E o link 'Entenda a diferença' está disponível na tela para suporte
    Quando o usuário tenta avançar sem selecionar nenhuma opção de vinculação
    Então o botão 'Continuar' só é habilitado após a seleção de uma das opções 'Cliente Separado' ou 'Cliente Vinculado'.

  # =========================================================================
  # MÓDULO 4: VALIDAÇÕES DE PERMISSÕES E SEGURANÇA (NEGÓCIO)
  # =========================================================================

  @RCT11
  Cenário: Permissão de Perfil Representante Legal autoriza a criação do modelo Cliente Separado
    Dado que o usuário realizou autenticação com perfil de 'Representante Legal' via CPF
    E está na tela de configuração de cadastro do TMS
    Quando tenta marcar 'Cliente Separado' e submete a transição com clique em 'Continuar'
    Então o formulário não exige duplo fator regulatório adicional.

  @RCT12
  Cenário: Permissão de Funcionário bloqueada para criação de conta de liquidação própria
    Dado que o usuário está autenticado com o perfil de 'Funcionário' via CPF sem autonomia financeira
    Quando ele seleciona 'Cliente Separado' e tenta avançar clicando em 'Continuar'
    Então a mudança de tela é abortada de imediato por falta de privilégio na chave do Representative
    E exibe-se um modal vermelho impeditivo.`;

export const isTwoScenarioFallback = (feature: ParsedFeature): boolean =>
  feature.title === 'Jornada de Entrada e Associação de Estabelecimentos - TMS' &&
  feature.scenarios.length === 2 &&
  feature.scenarios[0]?.id === 'SC_ROBOT_001' &&
  feature.scenarios[1]?.id === 'SC_ROBOT_002' &&
  feature.scenarios[0]?.title === 'Senha de acesso válida ativa fluxo principal';

export const getInitialWorkspaceContent = (): string => {
  if (typeof window === 'undefined') return INITIAL_GHERKIN_CONTENT;

  const saved = localStorage.getItem('cardmais_gherkin_content');
  if (!saved) return INITIAL_GHERKIN_CONTENT;

  if (isTwoScenarioFallback(parseRobotGherkinFeature(saved))) {
    return INITIAL_GHERKIN_CONTENT;
  }

  return saved;
};

export const getDefaultSqlQuery = (caseId: string): string => {
  return `-- Exemplos de Query para o Caso de Teste ${caseId}

-- 1. INSERT: Registra uma nova simulação de execução do teste no SQLite
INSERT INTO executions (
  command, 
  duration_ms, 
  pass_count, 
  fail_count, 
  skip_count, 
  report_path
) VALUES (
  'robot --include ${caseId} ./', 
  1520, 
  1, 
  0, 
  0, 
  '%ROBOT_HOME%/results/output.xml'
);

-- 2. UPDATE: Atualiza o status de aprovação de execução
UPDATE test_cases 
SET status = 'PASS', 
    duration_ms = 1520 
WHERE test_case_id = '${caseId}';

-- 3. SELECT: Consulta histórico consolidado de execuções deste cenário
SELECT id, status, duration_ms, created_at 
FROM test_cases 
WHERE test_case_id = '${caseId}' 
ORDER BY id DESC;`;
};

export const getDefaultScriptLanguage = (caseId: string, title: string): string => {
  return `# Script de Automação correspondente ao cenário ${caseId}
# Baseado na estrutura Gherkin / Robot Framework

*** Settings ***
Documentation    Automação para o teste: ${title || 'Caso de teste'}
Library          SeleniumLibrary
Library          DatabaseLibrary

*** Variables ***
\${BROWSER}       Chrome
\${URL}           https://contacard.grupocard.com.br

*** Test Cases ***
Executar Cenário ${caseId}
    [Tags]           ${caseId}    regression
    Dado Que O Usuário Está Logado No Sistema
    E Acessa A Rota Mapeada No Gherkin
    Quando Preenche Os Parâmetros Do Cenário
    Então Valida O Resultado Esperado Em Tela`;
};

export const getFormattedTimestamp = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const buildWorkspaceImportedCaseId = (
  folderName: string,
  tags: string[],
  scenarioTitle: string,
  fallbackId: string,
): string => {
  const baseId = buildImportedTestCaseId(tags, scenarioTitle, fallbackId);
  const folderLabel = folderName.split('/').pop() || folderName;
  const folderSlug = folderLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

  return folderSlug ? `${folderSlug}-${baseId}` : baseId;
};

export const normalizeImportedCaseTitleForMatch = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const extractPrimaryScenarioTagFromPreconditions = (preconditions?: string): string | null => {
  if (!preconditions) return null;

  const tagMatch = preconditions.match(/@([A-Za-z0-9_-]+)/);
  if (!tagMatch?.[1]) return null;

  return tagMatch[1].toUpperCase();
};

export const normalizeScenarioTagForBadge = (rawTag: string): string | null => {
  const tag = rawTag.replace(/^@/, '').trim().toUpperCase();
  if (!tag) return null;
  return tag;
};
