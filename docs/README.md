# Centro de Execução QA TMS - Documentação Técnica do Projeto

Bem-vindo ao **Centro de Execução QA TMS**! Este é um integrador e simulador interativo de testes baseados no **Robot Framework** utilizando a sintaxe **BDD Gherkin**, com recursos avançados de execução focada, parser resiliente e persistência de dados estruturados em um banco de dados relacional **SQLite local** virtualizado no próprio navegador (via memory/WebSQL/IndexedDB local client stream).

Este documento detalha o funcionamento técnico, a arquitetura do simulador de testes, as regras de negócio de parsing, os mecanismos de sincronização e o design relacional do banco de dados SQLite.

---

## 🏗️ Visão Geral e Arquitetura

O ecossistema é projetado para engenheiros de QA que operam fluxos de pagamentos, recargas e transações no app TMS. Ele é composto por quatro módulos principais:

```
[ Upload Gherkin/Robot ] ──> [ Parser Inteligente (featureLoader.ts) ]
                                    │
                                    ├──> [ Visualizador de Cenários & Workspace ]
                                    │      └──> Botão "Execução" (Execução Focada)
                                    │
                                    └──> [ Terminal Virtual (Execução Canônica) ]
                                           ├──> Botão "Executar Feature" (Completa)
                                           └──> Banco de Dados SQLite Relacional
```

1. **Parser Sintático (`featureLoader.ts`)**: Mapeia arquivos do Robot Framework e Gherkin tradicional, extraindo metadados estruturados, tags e cenários.
2. **Dashboard de Monitoria (Interface Principal)**: Apresenta os cenários em formato de cartões interativos organizados por status, tags e módulos, fornecendo detalhes dos passos BDD executados.
3. **Mecanismo de Execução Assistida**: Permite simular a execução de testes baseados em Robot Framework em dois níveis (completo vs. focado), gerando relatórios de log idênticos aos terminais shell reais do Robot.
4. **Camada de Dados Virtualizada (Navegador SQLite)**: Fornece um painel interativo que reflete e armazena os esquemas relacionais das execuções e histórico de forma nativa e persistente.

---

## 🛠️ Regras de Parsing e Sintaxe Robot / Gherkin

O analisador sintático (`src/utils/featureLoader.ts`) examina linha por linha do arquivo de teste em busca de tokens representativos. Ele suporta:

### 1. Detecção Flexível de Cenários de Testes
Os cenários são identificados de forma flexível a partir de expressões regulares resilientes utilizando o padrão:
`^(?::\s*)?(Scenario Outline|Esquema do Cenário|Scenario|Cenário|Cenario)\s*:?\s*(.*)$`

Isso permite analisar corretamente:
- `Scenario: CT01 Teste Positivo`
- `Cenário CT01 Teste Positivo`
- `:Scenario CT01 Teste Positivo`
- `Cenario: Recarga de Transporte`

### 2. Tratamento da Diretiva `Skip` (Robot Framework)
Se a instrução `Skip` com uma mensagem explicativa (ex: `Skip    msg=Sem o serviço no momento...`) for localizada dentro de um cenário:
- O cenário é simulado como ignorado (`SKIP`).
- Todos os passos Gherkin pertencentes a este cenário recebem a marcação e visualização de status `SKIP`.
- O banco de dados registra o status correspondente para auditoria futura das métricas de cobertura.

### 3. Extração Dinâmica de Tags (Gherkin `@` & Robot `[Tags]`)
O parser suporta os dois formatos canônicos de tags:
- **Gherkin Tags (`@`)**: Linhas imediatamente anteriores à declaração do cenário contendo as tags precedidas pelo símbolo `@` (ex: `@RCT01 @login`). Essas tags são acumuladas do arquivo e aplicadas ao cenário subsequente.
- **Robot Framework `[Tags]`**: Linhas dentro do escopo do cenário começando com o token `[Tags]` (ex: `[Tags]    RCT01`). Elas são limpas e salvas como tags nativas do cenário.

O sistema armazena **apenas as tags reais desses testes** no banco de dados e as apresenta nos badges de cada cartão na workspace. Se um cenário não possui tags específicas, ele é considerado parte de `@all_scenarios` (Suite Completa).

### 4. Mapeamento de Passos (BDD e Keywords)
Mapeia os passos definidos formalmente com prefixos padrão BDD (como `Dado`, `Quando`, `Então`, `E`, `Mas`, `Given`, `When`, `Then`, `And`, `But`) ou linhas indentadas de ações diretas do Robot (mapeadas dinamicamente com o tipo auxiliar `AND`).

---

## 🚀 Modos de Execução de Testes

Para garantir maior agilidade no dia a dia do analista de qualidade, o simulador oferece dois fluxos de execução independentes:

### 1. Botão "Execução" (Execução Focada de Cenário Único)
* **Localização**: Fica localizado individualmente na parte inferior de cada cartão de cenário na Workspace.
* **Comportamento**: 
  - Ao ser clicado, ele limpa o contexto de execução anterior e simula apenas o teste correspondente àquele card.
  - Ele extrai e lê a tag identificadora primária do cenário (se houver, limpando o caractere de arroba `@` caso presente, ex: `@RCT01` se torna `RCT01`).
  - O terminal virtual é ativado imediatamente na aba **Console Terminal**.
  - O comando executado e impresso no terminal corresponde à sintaxe focada do Robot:
    ```bash
    robot --include RCT01 ./
    ```
  - Se o cenário não possuir tags específicas, o sistema utiliza o parâmetro genérico `all_scenarios` para execução pontual.

### 2. Botão "Executar Feature" (Execução de Suíte Completa)
* **Localização**: Fica em evidência no cabeçalho superior direito da aba de controle do **Console Terminal**.
* **Comportamento**:
  - Executa na íntegra de forma sequencial **todos os cenários** atualmente de forma sequencial.
  - **Usa o arquivo de argumentos e os parâmetros selecionados**: Ao ser acionado, este botão compila o comando padrão completo utilizando o compilador de comando (`getCompiledCommand`), incorporando o arquivo de argumentos de projeto (`-A project_args_file.txt`) e a tag de filtro ativa no dropdown. Ele garante que qualquer parâmetro customizado de console seja transferido adequadamente durante a execução geral.
  - Imprime o comando canônico completo do interpretador:
    ```bash
    python -m robot -A project_args_file.txt --timestampoutputs -i <tag_selecionada> ./
    ```

---

## 📥 Mecanismo de Upload e Sincronização de Arquivos

Sempre que um novo arquivo de testes (.feature, .txt, .robot) é carregado na workspace ou editado pelo editor Gherkin:
1. **Limpeza de Estado**: Limpa completamente os cenários anteriores da memória para impedir ghost runs de casos de teste obsoletos.
2. **Reconfiguração de Tags**: reconstrói o array de tags em tempo real de acordo com as diretivas contidas no novo arquivo.
3. **Auto-seleção Dinâmica**: Seleciona automaticamente a primeira tag válida encontrada no arquivo e reconfigura o dropdown para a mesma.
4. **Boot e Carregamento Dinâmico**: No primeiro carregamento da aplicação, o sistema carrega o cenário BDD básico e extrai as tags `@RCT01` a `@RCT12` programaticamente das diretivas contidas, provisionando a lista de execução de forma limpa e síncrona sem lixo ou tags obsoletas.

---

## 🗄️ Estrutura de Modelagem Relacional (SQLite)

Todas as movimentações e execuções no terminal alimentam tabelas em nosso banco de dados relacional simulado no console através de consultas `SQL`. A modelagem é construída conforme abaixo:

### 1. Tabela `executions`
Representa cada execução enviada no terminal virtual virtualizado:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` (PK) | VARCHAR | Código identificador (ex: `RUN-4829302194`) |
| `timestamp` | TEXT | Data e hora em que a execução ocorreu |
| `command` | TEXT | Comando canônico submetido |
| `duration_ms`| INTEGER | Tempo total acumulado da execução em milissegundos |
| `passed` | INTEGER | Quantidade de testes aprovados |
| `failed` | INTEGER | Quantidade de testes reprovados |
| `skipped` | INTEGER | Quantidade de testes ignorados |
| `report_xml`| TEXT | Caminho virtual de relatório XML gerado |

### 2. Tabela `test_cases`
Registra e detalha o status individual de cada cenário executado:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` (PK) | VARCHAR | Identificador do caso de teste |
| `execution_id` | VARCHAR | FK apontando para `executions(id)` |
| `title` | TEXT | Nome do cenário extraído |
| `status` | VARCHAR | Resultado final do teste (`PASS`, `FAIL`, `SKIP`) |
| `duration_ms`| INTEGER | Duração específica do teste em milissegundos |
| `tag` | TEXT | Tag primária associada ao teste |

### 3. Tabela `steps`
Registra cada passo ou keyword em nível microscópico correspondente ao cenário:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` (PK) | VARCHAR | Identificador do passo executado |
| `test_case_id`| VARCHAR | FK apontando para `test_cases(id)` |
| `type` | VARCHAR | Tipo do passo Gherkin (`DADO`, `QUANDO`, `ENTAO`, `E`, `AND`) |
| `text` | TEXT | Descrição em texto corrido do passo correspondente |
| `status` | VARCHAR | Resultado final do passo (`PASS`, `FAIL`, `SKIP`) |

O painel **Navegador SQLite** permite consultar essas tabelas livremente usando cláusulas padrão como `SELECT * FROM test_cases WHERE status = 'FAIL';` ou qualquer comando DML/DQL necessário para fins de diagnóstico.

---

## 📊 Nova Aba de Histórico de Relatórios (Estilo Allure + Cores Slate/Orange)

Com a nova aba de **Reports**, o Centro de Execução QA TMS ganha uma ferramenta analítica completa para inspeção histórica das runs. Esta página é totalmente dinâmica, com consumo das tabelas armazenadas no SQLite persistente do navegador:

### 1. Indicadores de Status (Gauges de Sucesso de Execuções)
- **Painel de Cartões (Estilo Allure)**: Apresenta cartões dinâmicos que exibem o percentual de sucesso geral, total de testes executados, tempo cumulativo e latência do SQL.
- **Gráfico de Pizza Integrado**: Uma representação visual da proporção de resultados bem-sucedidos (`PASS`), falhos (`FAIL`) ou ignorados (`SKIP`) do arquivo.

### 2. Tabela de Execuções e Filtros Avançados
- **Layout Confortável**: Uma tabela rica que lista o ID da execução, data/hora formatada, comando executado, duração, contadores de status e ações rápidas.
- **Filtro de Status**: Dropdown dinâmico para listar execuções por `PASS` (apenas aprovadas), `FAIL` (apenas falhas) ou `ALL` (todas as execuções).
- **Pesquisa Inteligente**: Barra de busca em tempo real que filtra execuções pelo número identificador do ID da Run ou pela palavra-chave do comando Robot.

### 3. Modal de Exame Detalhado (Test Inspector)
- Ao clicar no botão **Inspecionar**, um modal moderno com efeito fade-in é aberto exibindo cada um dos cenários executados naquela Run.
- Exibe o título dos cenários, tag correspondente, duração individual em milissegundos e o badge do status respectivo do teste.
- Permite que o operador de QA diagnostique falhas específicas sem precisar reexecutar a suite.

---

## 📊 Matriz de Exportação Comercial Microsoft Excel (.xlsx) (Novo)

O Centro de Execução QA TMS possui suporte nativo e avançado para exportação de dados estruturados em conformidade com o formato corporativo do Microsoft Excel (.xlsx), gerando uma pasta de trabalho enriquecida e estilizada:

### 1. Filosofia de Múltiplas Abas (Workbook Setup)
* **Aba 📊 Resumo Executivo**:
  - Remoção sutil de linhas de grade para uma apresentação corporativa limpa.
  - Cartões KPI estilizados para apresentar métricas agregadas rápidas: **Total de Casos**, **Módulos / Features**, e o **Método de Automação**.
  - Tabela consolidada de cobertura de testes que exibe o nome de cada feature e a contagem respectiva de cenários mapeados na planilha.
* **Aba 📋 Matriz Geral de Testes**:
  - Uma planilha contendo o portfólio unificado e completo dos testes de QA cadastrados no escopo atuante.
  - Recurso de **Autofiltro** habilitado por padrão em todas as colunas para que o analista de testes consiga filtrar o documento à sua escolha de forma instantânea.
* **Abas Dinâmicas de Feature (📂 Nome_da_Feature)**:
  - O exportador agrupa automaticamente todos os casos de teste ativos pelas respectivas pastas do projeto física ou caminhos do repositório.
  - Para cada pasta/feature única listada, uma nova aba personalizada com o prefixo `📂 ` é acoplada à planilha, colorida com cabeçalho Navy destacado (`#1E3A8A`) para fácil isolamento técnico.

### 2. Estilização Rígida de Células e Novos Campos Técnicos
O exportador preenche colunas ricas com metadados e formatações impecáveis de preenchimento e bordas finas para um visual premium:
* **Severidade e Criticidade**: Colunas contendo formatação em formato de pílulas coloridas suaves criadas diretamente dentro do Excel. Linhas críticas recebem azul-claro sutil, linhas de alta recebem roxo/fada e linhas médias recebem tons esmeralda pastel.
* **Evidência Link**: Coluna mapeada diretamente para URLs ativas do SharePoint que abrem imagens reais das execuções no navegador ao serem clicadas diretamente de dentro do aplicativo do Excel (`Ctrl + Click`).
* **Teste Automatizado?**: Campo pré-carregado com `Sim`.
* **Complexidade para Automatizar?**: Análise algorítmica embutida no exportador que gera relatórios descritivos das razões para o nível correspondente de complexidade, servindo como documentação ativa para as frentes desenvolvedoras.
* **Observações**: Campo estendido de comentários e justificativos para as fases de planejamento e refatoração futuras.

### 3. Validação de Dados Avançada (Dropdowns do Excel)
Para preservar as regras de negócios mesmo em edições externas feitas pelo usuário do Excel:
* O arquivo Excel possui **Dropdowns de Validação de Dados** (`Data Validation`) ativados nativamente em suas respectivas células para as colunas:
  - **Severidade**: `Critical`, `High`, `Medium`, `Low`.
  - **Criticidade**: `Critical`, `High`, `Medium`, `Low`.
  - **Teste Automatizado?**: `Sim`, `Não`.
* Isso previne digitações equivocadas e mantém a padronização e consistência da massa de dados em todo o ecossistema corporativo.

---

## 🧑‍💻 Exemplo de Sintaxe TMS Suportada

O interpretador processa com distinção de tags elegantes o seguinte cenário exemplo:

```robot
Scenario: CT01 Teste Positivo - Realizar uma nova recarga de transporte Guaicurus, com pagamento em Saldo da carteira.
    [Tags]    RCT01
    [Documentation]     Rota: Acessar Minha Conta > Recarga de transporte > Guaicurus Digital > Inserir Número do Cartão 
    ...                 > Inserir a Quantidade > Continuar > Saldo da carteira (Editar) > Confirmar recarga > Senha Transacional > Mensagem de Sucesso.
    Skip    msg=Sem o serviço no momento, aguardar a implementação do serviço para realizar o teste.
    Dado Que Tenha Efetuado O Login No APP            ${CPF}     ${SENHA}    ${CNPJ_CONTA}
    E Esteja na tela de recarga de transporte Guaicurus
    Quando Inserir os dados do Cartão de transporte    ${COD_GUAICURUS}
    E Inserir o valor da recarga      ${RECARGA_VALOR_MINIMO}
    E Confirmar se os dados estão corretos com forma de pagamento     ${FORMA_DE_PAGAMENTO1}
    Então Validar a Recarga realizada com Sucesso do Guaicurus
```

Ao processar este exemplo:
1. O parser detectará o cabeçalho `Scenario:` e coletará o título do caso de teste.
2. Associará a tag `RCT01` no seletor superior.
3. Consolidará a documentação de rota multilinhas.
4. Detectará a flag `Skip` indicando que o teste está desativado temporariamente.
5. Sincronizará os passos BDD internos mapeados individualmente.

---

## 🎨 Paleta de Cores do Centro de Execução QA TMS

Replicando a identidade premium de alta tecnologia e o estilo consolidado dos principais runners de teste automatizados (como Allure Reports e Robot Framework), o design utiliza as seguintes definições de cores para telas, botões, textos e estados visuais:

### 1. Tons de Fundo (Canvas & Workspace)
- **Fundo Principal Absoluto**: `bg-slate-950` (`#020617`) - Proporciona um contraste nítido, canônico, focando a visão do tomador de decisão de QA nos elementos ativos.
- **Painéis / Seções / Cartões**: `bg-slate-900` (`#0f172a`) - Utilizado para delimitar contêineres lógicos, cards Allure 3, cabeçalhos de controle e tabelas de logs.
- **Bordas / Separadores**: `border-slate-800` (`#1e293b`) ou `border-slate-850`/`900` - Garantem microdimensões harmônicas e sofisticadas, reduzindo o ruído entre blocos de conteúdo.

### 2. Destaques e Identidade Primária (Brand Orange)
- **Accent Primário**: `#FF6600` (Vibrant Orange) - Utilizado em botões de ação principal (ex: *Executar Feature*), badges ativos, links de navegação estáticos, e indicador de percentual Allure.
- **Hover e Foco**: `#E05300` - Resposta interativa suave a passagens de cursor sobre elementos clicáveis principais.

### 3. Paleta de Status de Execução (PASS / FAIL / SKIP)
- **Sucesso (PASS)**: `#10B981` (Emerald-500) e fundos translúcidos `bg-emerald-500/10` - Para botões de aprovação de cenários, badges de passos íntegros, e a fatia majoritária da rosquinha analítica de desempenho.
- **Falha Crítica (FAIL)**: `#EF4444` (Rose-500) e fundos `bg-rose-500/10` - Utilizado para realce de passos quebrados, avisos de regressão, erros de asserção e runs falhados.
- **Ignorado/Aviso (SKIP / BROKEN)**: `#F59E0B` (Amber-500) e fundos `bg-amber-500/10` - Realça testes afetados com a diretiva `Skip` do Robot Framework ou suspensos.

### 4. Cores de Texto e Legibilidade (Typography Slate)
- **Texto Primário Titular**: `text-slate-100` (`#f1f5f9` / `#ffffff`) - Títulos de cenários, percentuais Allure e numerais críticos com contraste AAA.
- **Texto Secundário**: `text-slate-350` / `text-slate-400` (`#94a3b8`) - Descrições de documentos, caminhos de resultados e subtítulos secundários estruturados.
- **Sub-logs e Variáveis**: `text-slate-500` / `slate-550` - Metadados de timing de testes, caminhos locais e detalhes do parser SQL.
