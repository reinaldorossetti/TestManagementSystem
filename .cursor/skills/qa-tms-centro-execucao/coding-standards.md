# Padrões de Código — resumo (ver GEMINI.md completo)

## Persona

Engenheiro sênior de QA automation + front-end: código production-ready, tipado, alinhado a `AGENTS.md`.

## TypeScript

- Modo `strict`; evitar `any`.
- Enums TS padrão (não `const enum` se valores usados em runtime).
- Return types explícitos em utils e services públicos.
- `import type` para tipos; imports de valores/enums normais quando executáveis.
- Optional chaining e nullish coalescing preferidos a non-null assertion.

## Clean Code (SOLID aplicado)

| Princípio | Aplicação no projeto |
|-----------|---------------------|
| SRP | Route → service → repository; componentes só UI |
| OCP | Estender via utils/services, não ifs espalhados na UI |
| DIP | UI depende de `apiClient`, não de Prisma |
| DRY | Reusar `robotCommands`, `robotRunner`, `i18n` |
| KISS | Diff mínimo; sem abstrações prematuras |

### Checklist de qualidade

- Uma mudança lógica por entrega.
- Sem secrets em commits.
- Sem código comentado ou morto. Faça docstring nas funções.
- Erros com mensagens úteis para o operador QA.
- Testes E2E quando mudança afeta fluxo crítico (Terminal, Reports, PDF).

## React 19

### Estado

- Dados persistidos: `useDatabase()` + API.
- Estado de UI local: `useState` no componente mais próximo.
- Evitar prop drilling profundo — extrair hook se necessário.

### Effects

```typescript
// Bom: dependências estáveis
useEffect(() => {
  void loadTags();
}, [filterTag, isConfigOpen]);

// Evitar: objeto/array inline nas deps
```

### Componentes

- Presentational em `components/`; orquestração em `App.tsx`.
- Props tipadas com interface dedicada.
- Event handlers nomeados (`handleRunFeatureReal`, não lambdas anônimas complexas em JSX profundo).

### Performance

- `useMemo` / `useCallback` só quando há custo mensurável ou deps de effect.
- Keys em listas: `id` estável, nunca índice em listas mutáveis.

## Tailwind e UI (GEMINI.md)

### Visual

- Dark theme: `#0b0f19`, `#121826`, accent `#FF6600`.
- Tipografia: Space Grotesk (títulos), Inter (corpo), JetBrains Mono (terminal).
- Animações sutis com `motion/react`.
- Sem "telemetry slop" em headers (CORE_NODE_ONLINE, etc.).

### Botões

```
border-slate-200 hover:border-blue-500     # tema claro
border-slate-800 hover:border-sky-500      # tema escuro
```

### Localização

```typescript
const label = t('Executar Feature', 'Execute Feature');
```

Toda string visível ao usuário passa por `t()`.

## Robot / Gherkin

- Respeitar `featureLoader.ts` para parsing.
- Tags Robot reais apenas; sem `@all_scenarios`.
- Status UI: Passed/Failed/Skipped, não PASS/FAIL cru.

## Testes

### E2E (Playwright)

- POM: `e2e/pages/Feature*.ts`, `BasePage.ts`.
- Títulos Given/When/Then; sem Cucumber.
- Seletores: `id` → `getByRole` → `data-testid`.
- `workers: 1` (SQLite compartilhado).

### Validação manual/automática Robot

```bash
rfbrowser init
npx playwright install chromium
node scripts/test-full-flow-pdf.mjs http://localhost:3000 --login-only
npm run test:e2e
```

## Commits e PRs

- Mensagem focada no **porquê**.
- Não commitar `.next/`, `results/`, `prisma/dev.db` sem intenção.
- Documentar em `AGENTS.md` apenas mudanças de regra de negócio relevantes (quando solicitado).
