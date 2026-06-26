# Regras de Negócio — resumo (ver AGENTS.md completo)

## Parser (`featureLoader.ts`)

- Cenários: `Scenario:`, `Cenário:`, `Cenario:`, `Scenario Outline:`, `Esquema do Cenário:` — `:` opcional.
- `Skip msg=...` → status `SKIP` em caso e passos.
- Passos BDD: `Dado/Quando/Então/E/Mas` e equivalentes EN; keywords indentadas → `AND`.
- Status inicial após upload: **`Not executed`** até execução real.

## Upload e estado

- Novo arquivo `.feature`/`.robot`/`.txt` → limpa cenários anteriores da workspace.
- Tags de execução no Terminal vêm de **`robot-sample/`** e `.robot` importado — não de `@` do Gherkin.
- Modal **Configurar tag**: recarrega da API; delete com `setExecutionTags(prev => ...)`.

## Execução (100% real)

| Botão | Escopo |
|-------|--------|
| Execução (cartão) | Um cenário por tag → `handleRunFeatureReal(tag)` |
| Executar Feature | Tag ativa no dropdown → `handleRunFeatureReal()` |
| Live Terminal — Run All | `python -m robot robot-sample/` |
| Reporte | Navega para `/reports` |

Comandos exemplo:
```bash
python -m robot -i login_tests robot-sample/login_tests.robot
python -m robot -i LT06 robot-sample/login_tests.robot
```

Persistência: `results_folder`, `report_screenshot_path`, `screenshot_path` nos steps.

## TMS — singular vs plural (imutável)

| Botão | Escopo | Handler |
|-------|--------|---------|
| Executar **Teste** Automatizado | 1 caso selecionado | `handleLoadTestCaseToWorkspace` |
| Executar **Testes** | Todos da pasta/feature | `handleLoadMultipleTestCasesToWorkspace` |

Filtro de busca na lista **não** restringe execução plural.

## Reports

- Ordenação: `timestamp` DESC.
- Título: `Feature: <tag>` (sem `@`).
- PDF bloqueado sem evidências em `results/`.
- Paridade visual tela ↔ PDF obrigatória.

## Excel (.xlsx)

- Abas: Resumo, Matriz, por Feature.
- `dataValidation`: Severidade, Criticidade, Automatizado.
- Status válidos: `Passed, Skipped, Failed, Blocked`.

## Configuração

- Reset DB apenas no menu Configurações (não no header).
- Sync multi-abas via BroadcastChannel.

## i18n

- PT-BR / EN-US em toda UI via `t(pt, en)`.
- Um único botão `DB: CONECTADO` / `CONNECTED`.

## O que NÃO fazer

- Reintroduzir execução simulada ou `@all_scenarios`.
- Duplicar indicador de conexão DB.
- Alterar escopo singular/plural dos botões TMS.
- Usar tons Tailwind inválidos (`slate-250`, etc.).
- Quebrar paridade Reports/PDF.
