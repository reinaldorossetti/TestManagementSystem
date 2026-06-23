/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BDDScenario } from '../types';

export const BDD_SCENARIOS: BDDScenario[] = [
  // --- MODULE 1: LOGIN / ACESSO ---
  {
    id: "SCENARIO_01",
    category: "Autenticação (Login)",
    title: "Senha de acesso válida ativa fluxo principal",
    type: "success",
    details: "Verifica se uma senha válida de 6 dígitos inserida pelo usuário em situação regular autoriza a entrada e libera o fluxo de negócios TMS.",
    given: [
      "Dado que o usuário está na tela de autenticação 'Digite sua senha de acesso'",
      "E que a conta de acesso correspondente está ativa no sistema"
    ],
    when: [
      "Quando ele preenche o campo de texto 'Senha' com a senha de acesso válida '123456'",
      "E clica no botão 'Continuar'"
    ],
    then: [
      "Então o sistema autoriza o acesso no servidor de autenticação",
      "E o usuário é redirecionado imediatamente para a tela de 'Escolha de associação' com o perfil carregado com sucesso."
    ],
    simulatorActions: [
      { screen: 'login', description: "Usuário acessa a tela de senha", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: '123456', description: "Digita senha válida '123456'", expectedOutcome: 'success' },
      { screen: 'association', description: "Redireciona para tela de associação de cadastro", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_02",
    category: "Autenticação (Login)",
    title: "Desabilitação do botão continuar com campo de senha vazio",
    type: "failure",
    details: "Prepara a interface para não permitir cliques indesejados ou requisições desnecessárias para a API se a senha sequer foi digitada.",
    given: [
      "Dado que o usuário está na tela de senha do TMS"
    ],
    when: [
      "Quando o campo de digitação 'Senha' estiver totalmente vazio"
    ],
    then: [
      "Então o botão de ação principal 'Continuar' deve permanecer bloqueado em estado visual cinza desabilitado",
      "E qualquer tentativa de clique ou envio não deve disparar nenhuma requisição ou erro de API."
    ],
    simulatorActions: [
      { screen: 'login', description: "Usuário acessa a tela de login", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: '', description: "Deixa o campo de senha vazio", expectedOutcome: 'failure', errorMessage: "O botão continuar fica inativo se a senha estiver em branco." }
    ]
  },
  {
    id: "SCENARIO_03",
    category: "Autenticação (Login)",
    title: "Exibição de alerta visual ao digitar senha incorreta",
    type: "failure",
    details: "Valida se senhas incorretas são interceptadas e se uma indicação visual compreensível alerta o usuário para a digitação incorreta.",
    given: [
      "Dado que o usuário está na tela de acesso do TMS",
      "E possui uma conta ativa"
    ],
    when: [
      "Quando insere uma senha incorreta ex: '999999' no campo 'Senha'",
      "E clica no botão 'Continuar'"
    ],
    then: [
      "Então o sistema impede o logon",
      "E exibe uma mensagem de falha abaixo ou acima do campo: 'Senha incorreta. Tente novamente.'",
      "E limpa o campo ou realça a borda em vermelho (cor de erro)."
    ],
    simulatorActions: [
      { screen: 'login', description: "Usuário acessa a tela de login", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: '999999', description: "Digita senha incorreta '999999'", expectedOutcome: 'success' },
      { screen: 'login', description: "Tenta continuar e o sistema exibe erro visual", expectedOutcome: 'failure', errorMessage: "Senha incorreta. Tente novamente." }
    ]
  },
  {
    id: "SCENARIO_04",
    category: "Autenticação (Login)",
    title: "Bloqueio de conta após múltiplas tentativas falhas consecutivas",
    type: "failure",
    details: "Mecanismo de segurança crítico para evitar ataques de força bruta, garantindo conformidade com padrões de segurança bancários da TMS.",
    given: [
      "Dado que o usuário está tentando realizar login no sistema",
      "E que ele já efetuou anteriormente 4 tentativas de login incorretas consecutivas"
    ],
    when: [
      "Quando ele realiza a 5ª tentativa de login fornecendo senha inválida"
    ],
    then: [
      "Então o sistema deve bloquear temporariamente a conta de acesso por 15 minutos",
      "E exibir um modal ou alerta explicativo: 'Acesso bloqueado temporariamente por excesso de tentativas.'",
      "E orientar o usuário a utilizar o fluxo de recuperação no botão 'Esqueceu sua senha?'."
    ],
    simulatorActions: [
      { screen: 'login', description: "Usuário com 4 falhas na fila tenta novamente", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: '000000', description: "Digita senha errada pela 5ª vez consecutiva", expectedOutcome: 'success' },
      { screen: 'login', description: "A conta é bloqueada por segurança.", expectedOutcome: 'failure', errorMessage: "Acesso bloqueado temporariamente por excesso de tentativas. Clique em Esqueceu sua senha para recuperar." }
    ]
  },
  {
    id: "SCENARIO_05",
    category: "Autenticação (Login)",
    title: "Alternar exibição invisível para texto visível",
    type: "success",
    details: "Assegura ao usuário controle sobre a exibição de seus dados de senha para evitar que terceiros vejam ou para certificar-se da digitação.",
    given: [
      "Dado que o usuário está digitando sua senha privadamente no formulário"
    ],
    when: [
      "Quando ele clica sobre o botão de olho 'revelar senha' localizado à direita interna do input"
    ],
    then: [
      "Então o campo de input altera seu tipo técnico de 'password' para 'text'",
      "E os caracteres são revelados legivelmente na tela",
      "E o ícone gráfico do olho muda para indicar que o próximo clique re-ocultará os dígitos."
    ],
    simulatorActions: [
      { screen: 'login', description: "Acessa a tela de login", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: '778899', description: "Digita '778899' mascarado (••••••)", expectedOutcome: 'success' },
      { screen: 'login', description: "Clica no ícone do olho e revela os números legíveis '778899'", expectedOutcome: 'success' }
    ]
  },

  // --- MODULE 2: ONBOARDING / AJUDA ---
  {
    id: "SCENARIO_06",
    category: "Entenda a Diferença (Onboarding)",
    title: "Navegação avançando pelas orientações do carrossel",
    type: "success",
    details: "Verifica que o usuário consegue progredir no carrossel informativo sobre os tipos de estabelecimentos disponíveis antes de fazer sua escolha principal.",
    given: [
      "Dado que o usuário abriu a ajuda explicativa 'Entenda a diferença'",
      "E que está visualizando o Slide 1 (exibindo ilustração com mapa)"
    ],
    when: [
      "Quando clica no botão ativo laranja 'Próximo ->'"
    ],
    then: [
      "Então o carrossel realiza a transição para o Slide 2 explicativo de texto detalhado",
      "E altera o carimbo visual de paginação abaixo do conteúdo (indicando a segunda barra ativada)."
    ],
    simulatorActions: [
      { screen: 'onboarding_intro', description: "Exibe Slide 1 com introdução do mapa e marcador de localização", expectedOutcome: 'success' },
      { screen: 'onboarding_details', description: "Usuário clica em Próximo -> e avança para o Slide 2 rico em texto", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_07",
    category: "Entenda a Diferença (Onboarding)",
    title: "Retorno pelas orientações usando cabeçalho voltar",
    type: "success",
    details: "Garante a flexibilidade e usabilidade permitindo re-ler informações do slide anterior a qualquer momento de forma simples.",
    given: [
      "Dado que o usuário está na ajuda explicativa visualizando o Slide 2 detalhado"
    ],
    when: [
      "Quando ele clica no botão de flecha de voltar 'arrow_back' presente no cabeçalho superior"
    ],
    then: [
      "Então a visualização desliza de volta para o conteúdo inicial do Slide 1 de onboarding",
      "E as referências de progresso são re-associadas ao ponto inicial."
    ],
    simulatorActions: [
      { screen: 'onboarding_details', description: "Estudando os pontos detalhados do Slide 2", expectedOutcome: 'success' },
      { screen: 'onboarding_intro', description: "Clica na seta superior esquerdo e volta para o Slide 1", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_08",
    category: "Entenda a Diferença (Onboarding)",
    title: "Conclusão do onboarding direcionará à seleção",
    type: "success",
    details: "Depois de ler as descrições dos saldos, o usuário encerra o tutorial e deve retornar imediatamente para agir com suas escolhas.",
    given: [
      "Dado que o usuário está analisando os tópicos de saldo e liquidação no Slide 2 do tutorial"
    ],
    when: [
      "Quando clica no botão laranja com rótulo 'Entendi' na parte inferior da tela"
    ],
    then: [
      "Então a sobreposição de onboarding é fechada com suavidade",
      "E o usuário retorna para a tela de escolhas onde 'Cliente Separado' ou 'Cliente Vinculado' podem ser selecionados para continuar."
    ],
    simulatorActions: [
      { screen: 'onboarding_details', description: "Visualizando dados de saldo individual vs saldo unificado", expectedOutcome: 'success' },
      { screen: 'association', description: "Clica em 'Entendi' e retorna para a tela de escolhas", expectedOutcome: 'success' }
    ]
  },

  // --- MODULE 3: ESCOLHA DE ASSOCIAÇÃO ---
  {
    id: "SCENARIO_09",
    category: "Associação de Estabelecimentos",
    title: "Seleção do modelo Cliente Separado destaca os benefícios de gestão independente",
    type: "success",
    details: "Valida se ao escolher Cliente Separado, o estilo do card se atualiza para selecionado, os itens de check se iluminam em laranja de sucesso e o CTA se habilita.",
    given: [
      "Dado que o usuário está na tela de escolha de associação do novo cadastro"
    ],
    when: [
      "Quando ele clica sobre o bloco de seleção 'Cliente Separado'"
    ],
    then: [
      "Então a borda do cartão de 'Cliente Separado' muda para uma borda laranja espessa com sombra de destaque",
      "E surge o indicador de marcação (radio) ativado",
      "E o botão continuar inferior de ação transiciona de desabilitado (cinza) para habilitado (Laranja ativo)."
    ],
    simulatorActions: [
      { screen: 'association', description: "Tela de associação com opções desmarcadas", expectedOutcome: 'success' },
      { screen: 'association', fieldId: 'association_type', value: 'separated', description: "Seleciona o modelo 'Cliente Separado'", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_10",
    category: "Associação de Estabelecimentos",
    title: "Seleção do modelo Cliente Vinculado destaca centralização operacional",
    type: "success",
    details: "Assim como no anterior, escolher o modelo unificado atualiza a estilização para reforçar a intenção clara do operador e destrava o formulário.",
    given: [
      "Dado que o usuário está na tela de opções de tipo de associação do TMS"
    ],
    when: [
      "Quando ele clica sobre o bloco de seleção 'Cliente Vinculado'"
    ],
    then: [
      "Então o card 'Cliente Vinculado' é realçado com preenchimento sutil de tintura e bordas laranja ativo",
      "E o card 'Cliente Separado' volta para o estilo passivo não marcado",
      "E o botão continuar é validado para prosseguir."
    ],
    simulatorActions: [
      { screen: 'association', description: "Inicia com opções aguardando decisão", expectedOutcome: 'success' },
      { screen: 'association', fieldId: 'association_type', value: 'linked', description: "Seleciona o modelo 'Cliente Vinculado'", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_11",
    category: "Associação de Estabelecimentos",
    title: "Tentativa de seguir sem escolha do tipo de associação",
    type: "failure",
    details: "Bloqueia de forma irredutível o avanço do fluxo se nenhuma opção de acoplamento de estabelecimento foi expressada formalmente na tela.",
    given: [
      "Dado que o usuário ainda não tocou em nenhum dos cartões de associação"
    ],
    when: [
      "Quando tenta acionar o botão de navegação 'Continuar' no rodapé"
    ],
    then: [
      "Então o sistema impede a mudança de tela permanecendo na mesma etapa",
      "E exibe uma notificação do tipo tooltip ou modal sutil persistindo: 'Por favor, selecione uma das opções acima para continuar'."
    ],
    simulatorActions: [
      { screen: 'association', description: "Usuário na tela de escolhas com seleção vazia", expectedOutcome: 'success' },
      { screen: 'association', description: "Clica em continuar sem escolher uma opção", expectedOutcome: 'failure', errorMessage: "Selecione uma das opções acima para continuar." }
    ]
  },
  {
    id: "SCENARIO_12",
    category: "Associação de Estabelecimentos",
    title: "Acessar ajuda explicativa contextual na tomada de decisão",
    type: "success",
    details: "Permite um desvio informativo no fluxo principal que esclarece as grandes diferenças de saldos e controle financeiro antes da tomada de decisão oficial.",
    given: [
      "Dado que o usuário está indeciso na tela de opções de associação"
    ],
    when: [
      "Quando clica no botão de texto centralizado 'Entenda a diferença' com ícone de chevron_right"
    ],
    then: [
      "Então a tela de onboarding com o fluxo explicativo é aberta para instruir o tomador de decisão."
    ],
    simulatorActions: [
      { screen: 'association', description: "Indeciso com as implicações da associação", expectedOutcome: 'success' },
      { screen: 'onboarding_intro', description: "Clica em 'Entenda a diferença' e acessa o tutorial de saldos", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_13",
    category: "Associação de Estabelecimentos",
    title: "Abandonar o fluxo de associação voluntariamente",
    type: "success",
    details: "Oferece saída limpa caso o usuário decida recusar a operação no momento por engano ou falta de documentos específicos.",
    given: [
      "Dado que o usuário está no seletor de associação do novo estabelecimento"
    ],
    when: [
      "Quando clica em 'Cancelar' localizado no ponto mais baixo do formulário"
    ],
    then: [
      "Então o sistema exibe um modal de cancelamento perguntando se ele deseja descartar os passos para cadastrar",
      "E ao consentir, retorna-o para o dashboard inicial do TMS limpando dados temporários."
    ],
    simulatorActions: [
      { screen: 'association', description: "Deseja desistir do cadastramento da filial", expectedOutcome: 'success' },
      { screen: 'login', description: "Clica em cancelar e retorna ao menu/acesso inicial", expectedOutcome: 'success' }
    ]
  },

  // --- MODULE 4: VERIFICAÇÃO DE DADOS ---
  {
    id: "SCENARIO_14",
    category: "Verificação dos Dados da Loja",
    title: "Apresentação de dados preenchidos e válidos para estabelecimento",
    type: "success",
    details: "Valida se os dados cadastrais recolhidos via base de dados ou Receita Federal estão corretos e montados ordenadamente nos cards de revisão.",
    given: [
      "Dado que o usuário escolheu uma opção válida e avançou para a revisão",
      "E que o estabelecimento está cadastrado sob a Razão Social 'Padaria Santa Marcelina'"
    ],
    when: [
      "Quando a tela 'Confira os dados da sua loja' é renderizada"
    ],
    then: [
      "Então o usuário deve visualizar em formato de texto legível os campos corretos prepopulados de CEP '87720-170', Logradouro 'Rua São João, 234', Bairro 'Jordão', Município 'São Paulo' e Estado 'SP'",
      "E a informação de 'Faturamento informado' deve estar descrita de forma consistente na parte inferior."
    ],
    simulatorActions: [
      { screen: 'association', fieldId: 'association_type', value: 'separated', description: "Seleciona opção e avança", expectedOutcome: 'success' },
      { screen: 'confirmation_dados', description: "Confere os dados da 'Padaria Santa Marcelina' carregados e conferidos", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_15",
    category: "Verificação dos Dados da Loja",
    title: "Sufocação de avanço lógico por inconsistência extrema nos dados cadastrais",
    type: "failure",
    details: "Se por algum motivo crítico no back-end os dados de endereço do estabelecimento forem nulos, impede o envio para não estragar a formatação fiscal.",
    given: [
      "Dado que o usuário está na tela de confirmação de dados",
      "E que os registros de Município ou Estado retornaram em branco devido a inconsistência de CEP inválido"
    ],
    when: [
      "Quando ele clica de modo obstinado em 'Continuar'"
    ],
    then: [
      "Então o sistema impede a transação indicando em tela: 'Dados fiscais ausentes ou corrompidos. Solicite revisão cadastral.'",
      "E bloqueia o envio remoto de dados."
    ],
    simulatorActions: [
      { screen: 'confirmation_dados', description: "Exibe dados com omissão grave de Cidade/Estado", expectedOutcome: 'success' },
      { screen: 'confirmation_dados', description: "Clica em continuar e o checkout impede o avanço", expectedOutcome: 'failure', errorMessage: "Inconsistência cadastral: Município/Estado estão inválidos ou ausentes na Receita." }
    ]
  },
  {
    id: "SCENARIO_16",
    category: "Verificação dos Dados da Loja",
    title: "Vinculação de estabelecimento enviada com extremo sucesso",
    type: "success",
    details: "Módulo principal feliz do negócio. Clicar em continuar com tudo validado salva as configurações e inicia a jornada comercial.",
    given: [
      "Dado que todos os dados cadastrais da 'Padaria Santa Marcelina' coincidem perfeitamente com os oficiais",
      "E estão completos e revisados"
    ],
    when: [
      "Quando o usuário pressiona o botão de chamada de alta visibilidade 'Continuar' no fim da tela"
    ],
    then: [
      "Então o aplicativo envia as credenciais de associação fiscal para a API central",
      "E renderiza com sucesso uma animação de conclusão",
      "E redireciona para a tela de boas vindas com a mensagem: 'Padaria Santa Marcelina associada com sucesso!'."
    ],
    simulatorActions: [
      { screen: 'confirmation_dados', description: "Dados revisados e confirmados", expectedOutcome: 'success' },
      { screen: 'login', description: "Clica em Continuar. Cadastro processado! Retorna com sucesso ao início com nova filial acoplada.", expectedOutcome: 'success' }
    ]
  },

  // --- MODULE 5: VALIDAÇÕES DE PERMISSÕES E SEGURANÇA ---
  {
    id: "SCENARIO_17",
    category: "Validação de Permissão e Segurança",
    title: "Permissão de Perfil Representante Legal autoriza a criação do modelo Cliente Separado",
    type: "permission",
    details: "Controle de segurança de negócios. Só perfis credenciados (Representante Legal) podem criar faturamentos paralelos independentes.",
    given: [
      "Dado que o usuário realizou autenticação com perfil de 'Representante Legal' via CPF",
      "E está na tela de configuração de cadastro do TMS"
    ],
    when: [
      "Quando tenta marcar 'Cliente Separado' e submete a transição com clique em 'Continuar'"
    ],
    then: [
      "Então o formulário não exige duplo fator regulatório adicional",
      "E prossegue direto para a tela de revisão de dados cadastrais autorizando a abertura de nova liquidação de saldo."
    ],
    simulatorActions: [
      { screen: 'association', userRole: 'representante_legal', description: "Perfil logado: Representante Legal", expectedOutcome: 'success' },
      { screen: 'association', fieldId: 'association_type', value: 'separated', description: "Marca Cliente Separado e avança sem travas", expectedOutcome: 'success' },
      { screen: 'confirmation_dados', description: "Chega à tela de revisão normalmente como Representante Legal", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_18",
    category: "Validação de Permissão e Segurança",
    title: "Permissão de Funcionário bloqueada para criação de conta de liquidação própria",
    type: "permission",
    details: "Garante proteção patrimonial da empresa cliente. Contas secundárias de liquidação (Cliente Separado) não podem ser criadas por funcionários sem autonomia financeira.",
    given: [
      "Dado que o usuário está autenticado com o perfil de 'Funcionário' via CPF sem autonomia financeira"
    ],
    when: [
      "Quando ele seleciona 'Cliente Separado' e tenta avançar clicando em 'Continuar'"
    ],
    then: [
      "Então a mudança de tela é abortada de imediato por falta de privilégio na chave do Representative",
      "E exibe-se um modal vermelho impeditivo: 'Permissão Negada: É necessário perfil de Representante Legal para criar estabelecimentos independentes.'"
    ],
    simulatorActions: [
      { screen: 'association', userRole: 'funcionario', description: "Perfil ativo: Funcionário (Restrito)", expectedOutcome: 'success' },
      { screen: 'association', fieldId: 'association_type', value: 'separated', description: "Tenta acionar 'Cliente Separado'", expectedOutcome: 'success' },
      { screen: 'association', description: "Tenta continuar e o sistema barra com erro de perfil restrito", expectedOutcome: 'failure', errorMessage: "Permissão Negada: É necessário perfil de Representante Legal para criar estabelecimentos com liquidação independente." }
    ]
  },
  {
    id: "SCENARIO_19",
    category: "Validação de Permissão e Segurança",
    title: "Análise Cadastral tributária em tempo real bloqueia o fluxo frente à Receita Federal",
    type: "failure",
    details: "Protege o TMS de fraudadores ou empresas baixadas ou declaradas inaptas. Bloqueia o cadastro preventivamente para investigações.",
    given: [
      "Dado que o estabelecimento 'Padaria Santa Marcelina' está sob consulta cadastral de CNPJ '12.345.678/0001-23'"
    ],
    when: [
      "Quando a Receita Federal reporta no webhook de integração retorno cadastral de situação 'Inapto' ou 'Baixado'"
    ],
    then: [
      "Então a tela de revisão exibe um banner vermelho de restrição 'Cadastro Inapto na Receita Federal'",
      "E o botão continuar vira cinza com impossibilidade permanente de avanço",
      "E grava um ticket imediato na central de Compliance para análise antifraude."
    ],
    simulatorActions: [
      { screen: 'confirmation_dados', description: "Receita Federal responde como 'Inapto/Suspenso'", expectedOutcome: 'success' },
      { screen: 'confirmation_dados', description: "Fluxo travado por irregularidade regulatória grave", expectedOutcome: 'failure', errorMessage: "Situação Cadastral Irregular junto à Receita Federal. O cadastro foi enviado para auditoria de compliance da TMS." }
    ]
  },
  {
    id: "SCENARIO_20",
    category: "Validação de Permissão e Segurança",
    title: "Prevenção de perda de alteração ao pressionar voltar voluntariamente",
    type: "success",
    details: "Evita que preenchimentos lógicos cansativos do formulário de associação se percam por toques casuais no botão de retrocesso das telas nativas do dispositivo.",
    given: [
      "Dado que o usuário customizou e selecionou o modelo 'Cliente Vinculado'"
    ],
    when: [
      "Quando clica no botão voltar (flecha superior esquerda) sem ter completado a submissão"
    ],
    then: [
      "Então o sistema exibe um alerta de dupla checagem: 'Deseja sair? Sua opção selecionada será perdida'",
      "E caso confirme, volta à tela de login descartando o rascunho em memória local."
    ],
    simulatorActions: [
      { screen: 'association', fieldId: 'association_type', value: 'linked', description: "Personaliza escolha com modelo vinculado", expectedOutcome: 'success' },
      { screen: 'association', description: "Clica na seta Retornar no TopAppBar antes de salvar", expectedOutcome: 'failure', errorMessage: "Confirma Desistir? Os ajustes feitos nessa sessão serão esquecidos." }
    ]
  },
  {
    id: "SCENARIO_21",
    category: "Autenticação (Login)",
    title: "Senha menor que o limite mínimo de 6 caracteres é rejeitada",
    type: "failure",
    details: "Garante que a senha informada respeite o comprimento mínimo de 6 caracteres para manter o padrão de segurança da plataforma TMS.",
    given: [
      "Dado que o usuário está na tela de autenticação 'Digite sua senha de acesso'"
    ],
    when: [
      "Quando ele tenta digitar ou preenche o campo com uma senha curta com menos de 6 caracteres ex: 'abc12'",
      "E clica no botão 'Continuar'"
    ],
    then: [
      "Então o sistema bloqueia e impede a requisição de logon",
      "E exibe uma dica visual de erro: 'Sua senha deve ter no mínimo 6 caracteres alfanuméricos.'"
    ],
    simulatorActions: [
      { screen: 'login', description: "Usuário acessa tela de autenticação", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: 'abc12', description: "Preenche com senha curta 'abc12'", expectedOutcome: 'failure', errorMessage: "Sua senha deve ter no mínimo 6 caracteres alfanuméricos." }
    ]
  },
  {
    id: "SCENARIO_22",
    category: "Autenticação (Login)",
    title: "Senha que excede o comprimento máximo limite de 20 caracteres",
    type: "failure",
    details: "Impede o transbordo de buffer de entrada na digitação limitando de forma estrita o campo de digitação 'Senha' a no máximo 20 caracteres alfanuméricos.",
    given: [
      "Dado que o usuário está digitando sua senha na tela de acesso do TMS"
    ],
    when: [
      "Quando ele de forma alfanumérica digita mais de 20 caracteres ex: 'abcd1234efgh5678ijkl9'"
    ],
    then: [
      "Então o aplicativo limita e trunca os caracteres excedentes em tempo real a exatamente 20 caracteres",
      "E exibe o aviso nas notificações: 'Comprimento máximo de 20 caracteres atingido.'"
    ],
    simulatorActions: [
      { screen: 'login', description: "Inicia digitação de senha longa alfanumérica", expectedOutcome: 'success' },
      { screen: 'login', fieldId: 'password', value: 'abcd1234efgh5678ijkl9', description: "Insere caracteres excedendo o limite de 20", expectedOutcome: 'failure', errorMessage: "Comprimento máximo de 20 caracteres atingido." }
    ]
  },
  {
    id: "SCENARIO_23",
    category: "Associação de Estabelecimentos",
    title: "Estorno automático de sessão expirada por inatividades longas",
    type: "failure",
    details: "Mecanismo preventivo de segurança financeira de dados. Se o operador de caixa ou representante legal esquecer o app aberto e inativo na tela de associação por mais de 5 minutos, a sessão é invalidada.",
    given: [
      "Dado que o usuário está autenticado na dashboard de associação do TMS",
      "E que o dispositivo permanece inativo sem nenhuma interação física por mais de 5 minutos"
    ],
    when: [
      "Quando o operador tenta tardiamente selecionar qualquer modelo de associação ou avançar o fluxo"
    ],
    then: [
      "Então o sistema destrói as credenciais de autenticação temporárias da memória local",
      "E desvia a rota do dispositivo forçadamente de volta à tela de login exibindo o alerta: 'Sessão expirada por inatividade. Faça login novamente.'"
    ],
    simulatorActions: [
      { screen: 'association', description: "Esquece o aplicativo aberto e vai almoçar", expectedOutcome: 'success' },
      { screen: 'association', description: "Tenta tocar em opções 5 minutos depois", expectedOutcome: 'failure', errorMessage: "Sessão expirada por inatividade. Faça login novamente para prosseguir." }
    ]
  },
  {
    id: "SCENARIO_24",
    category: "Verificação dos Dados da Loja",
    title: "Rejeição de município e estado com menos de dois caracteres obrigatórios",
    type: "failure",
    details: "Valida as regras de limite geográfico do banco de dados TMS para garantir integridade fiscal antes das emissões operacionais de boletos e faturamentos.",
    given: [
      "Dado que o usuário está revisando os dados da Padaria Santa Marcelina para habilitar liquidação"
    ],
    when: [
      "Quando ele tenta preencher incorretamente o campo de Estado com apenas 1 caractere ex: 'S' ou Município truncado"
    ],
    then: [
      "Então a validação de formulário acusa erro em tempo de execução",
      "E bloqueia as tentativas de submissão alertando: 'Campos de região geográfica devem conter ao menos 2 caracteres.'"
    ],
    simulatorActions: [
      { screen: 'confirmation_dados', description: "Usuário editando o formulário cadastral", expectedOutcome: 'success' },
      { screen: 'confirmation_dados', description: "Tenta salvar o Estado como 'S' e Município como 'S'", expectedOutcome: 'failure', errorMessage: "Erro de preenchimento: O campo Estado deve conter exatamente 2 caracteres UF (ex: SP)." }
    ]
  },
  {
    id: "SCENARIO_25",
    category: "Validação de Permissão e Segurança",
    title: "Associação múltipla de CNPJ a mais de um usuário permitida sem conflitos",
    type: "success",
    details: "Valida a arquitetura multi-operador e multi-representante onde o cadastro de lojas de um mesmo CNPJ pode ser associado a contas de diferentes usuários com segurança e sem restrições fiscais.",
    given: [
      "Dado que o estabelecimento 'Padaria Santa Marcelina' com CNPJ '12.345.678/0001-23' já está vinculado à conta de um Gestor de rede principal"
    ],
    when: [
      "Quando um segundo Representante Legal realiza o fluxo para associar o mesmo CNPJ à sua respectiva carteira de lojas"
    ],
    then: [
      "Então a plataforma processa a solicitação aceitando a sobreposição de acessos sem conflitos tributários",
      "E redireciona ambos operadores aos seus respectivos painéis de gestão consolidados."
    ],
    simulatorActions: [
      { screen: 'confirmation_dados', description: "Inicia a submissão final da Padaria Santa Marcelina", expectedOutcome: 'success' },
      { screen: 'login', description: "Processa a associação secundária com extremo sucesso e sem restrições.", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_26",
    category: "Associação de Estabelecimentos",
    title: "Inexistência de atalho para cadastrar novas lojas no menu suspenso de alternação",
    type: "success",
    details: "Garante que o lojista não consiga criar uma nova loja através do antigo atalho suspenso 'Alternar entre lojas', forçando o redirecionamento seguro via QRCode de Vínculo.",
    given: [
      "Dado que o lojista está logado no painel do TMS"
    ],
    when: [
      "Quando abre o menu flutuante de alternação rápida e verifica os comandos disponíveis"
    ],
    then: [
      "Então o sistema não deve exibir o botão ou link para 'Cadastrar nova loja' no atalho 'Alternar entre lojas'",
      "E mantém apenas a listagem limpa de filiais autorizadas já ativas para seleção rápida."
    ],
    simulatorActions: [
      { screen: 'login', fieldId: 'password', value: '123456', description: "Realiza o login de simulação padrão", expectedOutcome: 'success' },
      { screen: 'association', description: "Verifica que o atalho está suprimido para conformidade total", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_27",
    category: "Associação de Estabelecimentos",
    title: "Supressão do botão cadastral sob o menu Meu Negócio - Lojas",
    type: "success",
    details: "Conformidade com a nova diretriz de segurança de fluxo da TMS, removendo o botão 'Cadastrar nova loja' da seção de configurações de lojas dentro do menu Meu Negócio.",
    given: [
      "Dado que o usuário navega na seção 'Meu Negócio'",
      "E acessa a sub-página de gerenciamento de 'Lojas'"
    ],
    when: [
      "Quando a lista de filiais ativas é carregada na tela"
    ],
    then: [
      "Então a opção para inicializar abertura ou cadastro de nova loja não aparece mais em Meu Negócio > Lojas",
      "E o sistema indica que a associação deve obrigatoriamente iniciar-se via leitura de QR Code de Vínculo."
    ],
    simulatorActions: [
      { screen: 'login', fieldId: 'password', value: '123456', description: "Faz login e avança ao estado seguro de simulação", expectedOutcome: 'success' },
      { screen: 'association', description: "Confirma ausência do botão Cadastrar Nova Loja no painel", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_28",
    category: "Associação de Estabelecimentos",
    title: "Abertura automática do painel de associação após leitura de QR Code de Vínculo",
    type: "success",
    details: "Verifica que ler um QR Code de vínculo encaminha o lojista validado exatamente à tela 'Escolha como quer associar seu novo cadastro' para prosseguir as configurações táticas de saldo.",
    given: [
      "Dado que o lojista iniciou a câmera integrada do dispositivo móvel",
      "E apota para um QR Code de ativação de novo PDV ou filial"
    ],
    when: [
      "Quando realiza com sucesso a leitura do QR Code de vínculo"
    ],
    then: [
      "Então o lojista visualiza a tela 'Escolha como quer associar seu novo cadastro' preenchendo as informações contextuais da nova unidade."
    ],
    simulatorActions: [
      { screen: 'login', fieldId: 'password', value: '123456', description: "Realiza o login de ativação", expectedOutcome: 'success' },
      { screen: 'association', description: "O sistema redireciona à tela Escolha como quer associar seu novo cadastro", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_29",
    category: "Entenda a Diferença (Onboarding)",
    title: "Exibição clara de Cliente Separado e Cliente Vinculado com definições operacionais",
    type: "success",
    details: "Valida a presença obrigatória dos dois modelos de associação (Separado / Vinculado), garantindo que suas descrições sobre finanças e compartilhamento de carteira estejam plenamente visíveis.",
    given: [
      "Dado que a tela de seleção de tipo de associação 'Escolha como quer associar seu novo cadastro' está carregada"
    ],
    when: [
      "Quando o usuário revisa as opções de associação"
    ],
    then: [
      "Então as opções 'Cliente Separado' e 'Cliente Vinculado' são exibidas com suas respectivas descrições e características detalhadas."
    ],
    simulatorActions: [
      { screen: 'login', fieldId: 'password', value: '123456', description: "Realiza o logon padrão", expectedOutcome: 'success' },
      { screen: 'association', description: "Verifica e renderiza os dois modelos com destaque de descrições e checks", expectedOutcome: 'success' }
    ]
  },
  {
    id: "SCENARIO_30",
    category: "Associação de Estabelecimentos",
    title: "Disponibilidade do link Entenda a Diferença e bloqueio de prosseguimento sem seleção prévia",
    type: "success",
    details: "Garante que o link explicativo contextual esteja acessível a qualquer momento e monitora que o botão para prosseguir ('Continuar') permaneça travado enquanto nenhuma opção ('Separado' ou 'Vinculado') for selecionada.",
    given: [
      "Dado que o usuário está na tela de decisão de vínculo e associação",
      "E o link 'Entenda a diferença' está disponível na tela para suporte"
    ],
    when: [
      "Quando o usuário tenta avançar sem selecionar nenhuma opção de vinculação"
    ],
    then: [
      "Então o botão 'Continuar' só é habilitado após a seleção de uma das opções 'Cliente Separado' ou 'Cliente Vinculado'."
    ],
    simulatorActions: [
      { screen: 'login', fieldId: 'password', value: '123456', description: "Realiza a autenticação inicial", expectedOutcome: 'success' },
      { screen: 'association', description: "Testa que o botão Continuar de associação de estabelecimentos permanece desativado até selecionar", expectedOutcome: 'success' }
    ]
  }
];
