# language: pt
# encoding: utf-8

Funcionalidade: Jornada de Entrada e Associação de Estabelecimentos - TMS
  Como um parceiro ou administrador de estabelecimento comercial,
  Eu quero me autenticar com segurança, ler as diferenças entre os formatos e associar meu novo cadastro (Cliente Separado ou Vinculado),
  Para que eu possa gerenciar minhas contas de liquidação bancária e operar de acordo com as permissões da minha conta.

  # =========================================================================
  # MÓDULO 1: AUTENTICAÇÃO (LOGIN)
  # =========================================================================

  Cenário: Senha de acesso válida ativa fluxo principal
    Dado que o usuário está na tela de autenticação 'Digite sua senha de acesso'
    E que a conta de acesso correspondente está ativa no sistema
    Quando ele preenche o campo de texto 'Senha' com a senha de acesso válida '123456'
    E clica no botão 'Continuar'
    Então o sistema autoriza o acesso no servidor de autenticação
    E o usuário é redirecionado imediatamente para a tela de 'Escolha de associação' com o perfil carregado com sucesso.

  Cenário: Desabilitação do botão continuar com campo de senha vazio
    Dado que o usuário está na tela de senha do TMS
    Quando o campo de digitação 'Senha' estiver totalmente vazio
    Então o botão de ação principal 'Continuar' deve permanecer bloqueado em estado visual cinza desabilitado
    E qualquer tentativa de clique ou envio não deve disparar nenhuma requisição ou erro de API.

  Cenário: Exibição de alerta visual ao digitar senha incorreta
    Dado que o usuário está na tela de acesso do TMS
    E possui uma conta ativa
    Quando insere uma senha incorreta ex: '999999' no campo 'Senha'
    E clica no botão 'Continuar'
    Então o sistema impede o logon
    E exibe uma mensagem de falha abaixo ou acima do campo: 'Senha incorreta. Tente novamente.'
    E limpa o campo ou realça a borda em vermelho (cor de erro).

  Cenário: Bloqueio de conta após múltiplas tentativas falhas consecutivas
    Dado que o usuário está tentando realizar login no sistema
    E que ele já efetuou anteriormente 4 tentativas de login incorretas consecutivas
    Quando ele realiza a 5ª tentativa de login fornecendo senha inválida
    Então o sistema deve bloquear temporariamente a conta de acesso por 15 minutos
    E exibir um modal ou alerta explicativo: 'Acesso bloqueado temporariamente por excesso de tentativas.'
    E orientar o usuário a utilizar o fluxo de recuperação no botão 'Esqueceu sua senha?'.

  Cenário: Alternar exibição invisível para texto visível
    Dado que o usuário está digitando sua senha privadamente no formulário
    Quando ele clica sobre o botão de olho 'revelar senha' localizado à direita interna do input
    Então o campo de input altera seu tipo técnico de 'password' para 'text'
    E os caracteres são revelados legivelmente na tela
    E o ícone gráfico do olho muda para indicar que o próximo clique re-ocultará os dígitos.


  # =========================================================================
  # MÓDULO 2: ENTENDA A DIFERENÇA (ONBOARDING)
  # =========================================================================

  Cenário: Navegação avançando pelas orientações do carrossel
    Dado que o usuário abriu a ajuda explicativa 'Entenda a diferença'
    E que está visualizando o Slide 1 (exibindo ilustração com mapa)
    Quando clica no botão ativo laranja 'Próximo ->'
    Então o carrossel realiza a transição para o Slide 2 explicativo de texto detalhado
    E altera o carimbo visual de paginação abaixo do conteúdo (indicando a segunda barra ativada).

  Cenário: Retorno pelas orientações usando cabeçalho voltar
    Dado que o usuário está na ajuda explicativa visualizando o Slide 2 detalhado
    Quando ele clica no botão de flecha de voltar 'arrow_back' presente no cabeçalho superior
    Então a visualização desliza de volta para o conteúdo inicial do Slide 1 de onboarding
    E as referências de progresso são re-associadas ao ponto inicial.

  Cenário: Conclusão do onboarding direcionará à seleção
    Dado que o usuário está analisando os tópicos de saldo e liquidação no Slide 2 do tutorial
    Quando clica no botão laranja com rótulo 'Entendi' na parte inferior da tela
    Então o onboarding deve ser fechado com suavidade
    E o usuário retorna para a tela de escolhas onde 'Cliente Separado' ou 'Cliente Vinculado' podem ser selecionados para continuar.


  # =========================================================================
  # MÓDULO 3: ESCOLHA DE ASSOCIAÇÃO
  # =========================================================================

  Cenário: Seleção do modelo Cliente Separado destaca os benefícios de gestão independente
    Dado que o usuário está na tela de escolha de associação do novo cadastro
    Quando ele clica sobre o bloco de seleção 'Cliente Separado'
    Então a borda do cartão de 'Cliente Separado' muda para uma borda laranja espessa com sombra de destaque
    E surge o indicador de marcação (radio) ativado
    E o botão continuar inferior de ação transiciona de desabilitado (cinza) para habilitado (Laranja ativo).

  Cenário: Seleção do modelo Cliente Vinculado destaca centralização operacional
    Dado que o usuário está na tela de opções de tipo de associação do TMS
    Quando ele clica sobre o bloco de seleção 'Cliente Vinculado'
    Then o card 'Cliente Vinculado' é realçado com preenchimento sutil de tintura e bordas laranja ativo
    E o card 'Cliente Separado' volta para o estilo passivo não marcado
    E o botão continuar é validado para prosseguir.

  Cenário: Tentativa de seguir sem escolha do tipo de associação
    Dado que o usuário ainda não tocou em nenhum dos cartões de associação
    Quando tenta acionar o botão de navegação 'Continuar' no rodapé
    Então o sistema impede a mudança de tela permanecendo na mesma etapa
    E exibe uma notificação do tipo tooltip ou modal sutil persistindo: 'Por favor, selecione uma das opções acima para continuar'.

  Cenário: Acessar ajuda explicativa contextual na tomada de decisão
    Dado que o usuário está indeciso na tela de opções de associação
    Quando clica no botão de texto centralizado 'Entenda a diferença' com ícone de chevron_right
    Então a tela de onboarding com o fluxo explicativo é aberta para instruir o tomador de decisão.

  Cenário: Abandonar o fluxo de associação voluntariamente
    Dado que o usuário está no seletor de associação do novo estabelecimento
    Quando clica em 'Cancelar' localizado no ponto mais baixo do formulário
    Então o sistema exibe um modal de cancelamento perguntando se ele deseja descartar os passos para cadastrar
    E ao consentir, retorna-o para o dashboard inicial do TMS limpando dados temporários.


  # =========================================================================
  # MÓDULO 4: VERIFICAÇÃO DE DADOS
  # =========================================================================

  Cenário: Apresentação de dados preenchidos e válidos para estabelecimento
    Dado que o usuário escolheu uma opção válida e avançou para a revisão
    E que o estabelecimento está cadastrado sob a Razão Social 'Padaria Santa Marcelina'
    Quando a tela 'Confira os dados da sua loja' é renderizada
    Então o usuário deve visualizar em formato de texto legível os campos corretos prepopulados de CEP '87720-170', Logradouro 'Rua São João, 234', Bairro 'Jordão', Município 'São Paulo' e Estado 'SP'
    E a informação de 'Faturamento informado' deve estar descrita de forma consistente na parte inferior.

  Cenário: Sufocação de avanço lógico por inconsistência extrema nos dados cadastrais
    Dado que o usuário está na tela de confirmação de dados
    E que os registros de Município ou Estado retornaram em branco devido a inconsistência de CEP inválido
    Quando ele clica de modo obstinado em 'Continuar'
    Então o sistema impede a transação indicando em tela: 'Dados fiscais ausentes ou corrompidos. Solicite revisão cadastral.'
    E bloqueia o envio remoto de dados.

  Cenário: Vinculação de estabelecimento enviada com extremo sucesso
    Dado que todos os dados cadastrais da 'Padaria Santa Marcelina' coincidem perfeitamente com os oficiais
    E estão completos e revisados
    Quando o usuário pressiona o botão de chamada de alta visibilidade 'Continuar' no fim da tela
    Então o aplicativo envia as credenciais de associação fiscal para a API central
    E renderiza com sucesso uma animação de conclusão
    E redireciona para a tela de boas vindas com a mensagem: 'Padaria Santa Marcelina associada com sucesso!'.


  # =========================================================================
  # MÓDULO 5: VALIDAÇÕES DE PERMISSÕES E SEGURANÇA (NEGÓCIO)
  # =========================================================================

  Cenário: Permissão de Perfil Representante Legal autoriza a criação do modelo Cliente Separado
    Dado que o usuário realizou autenticação com perfil de 'Representante Legal' via CPF
    E está na tela de configuração de cadastro do TMS
    Quando tenta marcar 'Cliente Separado' e submete a transição com clique em 'Continuar'
    Então o formulário não exige duplo fator regulatório adicional
    E prossegue direto para a tela de revisão de dados cadastrais autorizando a abertura de nova liquidação de saldo.

  Cenário: Permissão de Funcionário bloqueada para criação de conta de liquidação própria
    Dado que o usuário está autenticado com o perfil de 'Funcionário' via CPF sem autonomia financeira
    Quando ele seleciona 'Cliente Separado' e tenta avançar clicando em 'Continuar'
    Então a mudança de tela é abortada de imediato por falta de privilégio na chave do Representative
    E exibe-se um modal vermelho impeditivo: 'Permissão Negada: É necessário perfil de Representante Legal para criar estabelecimentos independentes.'

  Cenário: Análise Cadastral tributária em tempo real bloqueia o fluxo frente à Receita Federal
    Dado que o estabelecimento 'Padaria Santa Marcelina' está sob consulta cadastral de CNPJ '12.345.678/0001-23'
    Quando a Receita Federal reporta no webhook de integração retorno cadastral de situação 'Inapto' ou 'Baixado'
    Então a tela de revisão exibe um banner vermelho de restrição 'Cadastro Inapto na Receita Federal'
    E o botão continuar vira cinza com impossibilidade permanente de avanço
    E grava um ticket imediato na central de Compliance para análise antifraude.

  Cenário: Prevenção de perda de alteração ao pressionar voltar voluntariamente
    Dado que o usuário customizou e selecionou o modelo 'Cliente Vinculado'
    Quando clica no botão voltar (flecha superior esquerda) sem ter completado a submissão
    Então o sistema exibe um alerta de dupla checagem: 'Deseja sair? Sua opção selecionada será perdida'
    E caso confirme, volta à tela de login descartando o rascunho em memória local.

  Cenário: Senha menor que o limite mínimo de 6 caracteres é rejeitada
    Dado que o usuário está na tela de autenticação 'Digite sua senha de acesso'
    Quando ele tenta digitar ou preenche o campo com uma senha curta com menos de 6 caracteres ex: 'abc12'
    E clica no botão 'Continuar'
    Então o sistema bloqueia e impede a requisição de logon
    E exibe uma dica visual de erro: 'Sua senha deve ter no mínimo 6 caracteres alfanuméricos.'

  Cenário: Senha que excede o comprimento máximo limite de 20 caracteres
    Dado que o usuário está digitando sua senha na tela de acesso do TMS
    Quando ele de forma alfanumérica digita mais de 20 caracteres ex: 'abcd1234efgh5678ijkl9'
    Então o aplicativo limita e trunca os caracteres excedentes em tempo real a exatamente 20 caracteres
    E exibe o aviso nas notificações: 'Comprimento máximo de 20 caracteres atingido.'

  Cenário: Indisponibilidade do integrador externo de endereços (API de CEP offline)
    Dado que o usuário está na revisão cadastral de conferência do estabelecimento
    E que o barramento de consulta web de CEP externo encontra-se offline ou inacessível no momento
    Quando ele digita um CEP no campo e exige a busca automática de dados
    Então o aplicativo sinaliza com alerta laranja 'Serviço de CEP indisponível. Preencha manualmente'
    E destrava as edições manuais dos campos de Município e Estado para que a transação não fique travada.

  Cenário: Estorno automático de sessão expirada por inatividades longas
    Dado que o usuário está autenticado na dashboard de associação do TMS
    E que o dispositivo permanece inativo sem nenhuma interação física por mais de 5 minutos
    Quando o operador tenta tardiamente selecionar qualquer modelo de associação ou avançar o fluxo
    Então o sistema destrói as credenciais de autenticação temporárias da memória local
    E desvia a rota do dispositivo forçadamente de volta à tela de login exibindo o alerta: 'Sessão expirada por inatividade. Faça login novamente.'

  Cenário: Rejeição de município e estado com menos de dois caracteres obrigatórios
    Dado que o usuário está revisando os dados da Padaria Santa Marcelina para habilitar liquidação
    Quando ele tenta preencher incorretamente o campo de Estado com apenas 1 caractere ex: 'S' ou Município truncado
    Então a validação de formulário acusa erro em tempo de execução
    E bloqueia as tentativas de submissão alertando: 'Campos de região geográfica devem conter ao menos 2 caracteres.'

  Cenário: Associação múltipla de CNPJ a mais de um usuário permitida sem conflitos
    Dado que o estabelecimento 'Padaria Santa Marcelina' com CNPJ '12.345.678/0001-23' já está vinculado à conta de um Gestor de rede principal
    Quando um segundo Administrador realiza o fluxo para associar o mesmo CNPJ à sua respectiva carteira de lojas
    Então a plataforma processa a solicitação aceitando a sobreposição de acessos sem conflitos tributários
    E redireciona ambos operadores aos seus respectivos painéis de gestão consolidados.

  Cenário: Inexistência de atalho para cadastrar novas lojas no menu suspenso de alternação
    Dado que o lojista está logado no painel do TMS
    Quando abre o menu flutuante de alternação rápida e verifica os comandos disponíveis
    Então o sistema não deve exibir o botão ou link para 'Cadastrar nova loja' no atalho 'Alternar entre lojas'
    E mantém apenas a listagem limpa de filiais autorizadas já ativas para seleção rápida.

  Cenário: Supressão do botão cadastral sob o menu Meu Negócio - Lojas
    Dado que o usuário navega na seção 'Meu Negócio'
    E acessa a sub-página de gerenciamento de 'Lojas'
    Quando a lista de filiais ativas é carregada na tela
    Então a opção para inicializar abertura ou cadastro de nova loja não aparece mais em Meu Negócio > Lojas
    E o sistema indica que a associação deve obrigatoriamente iniciar-se via leitura de QR Code de Vínculo.

  Cenário: Abertura automática do painel de associação após leitura de QR Code de Vínculo
    Dado que o lojista iniciou a câmera integrada do dispositivo móvel
    E apota para um QR Code de ativação de novo PDV ou filial
    Quando realiza com sucesso a leitura do QR Code de vínculo
    Então o lojista visualiza a tela 'Escolha como quer associar seu novo cadastro' preenchendo as informações contextuais da nova unidade.

  Cenário: Exibição clara de Cliente Separado e Cliente Vinculado com definições operacionais
    Dado que a tela de seleção de tipo de associação 'Escolha como quer associar seu novo cadastro' está carregada
    Quando o usuário revisa as opções de associação
    Então as opções 'Cliente Separado' e 'Cliente Vinculado' são exibidas com suas respectivas descrições e características detalhadas.

  Cenário: Disponibilidade do link Entenda a Diferença e bloqueio de prosseguimento sem seleção prévia
    Dado que o usuário está na tela de decisão de vínculo e associação
    E o link 'Entenda a diferença' está disponível na tela para suporte
    Quando o usuário tenta avançar sem selecionar nenhuma opção de vinculação
    Então o botão 'Continuar' só é habilitado após a seleção de uma das opções 'Cliente Separado' ou 'Cliente Vinculado'.


