# Centro de Execução QA TMS - Documentação do Projeto

Este projeto consiste em um integrador interativo de testes baseados no **Robot Framework** utilizando a sintaxe **BDD Gherkin**, com persistência de logs e estados em um banco de dados relacional **SQLite** gerenciado por Prisma.

Abaixo seguem detalhadas todas as regras implementadas, decisões de arquitetura e modificações realizadas.

---

## 📌 Regra de Versionamento Git

- **Proibido `git push` automático**: A IA está proibida de efetuar `git push` de forma automática.
- **Apenas `git commit` local**: Todas as alterações aprovadas devem ser salvas com `git commit` local descritivo. O `git push` só deve ser executado quando o usuário solicitar explicitamente.

---

## 🛠️ Regras de Parsing e Sintaxe Robot/Gherkin

O carregador dinâmico de características (`src/utils/featureLoader.ts`) foi personalizado para ler as diretivas do Robot Framework de forma nativa e precisa, respeitando as seguintes especificações:

1. **Detecção Flexível de Cenários**:
   - Os cenários podem começar com prefixos padrões como `Scenario:`, `Cenário:`, `Cenario:`, `Scenario Outline:` ou `Esquema do Cenário:`.
   - Podem possuir ou não o caractere `:` explícito ou oculto (ex: `Scenario: CT01 Teste Positivo` versus `Cenário CT01 Teste Positivo`).

2. **Diretiva de Pulo (`Skip` / `[Setup]` / `[Teardown]`)**:
   - Mapeamento nativo da diretiva `Skip` do Robot Framework (ex: `Skip    msg=Mensagem explicativa...`).
   - Quando um teste possui a declaração `Skip`, o sistema registra o teste com o status `SKIP`, gravando a mensagem explicativa de pulo e marcando todos os passos internos deste cenário como ignorados (`SKIP`) no banco SQLite.

3. **Mapeamento de Metadados e Tags**:
   - Extração automática de metadados declarados nas diretivas `[Tags]` e `[Documentation]` no parser Gherkin/Robot (`featureLoader.ts`).
   - **Tags de execução no Terminal** (dropdown `-i` / modal **Configurar tag**) vêm **exclusivamente** dos arquivos `.robot` em `test_projects/`, via `src/utils/robotTagLoader.ts` e API `GET /api/terminal/robot-tags`:
     - `Test Tags` na seção `*** Settings ***` (ex.: `login_tests` em `login_tests.robot`).
     - `[Tags]` em cada caso de teste (ex.: `LT01` … `LT06`).
   - Ao usar **Armazenar Testes** no Workspace, o nome da pasta TMS é derivado prioritariamente do primeiro `Force Tags` em `*** Settings ***` e convertido para um nome legível (ex.: `Force Tags    adicionar_tests` → pasta `Adicionar Tests`). Se não houver `Force Tags`, usa o primeiro `Test Tags`; sem nenhuma das duas diretivas, mantém `Workspace Importados`.
   - **Escopo obrigatório de `Force Tags`**: `Force Tags` é metadado de suíte/pasta e também uma tag válida de execução (`-i`) quando a feature selecionada pertencer ao arquivo que a declarou. Não deve aparecer como tag de caso de teste nem contaminar o identificador visual dos cards (badge do caso deve refletir a tag do cenário, como `[Tags]`/`@`, ou o ID normalizado do caso).
   - **Escopo obrigatório de `Test Tags`**: `Test Tags` em `*** Settings ***` é metadado de suíte/execução (filtro `-i`) e não deve ser persistido/exibido como tag de caso de teste no TMS. No badge do caso, exibir apenas tag do cenário (`[Tags]`/`@`) ou ID normalizado do teste (ex.: `TC-01`).
   - **Regra visual dos cards TMS**: os cards/lista de cenários devem exibir somente a tag ou o ID do teste e o título do cenário. O nome da pasta/feature (`tc.folder`) não deve aparecer no card nem ser concatenado ao badge do caso.
   - **Regra visual da Execução Manual**: quando o ID persistido possuir prefixo técnico de feature (ex.: `ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01`), o modal deve exibir os dados em duas partes separadas: `Feature: ADICIONAR-DINHEIRO-VIA-BOLETO` e, em outra linha, `TC-01 - Cenario de Teste Positivo - <título>`. Nunca exibir o prefixo técnico completo junto do identificador e do título do cenário.
   - **Regra de evidência na Execução Manual**: o modal deve oferecer o mesmo anexo da aba **Evidências**, com alternância entre **Arquivo** (imagem/vídeo) e **Link** (URL e título opcional). O link deve possuir ação explícita **Salvar link** e usar o mesmo endpoint de evidências do TMS.
   - A tag fictícia `@all_scenarios (Suite Completa)` foi **removida**; não existe no Robot Framework real.
   - Ao abrir **Configurar tag**, a lista é **recarregada e limpa** a partir de `test_projects/` (tags manuais antigas são substituídas).
   - Upload de `.robot` atualiza as tags a partir do `Test Tags`, `Force Tags` e `[Tags]` do arquivo; salvar `.feature` ou carregar spec **não** altera mais a lista de tags de execução.
   - Exclusão de tags no modal usa atualização funcional de estado (`setExecutionTags(prev => ...)`); qualquer tag pode ser removida.

4. **Identificação Dinâmica de Passos (BDD e Keywords Robot)**:
   - Identificação precisa de passos iniciados com keywords BDD tradicionais (`Dado`, `E`, `Quando`, `Então`, `Mas`, `Given`, `When`, `Then`, `And`, `But`).
   - Identificação de ações puras recuadas com espaços ou tabulações, mapeando-as de forma segura como passos auxiliares adicionais (`AND`).

5. **Parser dedicado para suítes Robot**:
   - Arquivos Robot com a seção `*** Test Cases ***` ou `*** Tasks ***` devem ser processados por `parseRobotGherkinFeature()`.
   - O parser dedicado usa a seção Robot e a indentação para separar casos, preservando testes com nomes não numéricos e sem alterar o parser legado `parseGherkinFeature()` para arquivos Gherkin comuns.
   - Keywords de `*** Keywords ***`, configurações `[Setup]`, `[Teardown]`, `[Template]` e `[Timeout]` não devem virar cenários ou passos de negócio indevidos.

---

## 📥 Mecanismo de Upload e Sincronização

Implementamos uma gestão limpa do estado ao importar novos arquivos de testes `.feature`, `.txt` ou `.robot`:

1. **Limpeza Completa do Estado Anterior**:
   - Sempre que o usuário realiza o upload ou arrasta um novo arquivo para a workspace, os cenários vigentes são totalmente limpos e limítrofes ao novo arquivo.
   - A lista de tags de execução **não** é mais reconstruída a partir de tags `@` do Gherkin ao importar `.feature`; somente arquivos `.robot` importados atualizam o seletor de tags.

2. **Auto-seleção de Tags**:
   - Ao carregar a página ou abrir **Configurar tag**, o sistema sincroniza tags de `test_projects/` e auto-seleciona a primeira tag Robot encontrada (ex.: `login_tests`).
   - Se nenhuma tag existir em `test_projects/`, o seletor fica vazio até o operador adicionar uma tag manualmente no modal.

3. **Status de Execução Inicial**:
   - Ao importar ou salvar uma nova especificação `.feature` (ou arquivo `.robot`, `.txt`), o status de execução de cada cenário é inicializado estritamente como **`Not executed`**, tendo em vista que os mesmos ainda não foram processados.
   - Esse status neutro permanecerá visível em cada cartão até que uma execução pontual de teste ("Execução") ou a execução completa ("Executar Feature") seja efetivada, momento em que o status será atualizado dinamicamente para os resultados de tempo de execução real (**`PASS`**, **`FAIL`** de erro ou **`SKIP`**).

5. **Regra de Renderização dos Cartões de Teste BDD no Workspace (`/terminal`)**:
   - Ao importar ou carregar uma especificação, o Workspace deve exibir imediatamente a lista de cartões de cenários mapeados pelo parser com a especificação do negócio (`parsedFeature.title`) e o contador de cenários (`CENÁRIOS MAPEADOS PELO PARSER (N)`).
   - **Comportamento Padrão de Expansão no Clique**:
     - Por padrão, ao importar os testes, os cartões de cenários são iniciados no estado **recolhido** (exibindo apenas cabeçalho com ID/tags/status, título do cenário e o rodapé com botão de execução).
     - A descrição do BDD (bloco de **DOCUMENTAÇÃO** e os **Passos BDD em Prosa**) permanece oculta por padrão e é exibida **exclusivamente após o clique do operador no cartão de teste** (`isSelected`). O clique subsequente no cartão recolhe novamente os detalhes.
   - **Estrutura Visual Canônica do Cartão de Teste**:
     - **Cabeçalho superior**: ID do cenário em destaque laranja (`SC_ROBOT_001`), badge de tag (ex.: `LT01`), tipo de teste (`Success`/`Failure`/`Permission`) e badge de status (`NÃO INICIADO` / `PASS` / `FAIL` / `SKIP`).
     - **Título do Cenário**: Título em destaque (`CT01 - Login valido...`).
     - **Conteúdo Expandido (apenas ao clicar)**:
       - **Bloco de Documentação**: Quando presente (`[Documentation]`), container escuro com rótulo `DOCUMENTAÇÃO` em laranja e a prosa explicativa em itálico.
       - **Passos BDD em Prosa**: Cada passo com a palavra-chave BDD em destaque laranja (`Given que`, `When`, `Then`, `And`, `Dado`, `Quando`, `Então`, `E`) e o texto do passo.
     - **Rodapé do Cartão**: Tag do cenário à esquerda e botão de ação laranja **`▶ EXECUÇÃO`** (`bg-[#FF6600]`) à direita para executar o teste individual.
   - **Rodapé do Painel Workspace**: Exibir a mensagem **Validação Automática** com **`✔ Sintaxe Gherkin Válida`** em verde.

---

## 🚀 Modos de Execução de Testes

O painel **Terminal** (`/terminal`) executa testes **reais** do Robot Framework na máquina local via APIs (`/api/terminal/run`, `/api/terminal/output`). Não há mais execução simulada.

### 🐍 Dependências e Bibliotecas Python Obrigatórias

Para executar os testes do Robot Framework localmente, o ambiente Python da máquina deve possuir os seguintes pacotes instalados:

1. **`robotframework`** (v7.4+): Motor de execução do Robot Framework e suporte a BDD.
2. **`robotframework-browser`**: Biblioteca de automação web baseada em Playwright para Robot Framework.
3. **`robotframework-requests`**: Biblioteca para testes de APIs e requisições HTTP.

#### Comando de Instalação (Python e Playwright):
- **Linux / macOS**:
  ```bash
  # 1. Instalar pacotes Python (Robot Framework & bibliotecas)
  python3 -m pip install --user --break-system-packages robotframework robotframework-browser robotframework-requests

  # 2. Inicializar o Playwright para a biblioteca Robot Framework Browser (Node.js & binaries do browser)
  rfbrowser init

  # 3. Caso faltem dependências do sistema operacional Linux para os navegadores Playwright:
  npx playwright install-deps
  ```
- **Windows**:
  ```bash
  # 1. Instalar pacotes Python (Robot Framework & bibliotecas)
  python -m pip install robotframework robotframework-browser robotframework-requests

  # 2. Inicializar o Playwright para a biblioteca Robot Framework Browser (Node.js & binaries do browser)
  rfbrowser init

  # 3. Instalar navegadores Playwright do Node.js (se executando E2E):
  npx playwright install
  ```

### Pontos de entrada (todos reais)

| Ação | Implementação | Persistência |
|------|---------------|--------------|
| **Executar Feature** (cabeçalho) | `handleRunFeatureReal()` → `robotRunner.ts` | `results/<RUN-...>/` + SQLite |
| **Execução** (cartão único na workspace) | `handleRunFeatureReal(tagDoCenário)` — filtra por tag `[Tags]` | Idem |
| **Executar Teste Automatizado** (detalhe TMS) | `handleRunSingleTestCaseReal(currentCase)` — filtra somente o caso selecionado | Idem |
| **Executar Testes** (lista TMS) | `handleLoadMultipleTestCasesToWorkspace(folderCases)` — conjunto da pasta/feature | Idem |
| **Terminal Ao Vivo** — *Executar Todos os Testes* | `LiveTerminal.tsx` → `/api/terminal/run` | Idem |
| **Executar Feature** em Reports | `handleRunFeatureReal()` | Idem |

### Comandos Robot por contexto

- **Terminal Ao Vivo — suíte completa**: `python -m robot test_projects/` (`ROBOT_RUN_ALL_COMMAND`).
- **Executar Feature** / **Executar Testes** — filtrado pela tag de suíte `Test Tags` ou `Force Tags` do arquivo selecionado (`buildFeatureRobotCommand()` em `robotCommands.ts`):
   - `adicionar_dinheiro_via_boleto` → `python -m robot --outputdir "results/robot_framework/" -A project_args_file.txt --timestampoutputs -i adicionar_dinheiro_via_boleto ./`
   - O comando usa `./`; o backend recebe `workingDirectory` com a pasta de origem em `test_projects/` para resolver argumentos e recursos relativos.
   - `[Tags]` do cenário são usadas para o botão singular e para localizar o arquivo da feature; nunca substituem a tag de suíte (`Test Tags` ou `Force Tags`) na execução de feature.
- **Executar Teste Automatizado** no detalhe TMS — usa `buildSingleTestRobotCommand()` e `--include`:
   - `CT01` → `python -m robot --include CT01 ./`
   - A tag é extraída das precondições/tag real do caso selecionado, nunca do `filterTag` global.
   - `sourceFolder` é resolvido pelo metadado da tag em `/api/terminal/robot-tags` e enviado ao backend como `workingDirectory`; `''` explícito significa a raiz `test_projects/` e não deve cair para uma seleção antiga.
- O **Comando Final Compilado** no painel lateral continua usando `buildFeatureRobotCommand()` e `-i` para execução de feature/suíte.

### Fluxo de execução real (`handleRunFeatureReal`)

1. Monta pasta `RUN-YYYY-MM-DD_HH-MM-SS-xxxxx` (`buildRunFolderName`).
2. `POST /api/terminal/run` com streaming de stdout no console.
3. `POST /api/terminal/output` — parse de `output.xml`, captura de `report.html` / `log.html` por cenário, persistência em `executions` / `test_cases` / `steps`.
4. Campos enriquecidos: `results_folder`, `report_screenshot_path`, `screenshot_path` (passos), `robot_test_id`.
5. Parâmetro opcional `tagOverride` permite execução focada em um cenário no Workspace; a execução singular do TMS fornece também o comando e `sourceFolder` específicos para não herdar a tag global.
6. O fim do stream libera a UI imediatamente. `output.xml` é persistido em transação no SQLite pelo endpoint `/api/terminal/output`; captura de `report.html`/`log.html` é complementar e não pode impedir a criação do relatório.
7. **Cancelar Execução** chama `/api/terminal/cancel` por `runId` e encerra a árvore Robot/Python no Windows.
8. Os terminais exibem **Total de Testes**, **Sucesso** e **Falhas** em tempo real; o resumo final do Robot corrige os totais.
9. **Repositório de Relatórios Robot** é configurável em **Configurações**, persistido no SQLite e usa `results/` como padrão. O campo aceita somente um caminho relativo ao projeto (ex.: `results/robot_framework/`) e cria a pasta física ao salvar. `%ROBOT_HOME%` não é uma variável do sistema; valores legados com esse placeholder são migrados para o caminho relativo equivalente. O backend injeta `--outputdir <diretório>/<RUN-...>` em toda execução Robot para preservar os artefatos de cada run.
   - O painel mostra também o caminho físico resolvido. Após uma run, `results_path` absoluto é canônico para Reports, PDF e evidências; alterações posteriores na configuração não devem redirecionar nem quebrar execuções já gravadas.

### Botões no cabeçalho do Terminal

1. **Reporte / Report** (PT / EN):
   - Ao lado de **Executar Feature**.
   - Navega para **`/reports`** via `window.location.assign('/reports')`.

2. **Executar Feature / Execute Feature**:
   - Execução real da feature conforme tag ativa no dropdown.
   - **Não** faz auto-scroll da página ao concluir.

### Terminal Ao Vivo (`LiveTerminal.tsx`)

Painel xterm.js — execução real local:

1. **Executar Todos os Testes**: `python -m robot test_projects/`.
2. Streaming via `POST /api/terminal/run`; persistência opcional (`persist: true`) com callback `onPersisted`.
3. Após o run: `POST /api/terminal/output` — mesmo pipeline de parse e evidências que **Executar Feature**.
4. Diferença: Terminal Ao Vivo usa comando de **suíte completa**; o cabeçalho filtra pela **tag selecionada** (`-i`).

### Painel lateral — Argumentos do Robot Framework

1. **Tag de Execução (-i)**: dropdown alimentado por `executionTags` (Robot `Test Tags`, `Force Tags` e `[Tags]`).
2. **Configurar tag**: modal de gestão; ao abrir, recarrega tags de `test_projects/` via API.
3. **Comando Final Compilado**: preview de `buildFeatureRobotCommand(filterTag, sourceFile)`.

### Arquivos-chave do Terminal

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/App.tsx` | `handleRunFeatureReal`, botões Reporte/Executar Feature, modal de tags |
| `src/components/LiveTerminal.tsx` | xterm, run all, persistência |
| `src/utils/robotRunner.ts` | Streaming + `persistRobotRunOutput` |
| `src/utils/robotCommands.ts` | `buildFeatureRobotCommand`, `buildSingleTestRobotCommand` e constantes de comando |
| `src/utils/robotTagLoader.ts` | `extractRobotExecutionTags`, `buildExecutionTagsFromRobotTestTags` |
| `app/api/terminal/run/route.ts` | Execução local do Robot |
| `app/api/terminal/output/route.ts` | Parse `output.xml` + captura de relatórios |
| `app/api/terminal/cancel/route.ts` | Cancelamento explícito de execução por `runId` |
| `app/api/terminal/robot-tags/route.ts` | Lista tags de `test_projects/*.robot` |

### Botão "Execução" (cenário único na workspace)

- Localizado no rodapé de cada cartão Gherkin.
- Extrai a tag primária do cenário (`[Tags]` ou `@`) e chama `handleRunFeatureReal(tag)`.
- Se não houver tag, exibe erro e pede seleção em **Configurar tag**.
- Redireciona para a aba **Console Terminal** com streaming real.

### 🧩 Regra de Singular vs. Plural na Tela TMS (Gestão de Testes)

Na tela do **Sistema de Gestão de Testes (TMS)** existem dois botões de execução cuja semântica é definida estritamente pelo número (singular/plural). Esta distinção é **obrigatória** e não deve ser confundida nem alterada:

1. **Botão "Executar Teste Automatizado" (SINGULAR = um único teste)**:
   - Localizado no rodapé do **painel de detalhes do caso de teste selecionado** (lado direito).
   - Executa **somente o teste selecionado** (o caso aberto no detalhe), e nenhum outro.
   - Implementado por `handleRunSingleTestCaseReal(currentCase)` em `src/App.tsx`.
   - Extrai a tag Robot real do caso, resolve a pasta por `sourceFolder` e executa com `buildSingleTestRobotCommand()` (`--include`).
   - Não usa o `filterTag` global, que pode conter uma tag de suíte como `cadastro_onboarding`.
   - ⚠️ **Não alterar** o escopo deste botão para múltiplos casos. Singular = unitário.

2. **Botão "Executar Testes" (PLURAL = todos os testes da feature)**:
   - Localizado no rodapé da **lista de casos de teste** (ao lado de "Criar Caso").
   - Executa **todos os casos da pasta/feature selecionada** (`selectedSphereFolder`); com "Todas as Pastas" ativo, executa a suíte completa.
   - O **filtro de busca** afeta apenas a lista exibida; **não** restringe a execução.
   - Implementado por `handleLoadMultipleTestCasesToWorkspace(folderCases)` em `src/App.tsx`.

> Mnemônico: **singular ("Teste") = um só (o selecionado)**; **plural ("Testes") = todos (da feature)**. Qualquer alteração futura deve preservar essa regra e ficar restrita ao botão correspondente, sem afetar o outro.

### Ordenação visual dos casos TMS

- Os cards/listas de casos devem ser ordenados por `getSphereCaseBadgeValue()` usando comparação numérica (`RECEL01`, `RECEL02`, ..., `RECEL16`), e não pela ordem acidental do banco.
- Em caso de empate visual, usar o ID persistido como desempate estável.

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

## ⚙️ Menu de Configuração

Para centralizar ações administrativas, o **Menu de Configuração** suspenso (ícone de engrenagem) oferece:

1. **Sincronização em tempo real**: status de sincronização multi-abas via `BroadcastChannel`.
2. **Administração Centralizada do SQLite (Reset DB)**:
   - O botão de **Reset DB** reside exclusivamente no card de Administração de Dados dentro do Painel de Configurações, onde limpa o histórico completo de execuções e restabelece o seed de demonstração padrão do banco relacional de forma segura e contextualizada.

---

## 🗄️ Estrutura de Logs e Relacional SQLite

Cada execução real alimenta o banco SQLite persistido:

* **Tabela `executions`**: Data, comando, duração, totais pass/fail, status e caminho do `output.xml`.
  - Inclui `results_folder` (ex.: `RUN-2026-06-25_22-44-49-89594`), `report_screenshot_path` e caminho físico em `results/`.
* **Tabela `test_cases`**: Cenários com status, duração, categoria; execuções reais podem ter `robot_test_id` e `report_screenshot_path`.
* **Tabela `steps`**: Passos Gherkin/Robot; execuções reais podem ter `screenshot_path` (Browser Library / Playwright).

Limpeza do histórico: `POST /api/database/clear-executions` ou botão **Limpar Histórico** em Reports — zera `executions`, `test_cases` e `steps`, preservando TMS e specs.

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
   - **In Progress / Em Progresso**: Indica que o cenário ou teste está em execução ativa no Robot Framework.
   - **Passed / Aprovado** (anteriormente *PASS*): Indica o sucesso completo da suíte de teste, em que todos os passos atenderam às expectativas.
   - **Failed / Falhou** (anteriormente *FAIL*): O teste foi processado, porém um ou mais passos falharam em atender às validações automatizadas.
   - **Blocked / Bloqueado**: Indica bloqueio de prosseguimento de testes por fator externo impeditivo (como dependências quebradas ou inconsistência no SQLite local).
   - **Skipped / Ignorado** (anteriormente *SKIP*): Declaração explícita de pulo de cenário ou flag configurada ativamente pelo operador QA.

2. **Personalização de Botões e Telas**:
   - O texto do botão na tela de filtro de lote do workspace principal foi alterado de `"Run Automated Test"` para `"Run Automated Tests"` de forma isolada, preservando os identificadores e strings de testes focados em lote singular em outras telas secundárias.
   - Toda a interface visual, incluindo o histórico de execução SQLite remoto e o terminal integrado, agora reflete a substituição corporativa do antigo status "PASS" pelo rótulo formal "Passed".

3. **Restrições de Validação no Relatório Excel (.xlsx)**:
   - A biblioteca de geração de relatórios `ExcelJS` foi atualizada de forma congruente. A regra de validação em célula (`dataValidation`) agora aceita estritamente a lista de valores válidos e atualizados `Passed,Skipped,Failed,Blocked` em vez do formato anterior.

---

## 📑 Tela de Relatórios (Reports) e Exportação em PDF

A área de **Relatórios de Execução** (`src/components/ExecutionReports.tsx`, rota **`/reports`**) exibe o histórico de execuções reais, com detalhe estilo Allure e exportação PDF com evidências visuais.

### Tela Reports (`/reports`)

1. **Rota e navegação**:
   - Rota dedicada **`/reports`** (App Router); `proxy.ts` redireciona `/` e `/?tab=reports` para `/reports`.
   - Botão **Reporte / Report** no cabeçalho do Terminal leva a esta rota.

2. **Listagem de execuções**:
   - Ordenação **mais recente primeiro** (`timestamp` decrescente, desempate por `id`).
   - Filtros por status (ALL / PASS / FAIL) e busca por ID, comando ou `results_path`.
   - Cards com `Feature: <tag>` derivada do comando Robot (ex.: `Feature: login_tests`).

3. **Detalhe do relatório**:
   - Hero: badge de status, título `Feature: ...`, data formatada, comando Robot compilado.
   - Gauge donut, KPIs (Total, Failed, Broken, Passed, Skipped), árvore de cenários por categoria.
   - Aba **CI Metadata / XML**: metadados técnicos e caminho `results_path` da execução.
   - Botão **PDF** no cabeçalho do detalhe exporta o relatório da execução aberta.
   - Botão **Executar Feature** na tela de reports chama `handleRunFeatureReal()`.

4. **Identidade visual**:
   - Removido definitivamente **"ALLURE 3 DEMO PORTAL"**.
   - Foco: **`Feature: <nome_da_feature>`** (sem prefixo `@`).

5. **Recuperação de relatório Robot**:
   - O botão **Ler último relatório Robot** encontra o `output.xml` mais recente no diretório configurado (ex.: `results/robot_framework/`), com varredura recursiva em subpastas e fallback de compatibilidade para `results/` quando o configurado estiver vazio.
   - A persistência registra o caminho físico absoluto em `results_path` e a pasta da run em `results_folder`, preservando a resolução de evidências e PDF.
   - A recuperação é idempotente e não depende de uma aba Terminal ainda aberta.

### Exportação PDF (`handleExportExecutionReportToPDF`)

Implementação: `src/utils/pdfExporter.ts`. Referência de qualidade: `results/Relatorio_Execucao_com_evidencias.pdf` (~1,3 MB com imagens).

1. **Nome do arquivo (timestamp)**:
   - Padrão: `Relatorio_Execucao_com_evidencias_YYYY-MM-DD_HH-MM-SS.pdf`
   - Função: `buildExecutionReportPdfFileName(exec)` — usa `exec.timestamp` da execução.
   - Exemplo: `Relatorio_Execucao_com_evidencias_2026-06-25_19-44-49.pdf`

2. **Pré-requisitos (execução real)**:
   - Resolve pasta física via `GET /api/terminal/resolve-folder` + `resolveResultsFolderFromExecution`.
   - Exige evidências em `results/<RUN-...>/`: screenshots em `browser/screenshot/` e/ou `artifacts/` (manifesto via `GET /api/terminal/evidence`).
   - **Bloqueia exportação** se não houver pasta ou imagens em `results/`.
   - Valida que pelo menos uma imagem foi incorporada no PDF antes de concluir o download.

3. **Layout do PDF (paridade com a tela)**:
   - Tema escuro: hero, donut multi-segmento, KPIs, árvore Gherkin (`cardmais.feature`), ícones de status **vetoriais** (jsPDF não renderiza ✔/✖).
   - Passos no PDF: **somente BDD/Gherkin** — keywords internas do Robot (`New Browser`, `Fill Text`, `Take Screenshot`, etc.) são filtradas (`isBddGherkinStep`).
   - Sem cabeçalho **"Test Step Execution Tracer (Virtual SQLite Logs)"**.
   - Espaçamento confortável entre nome do caso e bloco de passos.

4. **Seção de evidências visuais** (execuções reais):
   - Por cenário: cartões **EVIDÊNCIAS DO CENÁRIO** com screenshots When/Then carregados via `GET /api/terminal/screenshot`.
   - Trecho **ROBOT FRAMEWORK — LOG DO CENÁRIO** (`artifacts/robot-log-<id>.png`).
   - Ao final: **RELATÓRIO ROBOT FRAMEWORK — SUÍTE COMPLETA** (`artifacts/robot-report.png` ou `report_screenshot_path`).
   - Layout em **coluna única**; quebra de página reinicia no topo (evita imagens coladas no rodapé).

5. **APIs de suporte ao PDF**:
   - `GET /api/terminal/evidence?folder=<RUN-...>` — lista screenshots e artifacts.
   - `GET /api/terminal/screenshot?folder=...&path=...` — serve imagem para embed no jsPDF.
   - `GET /api/terminal/resolve-folder?executionId=...` — valida pasta no disco.

6. **Regra permanente de paridade**:
   - Qualquer alteração visual na tela Reports deve ser refletida no PDF (e vice-versa).

### Validação automatizada

- Script: `scripts/test-full-flow-pdf.mjs` — limpa DB, executa `login_tests`, persiste, clica **PDF** em `/reports`, valida tamanho > 300 KB e chamadas à API de screenshot.
- E2E: `e2e/reports-pdf.spec.ts` — fluxo similar com Playwright.

---

## 🐳 Infraestrutura de Containerização Docker Local

O projeto conta com suporte nativo e otimizado a containerização local via **Docker** e **Docker Compose**:

1. **Dockerfile Multi-Ambiente (`Dockerfile`)**:
   - Imagem base baseada em `node:20-bookworm` com suporte completo a Node.js 20, Python 3, `pip`, e dependências do SO (Xvfb, gsettings, libnss3, libatk) para execução nativa do Playwright e Robot Framework Browser.
   - Instalação dos pacotes de automação Python: `robotframework`, `robotframework-browser`, `robotframework-requests` e `rfbrowser init`.
   - Cópia antecipada do schema do Prisma (`prisma/schema.prisma`) garantindo a execução transparente do `npx prisma generate` durante o `npm ci`.
   - Sincronização automática do schema no boot (`npx prisma db push --accept-data-loss`) antes de subir o servidor de produção Next.js.

2. **Docker Compose (`docker-compose.yml`)**:
   - Serviço `tms-app` mapeado na porta `3000:3000`.
   - Volumes persistentes:
     - `./prisma`: Preserva o arquivo SQLite `dev.db`.
     - `./results`: Preserva artefatos e relatórios `output.xml`, `report.html`, `log.html`.
     - `./test_projects`: Permite edição e execução ao vivo de suítes `.robot`.

3. **Endpoints & Acesso à Aplicação**:
   - **URL Host Local:** `http://localhost:3000` ou `http://127.0.0.1:3000`
   - **IP Container Bind:** `http://0.0.0.0:3000` (acessível pelo IP da máquina hospedeira)
   - **Porta Mapeada:** `3000`

---

## 🏗️ Refatoração de Arquitetura Modular (`src/App.tsx`)

O antigo monolito **`src/App.tsx`** (~6.500 linhas) foi desmembrado em uma arquitetura modular limpa, testável e desacoplada:

1. **Constantes e Especificações (`src/constants/initialSpecs.ts`)**:
   - Centraliza o conteúdo Gherkin padrão (`INITIAL_GHERKIN_CONTENT`), formatadores de IDs, sanitizadores de títulos e geradores de templates SQL / Robot Script.

2. **Camada de Lógica & Hooks Customizados (`src/hooks/`)**:
   - `useTestSpecs.ts`: Gerenciamento de arquivos Gherkin/Robot, parsing de cenários, upload e decodificação multibyte segura.
   - `useTerminalRunner.ts`: Orquestração de execuções do Robot Framework (singulares e plurais), streaming de logs do console e persistência relacional no SQLite.
   - `useSphereTestCases.ts`: Estado do Sistema de Gestão de Testes (TMS), árvore de pastas, pesquisas, documentos de aceite e diálogos de execução manual.

3. **Layout e Componentes de Visão (`src/components/`)**:
   - `Header.tsx`: Cabeçalho superior, indicador único de status do banco (`DB: CONECTADO`), comutador de idiomas (PT/EN) e gatilhos de modais.
   - `LoggedStep.tsx`: Componente de formatação e realce de sintaxe dos passos BDD Gherkin no console.
   - `WorkspaceView.tsx`: Editor de especificações Gherkin e seletores de CLI.
   - `TerminalView.tsx`: Painel interativo com console streaming via xterm.js e métricas de execução ao vivo.
   - `SqlExplorerView.tsx`: Explorador visual de tabelas SQLite e Console RAW SQL interativo.

4. **Diálogos e Modais (`src/components/modals/`)**:
   - `ConfigureTagModal.tsx`: Gestão de tags de execução (`-i`).
   - `SettingsModal.tsx`: Configurações de diretórios de saída do Robot e reset do banco relacional.

5. **Container Raiz Reestruturado (`src/App.tsx`)**:
   - Reduzido para ~250 linhas, atuando como container limpo responsável exclusivamente pelo roteamento de abas, sincronização global e renderização das visões.


