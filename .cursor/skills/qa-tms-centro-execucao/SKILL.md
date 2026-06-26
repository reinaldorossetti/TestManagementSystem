---
name: qa-tms-centro-execucao
description: >-
  Guides development on Centro de Execução QA TMS (Next.js 16, React 19, Robot Framework,
  Prisma/SQLite, Reports/PDF). Use when editing this repo, implementing QA features, Terminal
  execution, Reports, PDF export, TMS, parsing Gherkin/Robot, or when the user mentions
  AGENTS.md, GEMINI.md, TestManagementSystem, or QA TMS.
---

# Centro de Execução QA TMS

Integrador full-stack de testes **Robot Framework** + **BDD Gherkin**, com execução **real** local, persistência **SQLite/Prisma** e relatórios (Allure-style + PDF com evidências).

**Fontes canônicas do repositório** (consultar antes de mudanças de comportamento):
- [AGENTS.md](../../../AGENTS.md) — regras de negócio e arquitetura
- [GEMINI.md](../../../GEMINI.md) — padrões TypeScript, React e UI
- [README.md](../../../README.md) — instalação, stack e estrutura detalhada

Detalhes expandidos: [project-structure.md](project-structure.md) | [business-rules.md](business-rules.md) | [coding-standards.md](coding-standards.md)

---

## Stack atual (não usar stack legada)

| Camada | Tecnologia |
|--------|------------|
| Full-stack | Next.js 16 App Router + Turbopack |
| UI | React 19, Tailwind CSS 4, motion, lucide-react |
| Backend | Route Handlers `app/api/**`, services, repositories |
| Dados | Prisma 7 + SQLite (`@prisma/adapter-libsql`) |
| Validação | Zod 4 |
| Testes Robot | Python Robot Framework + Browser Library (Playwright) |
| E2E | Playwright (`e2e/`, Page Objects) |

> Legado removido: Vite, Express, SQLite virtualizado no browser, **execução simulada** do Robot.

---

## Arquitetura (fluxo obrigatório)

```
React (src/) → fetch apiClient → app/api/** → services → repositories → Prisma → SQLite
```

- **UI** não acessa Prisma diretamente.
- **Entrada da API** sempre validada com Zod (`src/server/validation/schemas.ts`).
- **Sync multi-abas**: `useDatabase()` + `BroadcastChannel` (não depender só de `StorageEvent` para o banco atual).

### Rotas principais

| Rota | Painel |
|------|--------|
| `/terminal` | Workspace Gherkin, console, Executar Feature, Live Terminal |
| `/reports` | Relatórios de execução + export PDF |
| `/sqlite` | Navegador SQLite + SQL playground |
| `/tms` | Gestão de casos de teste (standalone) |

`middleware.ts` redireciona `/` e `/?tab=*` para rotas dedicadas.

---

## Execução Robot (somente real)

**Não** reintroduzir simulação (`handleRunRobotFramework`, `waitMs`, `%ROBOT_HOME%/output_*.xml` fake).

| Ação | Implementação |
|------|----------------|
| **Executar Feature** | `handleRunFeatureReal()` em `src/App.tsx` |
| **Execução** (cartão workspace) | `handleRunFeatureReal(tagDoCenário)` |
| **Terminal Ao Vivo** | `LiveTerminal.tsx` → `POST /api/terminal/run` |
| Comando por tag | `buildFeatureRobotCommand()` em `src/utils/robotCommands.ts` |
| Streaming + persistência | `src/utils/robotRunner.ts` |

Fluxo: `RUN-YYYY-MM-DD_HH-MM-SS-xxxxx` → `results/<RUN>/` → parse `output.xml` → SQLite (`executions`, `test_cases`, `steps`).

### Tags de execução

- Dropdown `-i` alimentado por `robot-sample/*.robot` via `robotTagLoader.ts` + `GET /api/terminal/robot-tags`.
- `Test Tags` (Settings) + `[Tags]` por caso.
- **`@all_scenarios` removido** — não usar tag fictícia.
- Upload `.feature` **não** altera tags de execução; apenas `.robot` importado ou API de tags.

### Regra TMS (singular vs plural) — não alterar

- **Executar Teste Automatizado** (singular) → um caso: `handleLoadTestCaseToWorkspace(id)`.
- **Executar Testes** (plural) → todos da feature: `handleLoadMultipleTestCasesToWorkspace(folderCases)`.

---

## Reports e PDF

- Componente: `src/components/ExecutionReports.tsx`, rota `/reports`.
- PDF: `handleExportExecutionReportToPDF` em `src/utils/pdfExporter.ts`.
- Nome: `Relatorio_Execucao_com_evidencias_YYYY-MM-DD_HH-MM-SS.pdf`.
- Exige pasta real em `results/<RUN-...>/` com imagens (`/api/terminal/evidence`, `/api/terminal/screenshot`).
- **Paridade obrigatória**: alteração visual em Reports deve refletir no PDF.
- Passos no PDF: apenas BDD (`isBddGherkinStep`); ícones vetoriais (jsPDF não renderiza ✔/✖).

Validação: `node scripts/test-full-flow-pdf.mjs http://localhost:3000 --login-only`

---

## Clean Code e TypeScript

1. **Escopo mínimo** — um propósito por PR; não alterar código não relacionado.
2. **Sem `any`** — interfaces/tipos explícitos; modo `strict`.
3. **Camadas** — lógica de negócio em `services/`, não em componentes React.
4. **Funções puras** em `utils/` quando possível; efeitos colaterais explícitos.
5. **Async** — `async/await` + `try/catch`; evitar cadeias `.then()` aninhadas.
6. **Null-safety** — `?.` e `??` em vez de `!`.
7. **Sem código morto** — não deixar blocos comentados ou imports não usados.
8. **JSDoc** em helpers públicos e APIs; comentários só para lógica não óbvia.
9. **Nomes revelam intenção** — funções e testes descrevem o comportamento esperado.
10. **Validação na borda** — Zod nos Route Handlers antes do service.

---

## React 19 — boas práticas

1. **Componentes focados** — extrair de `App.tsx` quando crescer; manter orquestração no App, UI nos `components/`.
2. **`useEffect`** — dependências estáveis (primitivos ou `useMemo`/`useCallback`); evitar objetos inline.
3. **Estado** — preferir `useDatabase()` para dados persistidos; estado local só para UI efêmera.
4. **Handlers** — `type="button"` em botões dentro de forms; `e.stopPropagation()` em ações de cartão.
5. **i18n** — sempre `t('PT', 'EN')` via `src/utils/i18n.ts`; nunca strings fixas em um idioma só.
6. **Client components** — `'use client'` apenas onde há hooks/eventos; manter server routes em `app/api`.
7. **Performance** — evitar re-renders desnecessários; listas grandes com keys estáveis (`id`).
8. **Acessibilidade** — preferir `getByRole` nos E2E; ids estáveis quando necessário.

---

## UI (Tailwind)

### Bordas de botões (obrigatório)

- Repouso: borda **clara** (`border-slate-200` / `border-slate-800`).
- Hover/foco: borda **mais forte** (`hover:border-sky-400`, `hover:border-blue-500`).
- **Nunca** borda escura forte em repouso.

### Tons Tailwind válidos

Apenas `50–950`. **Proibido**: `slate-150`, `slate-250`, `slate-750`, etc.

### Tema e identidade

- Dark: charcoal (`#0b0f19`, `#121826`), accent `#FF6600`, sucesso emerald.
- **Um único** indicador de DB: `DB: CONECTADO` / `DB: CONNECTED` (sem duplicatas).
- Removido: "ALLURE 3 DEMO PORTAL".
- Reports: título `Feature: <nome>` (sem `@`).

### Status do ciclo de vida (UI)

`Not Started` / `In Progress` / `Passed` / `Failed` / `Blocked` / `Skipped` (+ PT equivalente). Não exibir `PASS`/`FAIL` cru na UI.

---

## Checklist antes de entregar

- [ ] Conformidade com [AGENTS.md](../../../AGENTS.md) (regras de negócio)
- [ ] TypeScript: `npm run typecheck` sem erros
- [ ] Execução continua **real** (sem simulação)
- [ ] PDF/Reports em paridade se tocou layout
- [ ] i18n PT/EN para strings novas
- [ ] Bordas de botões e tons Tailwind válidos
- [ ] TMS: singular/plural preservado

---

## Servidor local

```bash
npm run dev          # http://localhost:3000
npm run build && npm run start   # produção (E2E usa isso)
```

Se `Another next dev server is already running`: `taskkill /PID <pid> /F`, remover `.next/dev/lock`, subir uma única instância.

Robot + Browser Library: `rfbrowser init` e `npx playwright install chromium` no ambiente local.
