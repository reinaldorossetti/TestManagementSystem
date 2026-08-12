# Centro de Execução QA TMS - Documentação Técnica do Projeto

Bem-vindo ao **Centro de Execução QA TMS**! Este é um integrador interativo de testes baseados no **Robot Framework** utilizando a sintaxe **BDD Gherkin**, com execução real local, parser resiliente e persistência de dados estruturados em um banco de dados relacional **SQLite** gerenciado por Prisma.

A aplicação é construída como um projeto **full-stack Next.js 16 (App Router)**: o frontend em **React 19** e o backend (Route Handlers + camada de serviços) convivem no mesmo projeto. A persistência usa **SQLite via Prisma 7** (com o driver adapter `@prisma/adapter-libsql`), e a sincronização em tempo real entre abas é feita pelo **`BroadcastChannel`** do HTML5.

Este documento detalha o funcionamento técnico, a arquitetura full-stack, as regras de negócio de parsing, os mecanismos de sincronização, o design relacional do banco e como instalar, executar e testar o projeto.

> ℹ️ **Nota de arquitetura:** versões anteriores deste projeto rodavam em Vite + Express com SQLite virtualizado no navegador (localStorage + `StorageEvent`). O projeto foi migrado para **Next.js 16 + Prisma + SQLite real**, com uma camada de dados em `src/server` (repositories/services/validation) exposta por uma API REST em `app/api`.

---

## 🏗️ Visão Geral e Arquitetura

O ecossistema é projetado para engenheiros de QA que operam fluxos de pagamentos, recargas e transações no app TMS. A arquitetura é full-stack e segue um fluxo cliente → API → camada de dados → SQLite:

```
                         NEXT.JS 16 (App Router)
┌───────────────────────────── Cliente (React 19) ─────────────────────────────┐
│  Upload Gherkin/Robot ──> Parser (src/utils/featureLoader.ts)                  │
│        │                                                                       │
│        ├─> Workspace / Cartões ─> "Execução" (focada)                         │
│        ├─> Terminal Virtual ────> "Executar Feature" (completa)               │
│        ├─> Navegador SQLite (tabelas + Console RAW SQL)                        │
│        ├─> Relatórios (estilo Allure) + Exportação Excel (.xlsx)              │
│        └─> TMS Standalone (gestão de casos de teste)                           │
│                              │                                                 │
│                  useDatabase() + BroadcastChannel (sync entre abas)            │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                    │  fetch (apiClient)
┌──────────────────────────────── Servidor ────────────────────────────────────┐
│  Route Handlers (app/api/**)                                                   │
│        └─> Services (src/server/services) ─> validação Zod (src/server/...)    │
│              └─> Repositories (src/server/repositories)                        │
│                    └─> Prisma Client (src/lib/db.ts) ─> SQLite (prisma/dev.db) │
└───────────────────────────────────────────────────────────────────────────────┘
```

1. **Parser Sintático (`src/utils/featureLoader.ts`)**: Mapeia arquivos do Robot Framework e Gherkin tradicional, extraindo metadados estruturados, tags e cenários.
2. **Dashboard de Monitoria (Cliente React)**: Apresenta os cenários em cartões interativos organizados por status, tags e módulos, com os passos BDD executados.
3. **Mecanismo de Execução Real**: Executa o Robot Framework localmente em dois níveis (completo vs. focado), com streaming de stdout/stderr e artefatos reais em `results/`.
4. **API REST (`app/api/**`)**: Route Handlers que expõem o snapshot do banco, execuções, specs, casos de teste, pastas e consultas SQL somente-leitura.
5. **Camada de Dados (`src/server/**`)**: Repositories + Services + validação Zod sobre o Prisma Client, garantindo separação de responsabilidades (SOLID).
6. **Persistência SQLite real (`prisma/`)**: Banco relacional gerenciado por Prisma 7, consultável também pelo painel **Navegador SQLite**.

### Regra visual da Execução Manual

Na tela de execução manual, IDs técnicos que combinam feature e caso devem ser separados visualmente. Por exemplo, o registro persistido `ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01` deve aparecer como:

- `Feature: ADICIONAR-DINHEIRO-VIA-BOLETO`
- `TC-01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto`

O prefixo técnico completo não deve ser repetido junto do identificador e do título do cenário.

---

## 🧰 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework full-stack | **Next.js** (App Router + Turbopack) | 16 |
| UI | **React** + **React DOM** | 19 |
| Linguagem | **TypeScript** (modo `strict`) | 5.8 |
| ORM | **Prisma** + `@prisma/adapter-libsql` | 7 |
| Banco de dados | **SQLite** (via `@libsql/client`) | — |
| Validação | **Zod** | 4 |
| Estilização | **Tailwind CSS** (`@tailwindcss/postcss`) | 4 |
| Ícones / Animação | **lucide-react**, **motion**, **recharts** | — |
| Exportação | **ExcelJS** | 4 |
| Testes E2E | **Playwright** (`@playwright/test`) | 1.61 |
| Runtime de scripts | **tsx** (seed) | 4 |

---

## 📦 Instalação Passo a Passo

### Pré-requisitos
- **Node.js** 20.19+ ou 22.12+ (recomendado LTS) e **npm** 10+.
- **Python** 3.10+ (`python3` / `python`) e `pip`.
- Git para clonar o repositório.

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio> TestManagementSystem
cd TestManagementSystem
```

### 2. Instalar as dependências do Node.js
```bash
npm install
```
> O hook `postinstall` executa `prisma generate` automaticamente, criando o Prisma Client em `generated/prisma`.

### 3. Instalar as Bibliotecas Python e Dependências do Playwright (Robot Framework)
Para que a execução local de testes funcione no Terminal e no motor de automação Web (Browser Library / Playwright), instale e inicialize as dependências:

- **Linux / macOS**:
  ```bash
  # 1. Instalar pacotes Python
  python3 -m pip install --user --break-system-packages robotframework robotframework-browser robotframework-requests

  # 2. Inicializar o Playwright para a biblioteca Robot Framework Browser (Node.js & binários dos navegadores)
  rfbrowser init

  # 3. (Se necessário no Linux) Instalar dependências de sistema do sistema operacional para o Playwright
  npx playwright install-deps
  ```
- **Windows**:
  ```bash
  # 1. Instalar pacotes Python
  python -m pip install robotframework robotframework-browser robotframework-requests

  # 2. Inicializar o Playwright para a biblioteca Robot Framework Browser (Node.js & binários dos navegadores)
  rfbrowser init

  # 3. Instalar os navegadores do Playwright para Node.js (E2E)
  npx playwright install
  ```

| Biblioteca Python | Versão Mínima | Descrição |
|---|---|---|
| `robotframework` | `7.4+` | Motor de execução de testes e suporte a BDD Gherkin |
| `robotframework-browser` | `20.0+` | Automação Web via Playwright |
| `robotframework-requests` | `0.9+` | Testes de APIs HTTP/REST |

### 4. Configurar as variáveis de ambiente
Crie um arquivo `.env` na raiz (use o `.env.example` como base):
```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# Linux / macOS
cp .env.example .env
```
Conteúdo mínimo do `.env`:
```env
DATABASE_URL="file:./prisma/dev.db"
```

### 5. Criar o schema do banco e popular os dados de demonstração
```bash
npm run db:migrate   # cria/atualiza o schema SQLite (prisma migrate dev)
npm run db:seed      # popula o banco com o seed de demonstração (INITIAL_DB_SEED)
```
> Alternativa sem histórico de migração: `npx prisma db push` seguido de `npm run db:seed`.

Pronto! O ambiente está instalado e com dados de exemplo.

---

## ▶️ Execução Passo a Passo

### Modo desenvolvimento
```bash
npm run dev
```
Acesse **http://localhost:3000**.

> ⚠️ **Aviso de dev (Turbopack):** o Next.js 16 em modo dev pode, durante o HMR, emitir intermitentemente `Could not find the module ... in the React Client Manifest` (bug conhecido do Turbopack — vercel/next.js#85883). É um problema **apenas de desenvolvimento**, não do código. Soluções: limpar o cache (`.next`) e reiniciar, ou validar via build de produção (abaixo).

### Modo produção (recomendado para validação e testes)
```bash
npm run build   # prisma generate + next build
npm run start   # sobe o servidor de produção em http://localhost:3000
```

> O build não executa seed nem reset do banco. Os dados existentes em
> `prisma/dev.db` permanecem preservados durante `npm run build`.

O seed também é não destrutivo por padrão: `npm run db:seed` popula somente um
banco vazio e não substitui registros existentes. Para restaurar
intencionalmente o estado inicial, use `npm run db:reset` ou a ação explícita
de reset nas configurações da aplicação.

### Inspecionar o banco de dados (Prisma Studio)
```bash
npm run db:studio
```

### Resetar o banco para o seed padrão
```bash
npm run db:reset   # prisma migrate reset --force (recria e re-semeia)
```
> Também é possível resetar pela UI: **Configurações → Administração de Dados → Resetar Banco de Dados**.

### Scripts disponíveis
| Script | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Next dev / Turbopack) |
| `npm run build` | `prisma generate` + build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Lint (`next lint`) |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:migrate` | Aplica migrações de desenvolvimento |
| `npm run db:seed` | Popula um banco vazio com o seed de demonstração, preservando dados existentes |
| `npm run db:reset` | Recria o banco e re-semeia |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run test:e2e` | Executa a suíte Playwright |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run test:e2e:report` | Abre o último relatório HTML do Playwright |

---

## 🗂️ Organização do Projeto

```
TestManagementSystem/
├── .github/workflows/ci.yml       # CI: typecheck, build e testes Playwright
├── app/                          # Next.js App Router (UI + API)
│   ├── api/                      # Route Handlers (backend REST)
│   │   ├── database/route.ts             # GET snapshot / PUT substituir banco
│   │   ├── database/reset/route.ts       # POST reset para o seed
│   │   ├── executions/route.ts           # GET listar / POST persistir run
│   │   ├── executions/[id]/route.ts      # GET detalhe / DELETE execução
│   │   ├── test-specs/route.ts           # GET / POST specs
│   │   ├── test-specs/[id]/route.ts      # PATCH / DELETE spec
│   │   ├── test-cases-sphere/route.ts    # GET / POST casos de teste
│   │   ├── test-cases-sphere/[id]/route.ts # PATCH / DELETE caso
│   │   ├── folders/route.ts              # GET/POST/PATCH/DELETE pastas
│   │   └── sql/route.ts                  # POST consulta SQL somente-leitura
│   ├── layout.tsx                # Layout raiz (metadata, idioma, globals.css)
│   ├── page.tsx                  # Página inicial
│   ├── app-client.tsx            # Wrapper client-only (dynamic ssr:false)
│   ├── global-error.tsx          # Error boundary raiz
│   └── globals.css               # Estilos globais (Tailwind)
│
├── src/
│   ├── App.tsx                   # Componente principal (orquestra os painéis)
│   ├── components/               # ExecutionReports.tsx, TMSDevice.tsx
│   ├── hooks/useDatabase.ts      # Estado do banco + persistência via API + BroadcastChannel
│   ├── lib/
│   │   ├── db.ts                 # Singleton PrismaClient (adapter libsql)
│   │   └── api/client.ts         # Cliente HTTP tipado da API
│   ├── server/                   # Camada de dados (backend)
│   │   ├── repositories/         # Acesso a dados (Prisma) por entidade
│   │   ├── services/             # Regras de negócio + transações
│   │   ├── validation/schemas.ts # Schemas Zod de entrada da API
│   │   ├── mappers/dbMappers.ts  # Prisma → tipos de domínio (Db*)
│   │   ├── http/responses.ts     # Helpers de resposta/erro da API
│   │   ├── db/seed.ts            # Seed não destrutivo; substituição somente no reset explícito
│   │   └── utils/identifiers.ts  # Geração de IDs e timestamps
│   ├── utils/
│   │   ├── featureLoader.ts      # Parser Robot/Gherkin
│   │   ├── excelExporter.ts      # Exportação .xlsx (ExcelJS)
│   │   ├── sqliteEngine.ts       # Tipos + seed inicial (VirtualDatabase)
│   │   └── i18n.ts               # Tradutor PT/EN centralizado
│   ├── data/bdd_scenarios.ts     # Cenários BDD de exemplo
│   └── types.ts                  # Tipos compartilhados
│
├── prisma/
│   ├── schema.prisma             # Modelos relacionais (Execution, TestCase, Step, ...)
│   ├── seed.ts                   # Entrada do seed do Prisma
│   └── dev.db                    # Banco SQLite local (ignorado no git)
├── prisma.config.ts              # Config Prisma 7 (schema, datasource, seed)
│
├── e2e/                          # Testes Playwright
│   ├── pages/                    # Page Objects (BasePage + Feature*)
│   ├── fixtures.ts               # Fixtures que injetam os Page Objects
│   └── *.spec.ts                 # Specs por área (shell, terminal, sqlite, reports, tms)
├── playwright.config.ts          # Config Playwright (webServer = build de produção)
│
├── next.config.ts                # Config Next.js (serverExternalPackages, turbopack.root)
├── postcss.config.mjs            # Tailwind via PostCSS
├── tsconfig.json                 # TypeScript (strict, alias @/*)
└── docs/README.md                # Esta documentação
```

### Princípios de arquitetura
- **Separação de responsabilidades (SOLID):** UI (React) → API (Route Handlers) → Services → Repositories → Prisma. Cada camada tem uma única responsabilidade.
- **Validação na borda:** toda entrada da API é validada com **Zod** antes de chegar aos services.
- **Tipagem forte:** TypeScript em modo `strict`; `any` é evitado em favor de interfaces robustas.
- **Sincronização sem acoplamento:** o `useDatabase` persiste mudanças (debounced) via API e notifica outras abas pelo `BroadcastChannel`.

---

## ✅ Funcionalidades Implementadas

### Núcleo de QA
- **Parser Robot/Gherkin resiliente** com detecção flexível de cenários, `Skip`, `[Tags]`, `[Documentation]` e passos BDD.
- **Upload e sincronização** de arquivos `.feature`, `.txt`, `.robot` com limpeza de estado e auto-seleção de tags.
- **Dois modos de execução real**: "Execução" (cenário focado por tag) e "Executar Feature" (tag ativa), com comandos Robot canônicos e streaming no console.
- **Status do ciclo de vida** padronizados: *Not Started, In Progress, Passed, Failed, Blocked, Skipped*.

### Dados e relatórios
- **Banco SQLite real** (Prisma) com tabelas `executions`, `test_cases`, `steps`, `test_specs`, `test_folders`, `test_cases_sphere` e histórico.
- **Navegador SQLite** com visualização em tabelas e **Console RAW SQL** (consultas somente-leitura via `/api/sql`).
- **Aba de Relatórios** estilo Allure: cartões/tabela, filtros por status (PASS/FAIL), busca e drill-down por execução.
- **Exportação Excel (.xlsx)** com múltiplas abas, KPIs, validação de dados (dropdowns) e links de evidência.
- **Exportação PDF** (jsPDF) do Plano de Testes com tema escuro, banner, KPIs, cobertura por feature e detalhamento de cada caso (severidade/criticidade, passos Gherkin, resultado esperado).

### Plataforma
- **API REST** completa para banco, execuções, specs, casos de teste, pastas e SQL.
- **Sincronização multi-abas** em tempo real via `BroadcastChannel`.
- **Proxy de navegação (`proxy.ts`)**: substitui a convenção depreciada `middleware.ts` no Next.js 16 e preserva os redirecionamentos de `/` e `/?tab=...` para as rotas dedicadas.
- **Suporte bilíngue PT-BR / EN-US** centralizado em `src/utils/i18n.ts`.
- **TMS Standalone**: gestão de casos de teste (árvore de pastas/features, filtro, detalhe com Visão Geral/Auditoria/Scripts, criar/editar/excluir/executar).
- **Observação por pasta/feature**: no formulário **Editar** do TMS Standalone, a opção **"Aplicar para todos os testes."** altera somente o campo de observação de todos os casos da pasta selecionada; os demais campos de cada caso são preservados.
- **Importar Testes no TMS**: ação única que seleciona `.feature`, `.txt` ou `.robot`, importa os cenários e os salva diretamente na pasta/feature vinculada ao projeto ativo, sem abrir uma nova aba.
- **Separação dos fluxos de importação**: o botão TMS `Importar Testes` possui input e handlers próprios; os fluxos legados do Terminal `Importar File` e `Armazenar Testes` permanecem independentes e inalterados.
- **Menu de Configuração**: controle de velocidade de simulação e reset seguro do banco.
- **CI no GitHub Actions**: o workflow `.github/workflows/ci.yml` prepara um SQLite isolado, executa typecheck, build e a suíte Playwright, publicando relatórios e evidências de falha.
- **Testes E2E (Playwright)** cobrindo todos os painéis (ver seção abaixo).

---

## 🧪 Testes Automatizados (Playwright)

A suíte de testes E2E valida todos os componentes/painéis da aplicação seguindo o padrão **Page Object Model + ATDD** (títulos no estilo Given/When/Then, sem Cucumber).

### Estrutura
- **`e2e/pages/BasePage.ts`**: comportamentos globais (navegação, header, status do DB, idioma, configurações, navegador de painéis).
- **`e2e/pages/Feature*.ts`**: um Page Object por área — `FeatureWorkspaceShell`, `FeatureTerminal`, `FeatureSqliteBrowser`, `FeatureReports`, `FeatureTms`.
- **`e2e/fixtures.ts`**: injeta os Page Objects nos testes.
- **`e2e/*.spec.ts`**: cenários por painel (shell/KPIs, terminal, SQLite, relatórios, TMS), incluindo a aplicação da observação para todos os testes de uma pasta em `e2e/tms.spec.ts` e a importação combinada de testes pelo TMS em `e2e/tms-project.spec.ts`.

### Seletores e estabilidade
Prioridade de seletores: **`id` estável → seletores de acessibilidade (`getByRole`/`getByLabel`/`getByPlaceholder`) → `data-testid`**, evitando CSS/XPath frágil.

### Configuração relevante
- O `webServer` do `playwright.config.ts` sobe o **build de produção** (`npm run build && npm run start`) em execuções locais, imune ao bug de HMR do Turbopack.
- No CI, `PLAYWRIGHT_USE_PREBUILT=true` faz o Playwright reutilizar o build gerado pelo workflow, evitando compilação duplicada.
- Execução **serial** (`workers: 1`), pois o backend é um único processo com um único arquivo SQLite compartilhado (sem isolamento por teste).

### Como executar
```bash
# 1ª vez: instalar o navegador do Playwright
npx playwright install chromium

# Rodar a suíte (sobe o servidor de produção automaticamente)
npm run test:e2e

# Modo interativo / relatório
npm run test:e2e:ui
npm run test:e2e:report
```

### GitHub Actions

O workflow **CI** é executado em `push` para `main`/`master`, em pull requests e manualmente via `workflow_dispatch`. O job roda em um ambiente limpo e prepara o banco SQLite descartável `prisma/ci.db` antes de executar typecheck, build e a suíte Playwright.

Os artefatos `playwright-report` e `test-results` são publicados na execução do workflow para facilitar o diagnóstico de falhas. O banco de CI não utiliza o `prisma/dev.db` local.

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

O sistema armazena **apenas as tags reais desses testes** no banco de dados e as apresenta nos badges de cada cartão na workspace. Cenários sem tag exigem seleção manual em **Configurar tag** antes da execução.

Regra complementar: `Force Tags` (em `*** Settings ***`) é metadado de suíte para organização/rotulagem de pasta no TMS. Ele **não** deve ser exibido como tag de caso de teste, nem concatenado ao identificador visual do badge do teste.

Nos cards da tela TMS, exibir somente a tag/ID do teste e o título do cenário. O nome da pasta ou da feature não deve ser apresentado no card nem anexado ao badge do caso.

### 4. Mapeamento de Passos (BDD e Keywords)
Mapeia os passos definidos formalmente com prefixos padrão BDD (como `Dado`, `Quando`, `Então`, `E`, `Mas`, `Given`, `When`, `Then`, `And`, `But`) ou linhas indentadas de ações diretas do Robot (mapeadas dinamicamente com o tipo auxiliar `AND`).

---

## 🚀 Modos de Execução de Testes

Todas as execuções são **reais** — o interpretador Robot Framework roda localmente via API (`/api/terminal/run`) e os artefatos são gravados em `<repositório-configurado>/<RUN-...>/`.

### 1. Botão "Execução" (Execução Focada de Cenário Único)
* **Localização**: Rodapé de cada cartão de cenário na Workspace.
* **Comportamento**: 
  - Extrai a tag primária do cenário (`[Tags]` ou `@`) e chama `handleRunFeatureReal(tag)`.
  - Redireciona para a aba **Console Terminal** com streaming de stdout.
  - Comando exemplo:
    ```bash
    python -m robot --outputdir "results/robot_framework/" -A project_args_file.txt --timestampoutputs -i <Test Tags ou Force Tags> ./
    ```
  - Se o cenário não possuir tag, o sistema solicita seleção em **Configurar tag**.

### 2. Botão "Executar Feature" (Execução por Tag Ativa)
* **Localização**: Cabeçalho do **Console Terminal** e tela de **Reports**.
* **Comportamento**:
  - Executa testes reais filtrados pela tag de suíte `Test Tags` ou `Force Tags` declarada no arquivo selecionado (`-i`).
  - Usa `buildFeatureRobotCommand()` com `--outputdir`, `-A`, `--timestampoutputs` e o alvo `./`; a API executa o processo dentro da pasta de origem em `test_projects/`.
  - `[Tags]` de cenário identificam o arquivo/caso, mas não substituem a tag de suíte na execução completa de uma feature.
  - Imprime o comando canônico no console:
    ```bash
    python -m robot --outputdir "results/robot_framework/" -A project_args_file.txt --timestampoutputs -i adicionar_dinheiro_via_boleto ./
    ```

### 3. Terminal Ao Vivo — Executar Todos os Testes
* Executa a suíte completa em `test_projects/`:
  ```bash
  python -m robot test_projects/
  ```
* Mesmo pipeline de persistência (`/api/terminal/output`) que **Executar Feature**.

### 4. Finalização, cancelamento e recuperação de Reports
* Quando o stream Robot termina, a UI libera a execução imediatamente; a leitura de `output.xml` e a captura opcional de `report.html`/`log.html` não bloqueiam o terminal.
* `output.xml` é persistido diretamente pelo backend no SQLite com execução, casos e passos. A captura visual só complementa o registro e não impede o relatório quando falhar.
* **Cancelar Execução** cancela a run por `runId` em `/api/terminal/cancel`; no Windows, encerra a árvore `cmd → Python → Robot`.
* A tela **Reports** oferece **Ler último relatório Robot**, que importa o `output.xml` mais recente no diretório configurado (`results/robot_framework/` por padrão expansível), varrendo subpastas recursivamente e usando `results/` como fallback, e atualiza o histórico.
* Os dois terminais exibem em tempo real **Total de Testes**, **Sucesso** e **Falhas**; o resumo final do Robot consolida os valores.

### 5. Repositório de relatórios configurável
* Em **Configurações → Repositório de Relatórios Robot**, configure um caminho relativo à raiz do projeto, como `results/robot_framework/`.
* O valor é persistido no SQLite, a pasta física é criada ao salvar e o painel mostra o caminho absoluto resolvido.
* Não existe variável `%ROBOT_HOME%`; valores legados com esse texto são migrados para caminhos relativos reais.
* A execução recebe uma subpasta única `RUN-...`. Depois da run, o `results_path` absoluto persistido é canônico para Reports, evidências e PDF; mudar a configuração afeta apenas execuções futuras.

---

## 📥 Mecanismo de Upload e Sincronização de Arquivos

Sempre que um novo arquivo de testes (.feature, .txt, .robot) é carregado na workspace ou editado pelo editor Gherkin:
1. **Limpeza de Estado**: Limpa completamente os cenários anteriores da memória para impedir ghost runs de casos de teste obsoletos.
2. **Reconfiguração de Tags**: reconstrói o array de tags em tempo real de acordo com as diretivas contidas no novo arquivo.
3. **Auto-seleção Dinâmica**: Seleciona automaticamente a primeira tag válida encontrada no arquivo e reconfigura o dropdown para a mesma.
4. **Boot e Carregamento Dinâmico**: No primeiro carregamento da aplicação, o sistema carrega o cenário BDD básico e extrai as tags `@RCT01` a `@RCT12` programaticamente das diretivas contidas, provisionando a lista de execução de forma limpa e síncrona sem lixo ou tags obsoletas.

---

## 🗄️ Estrutura de Modelagem Relacional (SQLite)

Todas as movimentações e execuções alimentam tabelas em um banco de dados relacional **SQLite real**, definido em `prisma/schema.prisma` e acessado pela camada `src/server` via Prisma. A modelagem lógica é descrita abaixo (os nomes físicos das colunas seguem o `schema.prisma`):

### 1. Tabela `executions`
Representa cada execução real registrada no Terminal:

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
