# Estrutura do Projeto — QA TMS

```
TestManagementSystem/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend REST (Route Handlers)
│   │   ├── database/             # GET/PUT snapshot, reset, clear-executions
│   │   ├── executions/           # CRUD execuções
│   │   ├── terminal/             # run, output, evidence, screenshot, robot-tags, resolve-folder
│   │   ├── test-specs/           # Repositório de specs
│   │   ├── test-cases-sphere/    # Casos TMS
│   │   ├── folders/              # Pastas TMS
│   │   └── sql/                  # SQL somente-leitura
│   ├── terminal/page.tsx
│   ├── reports/page.tsx
│   ├── sqlite/page.tsx
│   ├── tms/page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── src/
│   ├── App.tsx                   # Orquestrador principal dos painéis
│   ├── components/
│   │   ├── ExecutionReports.tsx  # Reports + drill-down Allure
│   │   ├── LiveTerminal.tsx      # xterm.js + run all
│   │   └── TMSDevice.tsx         # Emulador mobile (não é execução Robot)
│   ├── hooks/useDatabase.ts      # Estado + API + BroadcastChannel
│   ├── lib/
│   │   ├── db.ts                 # Prisma singleton
│   │   └── api/client.ts         # Cliente HTTP tipado
│   ├── server/
│   │   ├── repositories/         # Prisma por entidade
│   │   ├── services/             # Regras de negócio
│   │   ├── validation/schemas.ts # Zod
│   │   ├── robot/                # Parse output.xml, paths, resolve folder
│   │   └── mappers/dbMappers.ts
│   └── utils/
│       ├── featureLoader.ts      # Parser Gherkin/Robot
│       ├── robotRunner.ts        # Streaming Robot + persist
│       ├── robotCommands.ts      # buildFeatureRobotCommand
│       ├── robotTagLoader.ts     # Tags de robot-sample/
│       ├── pdfExporter.ts        # PDF com evidências
│       ├── excelExporter.ts      # Export .xlsx
│       ├── sqliteEngine.ts       # Tipos Db* + seed
│       └── i18n.ts
│
├── robot-sample/                 # Suítes Robot (.robot)
├── results/                      # RUN-* (output.xml, screenshots, artifacts)
├── prisma/schema.prisma
├── e2e/                          # Playwright POM + specs
├── scripts/                      # test-full-flow-pdf.mjs, etc.
├── AGENTS.md                     # Regras de negócio (canônico)
├── GEMINI.md                     # Padrões dev/UI (canônico)
└── README.md                     # Documentação técnica
```

## Responsabilidades por camada

| Camada | Onde | Faz |
|--------|------|-----|
| UI | `src/App.tsx`, `src/components/` | Render, eventos, i18n |
| Hooks | `src/hooks/` | Estado cliente + sync |
| API | `app/api/**/route.ts` | HTTP, auth de entrada, chama service |
| Service | `src/server/services/` | Transações, orquestração |
| Repository | `src/server/repositories/` | Queries Prisma |
| Utils | `src/utils/` | Parser, exportadores, comandos Robot |

## APIs Terminal (execução real)

| Endpoint | Uso |
|----------|-----|
| `POST /api/terminal/run` | Executa comando Robot, streaming stdout |
| `POST /api/terminal/output` | Parse output.xml + screenshots |
| `GET /api/terminal/evidence` | Lista imagens da pasta RUN |
| `GET /api/terminal/screenshot` | Serve imagem para PDF/UI |
| `GET /api/terminal/robot-tags` | Tags de robot-sample/ |
| `GET /api/terminal/resolve-folder` | Resolve pasta física da execução |
