# Centro de Execução QA TMS - Documentação do Projeto

Este projeto consiste em um integrador e simulador interativo de testes baseados no **Robot Framework** utilizando a sintaxe **BDD Gherkin**, com persistência de logs e estados em um banco de dados relacional **SQLite local** virtualizado.

Abaixo seguem detalhadas todas as regras implementadas, decisões de arquitetura e modificações realizadas.

---

## 🛠️ Regras de Parsing e Sintaxe Robot/Gherkin

O carregador dinâmico de características (`src/utils/featureLoader.ts`) foi personalizado para ler as diretivas do Robot Framework de forma nativa e precisa, respeitando as seguintes especificações:

1. **Detecção Flexível de Cenários**:
   - Os cenários podem começar com prefixos padrões como `Scenario:`, `Cenário:`, `Cenario:`, `Scenario Outline:` ou `Esquema do Cenário:`.
   - Podem possuir ou não o caractere `:` explícito ou oculto (ex: `Scenario: CT01 Teste Positivo` versus `Cenário CT01 Teste Positivo`).

2. **Diretiva de Pulo (`Skip` / `[Setup]` / `[Teardown]`)**:
   - Mapeamento nativo da diretiva `Skip` do Robot Framework (ex: `Skip    msg=Mensagem explicativa...`).
   - Quando um teste possui a declaração `Skip`, o simulador executa o teste com o status `SKIP`, registrando a respectiva mensagem explicativa de pulo e marcando todos os passos internos deste cenário como ignorados (`SKIP`) no banco SQLite.

3. **Mapeamento de Metadados e Tags**:
   - Extração automática de metadados declarados nas diretivas `[Tags]` e `[Documentation]`.
   - Limpeza e extração em tempo real de tags do Robot para uso no dropdown de filtros rápidos no terminal.

4. **Identificação Dinâmica de Passos (BDD e Keywords Robot)**:
   - Identificação precisa de passos iniciados com keywords BDD tradicionais (`Dado`, `E`, `Quando`, `Então`, `Mas`, `Given`, `When`, `Then`, `And`, `But`).
   - Identificação de ações puras recuadas com espaços ou tabulações, mapeando-as de forma segura como passos auxiliares adicionais (`AND`).

---

## 📥 Mecanismo de Upload e Sincronização

Implementamos uma gestão limpa do estado ao importar novos arquivos de testes `.feature`, `.txt` ou `.robot`:

1. **Limpeza Completa do Estado Anterior**:
   - Sempre que o usuário realiza o upload ou arrasta um novo arquivo para a workspace, os cenários vigentes são totalmente limpos e limítrofes ao novo arquivo.
   - A lista de tags de execução é limpa e reconstruída do zero a partir do novo arquivo, evitando contaminação por tags de arquivos prévios.

2. **Auto-seleção de Tags**:
   - Se novas tags válidas forem encontradas, o sistema auto-seleciona a primeira tag encontrada e reconfigura o seletor correspondente, emitindo um log de sucesso no console virtual.
   - Caso nenhuma tag seja encontrada, o sistema define como padrão a classe unilar `@all_scenarios (Suite Completa)`.

3. **Status de Execução Inicial**:
   - Ao importar ou salvar uma nova especificação `.feature` (ou arquivo `.robot`, `.txt`), o status de execução de cada cenário é inicializado estritamente como **`Not executed`**, tendo em vista que os mesmos ainda não foram processados.
   - Esse status neutro permanecerá visível em cada cartão até que uma execução pontual de teste ("Execução") ou a execução completa ("Executar Feature") seja efetivada, momento em que o status será atualizado dinamicamente para os resultados de tempo de execução real (**`PASS`**, **`FAIL`** de erro ou **`SKIP`**).

---

## 🚀 Modos de Execução de Testes (Novo)

O simulador suporta dois fluxos distintos de execução de maneira transparente e intuitiva para o operador de QA:

1. **Botão "Execução" (Execução de Cenário Único)**:
   - Localizado individualmente no rodapé de cada cartão de teste na árvore da workspace.
   - Quando acionado, ele extrai a tag identificadora primária do cenário (ou `@all_scenarios` se vazio) e chama o executor de forma focada.
   - Redireciona o usuário para a aba de **Console Terminal** de forma instantânea.
   - **Simulação Focada**: Executa **apenas** aquele cenário selecionado específico (ignora quaisquer outros listados no arquivo).
   - Registra o comando de execução correspondente em formato Robot no terminal: E.g., `robot --include RCT01 ./`.

2. **Botão "Executar Feature" (Execução Completa)**:
   - Localizado de forma evidente no cabeçalho de controle do terminal virtual.
   - Quando acionado, limpa filtros momentâneos e realiza a simulação de execução de **todos os cenários** contidos no arquivo atual de forma sequencial.
   - Exibe o comando canônico Robot padrão: `python -m robot -A args.txt ... ./`.

### 🧩 Regra de Singular vs. Plural na Tela TMS (Gestão de Testes)

Na tela do **Sistema de Gestão de Testes (TMS)** existem dois botões de execução cuja semântica é definida estritamente pelo número (singular/plural). Esta distinção é **obrigatória** e não deve ser confundida nem alterada:

1. **Botão "Executar Teste Automatizado" (SINGULAR = um único teste)**:
   - Localizado no rodapé do **painel de detalhes do caso de teste selecionado** (lado direito).
   - Executa **somente o teste selecionado** (o caso aberto no detalhe), e nenhum outro.
   - Implementado por `handleLoadTestCaseToWorkspace(currentCase.id)` em `src/App.tsx`.
   - ⚠️ **Não alterar** o escopo deste botão para múltiplos casos. Singular = unitário.

2. **Botão "Executar Testes" (PLURAL = todos os testes da feature)**:
   - Localizado no rodapé da **lista de casos de teste** (ao lado de "Criar Caso").
   - Executa **todos os casos da pasta/feature selecionada** (`selectedSphereFolder`); com "Todas as Pastas" ativo, executa a suíte completa.
   - O **filtro de busca** afeta apenas a lista exibida; **não** restringe a execução.
   - Implementado por `handleLoadMultipleTestCasesToWorkspace(folderCases)` em `src/App.tsx`.

> Mnemônico: **singular ("Teste") = um só (o selecionado)**; **plural ("Testes") = todos (da feature)**. Qualquer alteração futura deve preservar essa regra e ficar restrita ao botão correspondente, sem afetar o outro.

---

## 🎨 Padrão Visual de Bordas de Botões (UI)

Regra obrigatória de UI para **todos os botões** da plataforma, para manter consistência visual:

1. **Borda clara em repouso, mais forte ao interagir/selecionar**:
   - Estado padrão (não selecionado/sem hover): borda **clara/suave** (ex.: `border-slate-200` no tema claro, `border-slate-800` no tema escuro).
   - Estado de hover/foco/selecionado: borda **mais forte/destacada** (ex.: `hover:border-sky-400`, `hover:border-blue-500`, `hover:border-sky-500`).
   - ⚠️ Nunca deixar um botão com borda escura/forte por padrão quando ele não está selecionado.

2. **Proibido usar tons inexistentes do Tailwind**:
   - Use **apenas** os tons válidos da escala (`50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`).
   - Valores como `slate-150`, `slate-205`, `slate-250`, `slate-705`, `slate-750` **não existem**. Classes inválidas são ignoradas e, no caso de `border`, a cor cai para o `currentColor` (escuro), quebrando a regra acima.
   - Sempre arredonde para o tom válido mais próximo (ex.: `slate-250` → `slate-200`; `slate-750` → `slate-700`).

> Referência de padrão correto: o botão "Voltar" e o seletor de idioma do shell (`border-slate-200 hover:border-blue-500` / `border-slate-800 hover:border-sky-500`).

---

## ⚙️ Menu de Configuração & Controle de Simulação (Novo)

Para centralizar ações administrativas e calibração de performance de QA, implementamos um sofisticado **Menu de Configuração** suspenso a partir do botão com ícone de engrenagem no cabeçalho principal:

1. **Controle de Velocidade de Simulação**:
   - Ajustável via controle deslizante (*slider*) que calibra a velocidade dos tempos de espera do simulador (`waitMs`) em tempo real.
   - Oferece modos que vão desde **0.5x (Modo Depuração)** para facilitar a análise visual microscópica de logs complexos até **3.0x (Modo Turbo)** para processamento instantâneo.

2. **Administração Centralizada do SQLite (Reset DB)**:
   - O botão de **Reset DB** foi removido de forma definitiva do topo do menu principal para evitar acionamentos acidentais durante a rotina do QA.
   - Agora reside exclusivamente no card de Administração de Dados dentro do Painel de Configurações, onde limpa o histórico completo de execuções virtuais e restabelece a calibragem de seed de demonstração padrão do banco relacional de forma segura e contextualizada.

---

## 🗄️ Estrutura de Logs e Relacional SQLite

Cada simulação aciona eventos analíticos estruturados que alimentam um banco SQLite persistido no navegador:

* **Tabela `executions`**: Salva a data, comando exato utilizado, duração total cumulativa da execução, contagem de testes aprovados, reprovados e ignorados, e o caminho simulado do arquivo de relatório XML gerado em `%ROBOT_HOME%/results/`.
* **Tabela `test_cases`**: Relação de cada cenário executado, contendo seu status (`PASS`, `FAIL`, `SKIP`), duração interna individual e categoria.
* **Tabela `steps`**: Registro persistente microscópico de cada passo Gherkin individual e seu status correspondente na thread de execução.

Todas essas tabelas podem ser analisadas e manipuladas em tempo real na aba **Navegador SQLite** (Histórico de Execução Remoto) através de consultas SQL manuais (DQL/DML) ou consultas padronizadas de monitoramento.

### 🌐 Sincronização em Tempo Real (Multi-Abas)
Quando o **Histórico de Execução Remoto** ou os **Relatórios** são abertos em abas ou janelas secundárias separadas do navegador, o sistema utiliza o canônico barramento de eventos `StorageEvent` do HTML5. Assim, ao ser disparada qualquer execução de teste ou de feature na aba principal do Terminal, todas as demais abas abertas sincronizam-se instantaneamente em tempo real. Isso atualiza de imediato as contagens das tabelas em cache, as métricas e o playground analítico de consultas SQL de modo totalmente automatizado e consistente.

---

## 📊 Exportação Avançada para Planilha Excel (.xlsx) (Novo)

O Centro de Execução QA TMS agora conta com um mecanismo sofisticado e nativo de geração de relatórios no formato **Microsoft Excel (.xlsx)** utilizando a biblioteca `ExcelJS`. O arquivo exportado é gerado com alta fidelidade visual de design e padronização corporativa:

1. **Estrutura Multi-Abas por Feature / Caso de Teste**:
   - **📊 Resumo Executivo**: Uma aba inicial sem linhas de grade, contendo cartões KPI executivos (Total de Casos, Módulos/Features, Método de Automação) e uma tabela de cobertura consolidada, listando de forma analítica a quantidade de cenários por pasta física com suas respectivas cores de destaque.
   - **📋 Matriz Geral de Testes**: Uma aba unificada contendo todos os casos de testes cadastrados no sistema com filtragem automática ativada no Excel (`autoFilter`).
   - **📂 Abas Específicas por Feature**: O sistema separa dinamicamente todos os casos de teste por pasta/feature de origem física e gera abas independentes (ex: `📂 Recarga_Transporte`), estilizadas com cabeçalhos Navy escuros distintos para facilitar a inspeção segmentada pelo time de desenvolvimento ou analistas seniores.

2. **Novos Campos e Enriquecimento Técnico**:
   - **Severidade** e **Criticidade**: Novas colunas mapeadas com níveis de criticidade e severidade (`Critical`, `High`, `Medium`, `Low`). O Excel exibe as células com preenchimento em formato de pílula colorida suave e fontes personalizadas em conformidade com as diretrizes visuais.
   - **Evidência Link**: Coluna convertida em links reais e interativos (`hyperlink` nativo Excel) apontando para o SharePoint corporativo (`https://sharepoint.grupocard.local/...`), facilitando o clique direto de dentro do visualizador do Excel.
   - **Teste Automatizado?**: Campo predefinido como `Sim`.
   - **Complexidade para Automatizar?**: Sistema de inteligência no exportador que preenche um texto robusto detalhando os motivos de complexidade para o desenvolvedor (ex: ausência de IDs, problemas de assincronismo, preparação de massa dinâmica via SQLite).
   - **Observação**: Informativo complementar para as equipes de sustentação (ex: *"Os ajustes serão feitos numa segunda fase de melhorias."*).

3. **Validação de Dados e Dropdowns Interativos**:
   - As colunas **Severidade**, **Criticidade** e **Teste Automatizado?** contêm regras de validação de dados nativas (`dataValidation`). Caso o usuário tente alterar os dados diretamente no Excel mais moderno, ele deparará com dropdowns suspensos em célula para selecionar os valores válidos (`Critical,High,Medium,Low` e `Sim,Não`), garantindo integridade dos dados mesmo fora da plataforma.

---

## 🌐 Suporte Bilíngue Global (PT-BR / EN-US) (Novo)

O Centro de Execução QA TMS foi inteiramente internacionalizado para oferecer suporte instantâneo entre **Português (PT)** e **Inglês (EN)**, estendendo a tradução sistemática para todos os elementos:

1. **Cabeçalhos e Barra de Status Superior**:
   - O título, subtítulos, tags de conexão ao banco de dados (`CONECTADO` / `CONNECTED`) e botões de navegação sincronizam seu idioma em tempo real ao selecionar a chave de internacionalização no menu superior.
   - **Regra de Indicador Único de Conexão**: A barra de status superior possui estritamente **apenas um único** botão indicador de conexão física ativa (`DB: CONECTADO` / `DB: CONNECTED`) com um marcador LED verde estável, sendo expressamente proibido duplicar este indicador ou possuir botões adicionais redundantes como `Banco: CONECTADO`.

2. **Console e Logs do Terminal**:
   - Mensagens de console vazio ("Empty Execution Console") e botões utilitários de limpeza automática sincronizam instantaneamente com o idioma ativo.

3. **Argumentos do Robot Framework**:
   - O painel de compilação dinâmica de argumentos (como "Tag de Execução", "Arquivo de Configuração", e "Comando Final Compilado") está 100% traduzido para prover legibilidade a equipes globais de engenharia de software QA.

4. **Emulador e Device Virtual (TMS Device)**:
   - Todas as telas internas do fluxo de onboarding e simulação (tela de login, fluxo de associação de cliente, dicas visuais sequenciais e revisão final de dados de faturamento/endereço) foram traduzidas dinamicamente utilizando a função de localização em tempo real, sem prejudicar o mecanismo de simulações do Robot Framework.

---

## 🏷️ Padronização de Nomenclaturas e Status de Execução (Novo)

Para aprimorar a maturidade do sistema de monitoramento de testes baseados em Robot Framework, implementamos uma nova estrutura de rótulos visuais para os status de execução do ciclo de vida dos testes, substituindo a notação técnica anterior "PASS" por uma linguagem mais executiva e amigável ("Passed"):

1. **Rótulos dos Status do Ciclo de Vida**:
   - **Not Started / Não Iniciado** (anteriormente *Not executed*): Casos de teste escritos, carregados, mas que ainda não foram executados na suíte de testes.
   - **In Progress / Em Progresso**: Indica que o cenário ou teste está em execução ativa no momento pelo simulador robot virtualizado.
   - **Passed / Aprovado** (anteriormente *PASS*): Indica o sucesso completo da suíte de teste, em que todos os passos atenderam às expectativas simuladas.
   - **Failed / Falhou** (anteriormente *FAIL*): O teste foi processado, porém um ou mais passos falharam em atender às validações automatizadas.
   - **Blocked / Bloqueado**: Indica bloqueio de prosseguimento de testes por fator externo impeditivo (como dependências quebradas ou inconsistência no SQLite local).
   - **Skipped / Ignorado** (anteriormente *SKIP*): Declaração explícita de pulo de cenário ou flag configurada ativamente pelo operador QA.

2. **Personalização de Botões e Telas**:
   - O texto do botão na tela de filtro de lote do workspace principal foi alterado de `"Run Automated Test"` para `"Run Automated Tests"` de forma isolada, preservando os identificadores e strings de testes focados em lote singular em outras telas secundárias.
   - Toda a interface visual, incluindo o histórico de execução SQLite remoto e o terminal integrado, agora reflete a substituição corporativa do antigo status "PASS" pelo rótulo formal "Passed".

3. **Restrições de Validação no Relatório Excel (.xlsx)**:
   - A biblioteca de geração de relatórios `ExcelJS` foi atualizada de forma congruente. A regra de validação em célula (`dataValidation`) agora aceita estritamente a lista de valores válidos e atualizados `Passed,Skipped,Failed,Blocked` em vez do formato anterior.

---

## 📑 Tela de Relatórios (Reports) e Exportação em PDF (Novo)

A área de **Relatórios de Execução** (`src/components/ExecutionReports.tsx`) ganhou uma página própria via roteamento real do App Router e um exportador de PDF dedicado (`src/utils/pdfExporter.ts`, função `handleExportExecutionReportToPDF`) que espelha fielmente o layout exibido em tela.

1. **Rota Própria por Feature (App Router)**:
   - A antiga navegação por query param (`/?tab=reports`) foi promovida a uma rota dedicada **`/reports`** (assim como `/terminal`, `/sqlite` e `/tms`), reutilizando o shell do App.
   - Um `middleware.ts` mantém compatibilidade, redirecionando `/` e `/?tab=x` para a rota correspondente `/x`.

2. **Identidade Visual e Conteúdo do Cabeçalho**:
   - O texto **"ALLURE 3 DEMO PORTAL" foi removido** definitivamente da tela de relatórios.
   - O foco de execução passou a ser exibido como **`Feature: <nome_da_feature>`** (sem o prefixo `@`), sempre derivado do nome da feature — substituindo o antigo formato `Foco na Tag: @login_tests`.

3. **Botão "Exportar PDF" (Relatório de Execução)**:
   - Adicionado no cabeçalho do detalhe do relatório, acionando `handleExportExecutionReportToPDF`.
   - O PDF reproduz **exatamente** o layout escuro da tela: hero com badge de status, `Feature: ...`, data, comando Robot, **gauge donut multi-segmento** (verde Aprovado → vermelho Falho → âmbar Ignorado, espelhando o `conic-gradient`), cartões KPI (Total, Failed, Broken, Passed, Skipped) e a árvore de cenários.
   - **Glifos vetoriais**: como as fontes padrão do `jsPDF` não possuem `✔`/`✖`, os ícones circulares de status (passos e casos) e as marcas dos chips são **desenhados vetorialmente** para preservar a fidelidade visual.

4. **Árvore de Cenários no PDF (paridade com a tela)**:
   - Cabeçalho `Gherkin Workspace Syntax: <arquivo>.feature`, linha `Environment: "ubuntu-latest"` com **barra de proporção segmentada**, faixa de categoria `[Categoria]` com `N cenários` e **chips coloridos** de contagem (aprovados/falhos/ignorados).
   - Cada caso: ícone circular de status à esquerda, badge de ID, `(BDD scenario)`, nome em negrito, duração e indicador de passos.
   - Passos: ícone de status + **badge de keyword** tingido (`GIVEN` azul, `WHEN` âmbar, `THEN` verde, `AND` cinza) + texto entre aspas + valor à direita (`65ms` / `FAIL` / `SKIP`). Quando não há passos, exibe a mensagem idêntica à da tela.

5. **Regra de Layout — Detalhamento Limpo dos Testes**:
   - O rótulo **"Test Step Execution Tracer (Virtual SQLite Logs)"** foi **removido** tanto da tela quanto do PDF; o detalhamento dos passos não deve exibir esse cabeçalho.
   - Deve haver **espaçamento vertical confortável** entre o nome do caso de teste e o bloco de detalhamento (passos), evitando que fiquem colados.
   - **Regra permanente**: a exportação em PDF do relatório de execução deve sempre seguir **exatamente** o mesmo layout da página de Reports. Qualquer alteração visual feita na tela deve ser refletida no PDF (e vice-versa) para manter a paridade.


