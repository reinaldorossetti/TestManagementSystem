# Regras de Negócio e Contexto para GPT — Centro de Execução QA TMS

> Documento adicional para orientar GPTs, agentes de código e mantenedores deste repositório.
> **Não substitui nem remove `AGENTS.md`, `GEMINI.md` ou `README.md`.** Esses arquivos continuam válidos e devem ser preservados.

## 1. Como usar este documento

Este arquivo descreve o comportamento funcional esperado do sistema e os invariantes que não podem ser quebrados durante alterações futuras.

Ao trabalhar neste projeto, um GPT deve:

1. Ler este arquivo e `AGENTS.md` antes de alterar regras de negócio.
2. Consultar o código e os testes para confirmar o comportamento atual quando houver divergência documental.
3. Tratar `prisma/schema.prisma` como contrato do modelo relacional.
4. Preservar documentos existentes; qualquer complemento deve ser criado em arquivo separado ou aplicado de forma aditiva.
5. Não transformar uma regra de interface em uma regra de persistência sem verificar o fluxo completo.
6. Atualizar testes e documentação quando uma regra contratual realmente mudar.

### Hierarquia prática de fontes

Em caso de conflito, usar esta ordem para investigar:

1. Código executado e testes de regressão atuais.
2. Schema Prisma e contratos das APIs.
3. Este documento e `AGENTS.md`, que registram invariantes de negócio.
4. `README.md` e `GEMINI.md`, usados como contexto técnico e de engenharia.
5. Relatórios temporários, logs, artefatos de execução e documentação histórica.

Se a divergência não puder ser resolvida, não invente uma regra: registre a dúvida e peça confirmação antes de alterar comportamento.

## 2. Identidade do sistema

O projeto é um Centro de Execução e Gestão de Testes que integra:

- especificações BDD/Gherkin e arquivos Robot Framework;
- importação de cenários para um Workspace;
- armazenamento dos casos em um TMS com pastas e projetos;
- execução real do Robot Framework;
- persistência relacional em SQLite por Prisma;
- histórico de execuções, passos, screenshots e relatórios;
- exportação para PDF e Excel;
- suporte PT-BR e EN-US;
- sincronização entre abas do navegador.

A execução automatizada é real. O sistema não deve voltar a simular resultados de Robot Framework quando a funcionalidade solicitar uma execução.

## 3. Stack e arquitetura

### 3.1 Stack principal

- Next.js 16 com App Router e Turbopack.
- React 19.
- TypeScript 5.8 em modo strict.
- Tailwind CSS 4.
- Prisma 7 com `@prisma/adapter-libsql`.
- SQLite relacional real.
- Zod 4 para validação de entradas de API.
- Robot Framework executado por `python -m robot`.
- Playwright para testes E2E.
- ExcelJS para `.xlsx`.
- jsPDF para PDF.
- xterm.js para o terminal ao vivo.
- `fast-xml-parser` para leitura de `output.xml`.

### 3.2 Camadas

O fluxo preferencial é:

```text
React/UI
  → Route Handlers em app/api
  → Services e validação Zod
  → Repositories
  → Prisma Client singleton
  → SQLite
```

A UI não deve acessar o banco por SQL bruto quando já existir um endpoint, service ou repository apropriado. Consultas SQL da tela SQLite devem continuar somente leitura conforme o contrato da API.

### 3.3 Arquivos de referência

| Área | Arquivos principais |
| --- | --- |
| Orquestração da aplicação | `src/App.tsx`, `app-client.tsx` |
| Parser Gherkin/Robot | `src/utils/featureLoader.ts` |
| Tags e pastas Robot | `src/utils/robotTagLoader.ts` |
| Comandos Robot | `src/utils/robotCommands.ts` |
| Execução e persistência de Robot | `src/utils/robotRunner.ts` |
| Banco no cliente | `src/hooks/useDatabase.ts`, `src/utils/sqliteEngine.ts` |
| Cliente HTTP | `src/lib/api/client.ts` |
| Prisma | `src/lib/db.ts`, `prisma/schema.prisma` |
| Repositories e services | `src/server/repositories/`, `src/server/services/` |
| Relatórios | `src/components/ExecutionReports.tsx` |
| PDF | `src/utils/pdfExporter.ts` |
| Excel | `src/utils/excelExporter.ts` |
| Status e classificação | `src/utils/testCaseClassification.ts`, `src/utils/sphereCaseExecution.ts` |
| Internacionalização | `src/utils/i18n.ts` |
| Testes E2E | `e2e/`, `playwright.config.ts` |

## 4. Parsing de Gherkin e Robot Framework

`parseGherkinFeature(content)` continua sendo o parser de especificações Gherkin comuns. Para suítes Robot que possuam `*** Test Cases ***` ou `*** Tasks ***`, a função central do fluxo de importação é `parseRobotGherkinFeature(content)` em `src/utils/featureLoader.ts`.

O parser Robot deve permanecer isolado do parser legado: usa a seção Robot e a indentação como fronteira de casos, preserva nomes não numéricos e não transforma `*** Keywords ***` ou diretivas de ciclo de vida em cenários de negócio.

### 4.1 Cabeçalhos aceitos

O parser reconhece, com ou sem `:` explícito:

- `Feature:` e `Funcionalidade:`;
- `Scenario:`;
- `Cenário:`;
- `Cenario:`;
- `Scenario Outline:`;
- `Esquema do Cenário:`.

Também reconhece um caso Robot não indentado iniciado por número, por exemplo:

```text
01 - Cenario de Teste Positivo
```

Uma linha numérica indentada não deve criar um novo cenário; a indentação indica uma ação dentro do cenário atual.

### 4.2 Passos

São reconhecidos passos BDD em português e inglês:

- `Dado`, `Dado que`, `Given`, `Given that` → `GIVEN`;
- `Quando`, `When` → `WHEN`;
- `Então`, `Then` → `THEN`;
- `E`, `And`, `Mas`, `But` → `AND`.

Ações Robot indentadas sem prefixo BDD são mantidas como passos auxiliares `AND`. O parser interrompe a interpretação de cenários ao alcançar a seção `*** Keywords ***`, para não transformar implementações de keywords em casos ou passos de negócio.

### 4.3 Metadados

O parser reconhece:

- tags pendentes iniciadas por `@`;
- `[Tags]` de cada caso;
- `[Documentation]` e suas continuações `...`;
- `Skip` e sua mensagem;
- comentários de módulo para categoria;
- classificação heurística de cenário.

`[Setup]` e `[Teardown]` são diretivas Robot de ciclo de vida, mas não devem ser tratados automaticamente como metadados de negócio ou como cenários independentes. Só devem ser incluídos no modelo se existir uma decisão explícita e testes para isso.

### 4.4 Classificação heurística

O tipo do cenário é inferido pelo título:

- `failure`: termos como falha, erro, bloqueio, rejeitado, inválido, impedimento, restrito ou vazio;
- `permission`: termos como permissão, segurança, cargo, OAuth, representante ou funcionário;
- `success`: padrão quando nenhuma regra anterior se aplica.

Essa classificação é heurística, não substitui uma classificação explícita fornecida pelo usuário.

### 4.5 Cenário ignorado

Quando um cenário contém `Skip`, o parser deve:

- marcar `isSkipped` como verdadeiro;
- preservar a mensagem em `skipMessage`;
- permitir que a execução/persistência represente o caso e seus passos como ignorados.

Não converter um cenário explicitamente ignorado em aprovado ou falho apenas porque ele não executou passos.

## 5. IDs, títulos e compatibilidade com dados legados

As regras desta seção são obrigatórias para o fluxo Workspace → TMS.

### 5.1 Prioridade do ID

`buildImportedTestCaseId(tags, scenarioTitle, fallbackId)` usa a seguinte prioridade:

1. Prefixo numérico no título do cenário.
2. Tag compatível (`RECEL`, `RCT` ou `CT`, com ou sem `@`).
3. ID de fallback gerado pelo fluxo de importação.

Exemplos:

| Entrada | ID esperado |
| --- | --- |
| `01 - Validar boleto` | `TC-01` |
| `001 - Validar boleto` | `TC-01` |
| título com tag `@TC-018`, mas prefixo `01 - ...` | `TC-01` |
| tag `@RCT07`, sem prefixo numérico | `RCT07` |

Zeros à esquerda são removidos e o número final recebe pelo menos dois dígitos. O número declarado no título tem prioridade sobre uma tag antiga ou inconsistente.

### 5.2 Título persistido

`buildImportedTestCaseTitle(caseId, scenarioTitle)` deve evitar prefixos duplicados.

Regras:

- Se o título já começa com o próprio ID e o prefixo de categoria, não concatenar novamente.
- Se o título possui prefixo numérico, remover o número textual ao montar o título e aplicar o ID normalizado.
- Se o título não possui prefixo, manter o formato compatível existente: `TC-xxx - Cenário de Teste Positivo - <descrição>`.
- Preservar a descrição significativa e não apagar palavras do cenário por causa de uma normalização.

Exemplos:

```text
01 - Cenario de Teste Positivo - Validar boleto
→ TC-01 - Cenario de Teste Positivo - Validar boleto

TC-018 - Cenário de Teste Positivo - 01 - Cenario de Teste Positivo - Validar boleto
→ não adicionar outro prefixo TC-018
```

### 5.3 Exibição de registros legados

Registros antigos podem ter ID persistido e título incompatíveis. Nesse caso:

- `getTestCaseDisplayId()` calcula o ID visual a partir do prefixo numérico do título quando ele existir;
- `getTestCaseDisplayTitle()` remove prefixos duplicados e números técnicos da exibição;
- quando o ID persistido contiver prefixo técnico de pasta (ex.: derivado de `Force Tags` como `ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01`), a exibição deve mostrar somente o identificador do teste (`TC-01`, `RCT07`, `RECEL01` etc.);
- a correção visual não deve quebrar a chave interna, referências históricas, evidências ou IDs de execução sem uma migração explícita.

Na tela de **Execução Manual**, essa identidade deve ser apresentada em duas linhas distintas: `Feature: ADICIONAR-DINHEIRO-VIA-BOLETO` e `TC-01 - Cenario de Teste Positivo - <título>`. Não concatenar o prefixo técnico da feature ao identificador visual e ao título do cenário.

O mesmo modal deve disponibilizar anexo de evidência nos dois modos da aba **Evidências**: **Arquivo** para imagem/vídeo e **Link** para URL com título opcional. O modo Link deve ter a ação explícita **Salvar link** e reutilizar o endpoint oficial de evidências.

Sempre separar, conceitualmente, o identificador persistido do identificador exibido.

### 5.4 Testes mínimos de regressão

Alterações nesse fluxo devem preservar testes para:

- `01` e `001` produzirem `TC-01`;
- número do título prevalecer sobre `@TC-018`;
- título já prefixado não ser duplicado;
- título legado com prefixos repetidos ser exibido de forma limpa;
- cenário sem prefixo manter o formato padrão.

## 6. Tags Robot e nome de pasta do TMS

`src/utils/robotTagLoader.ts` é a fonte da regra de tags de execução e nomeação de pasta.

### 6.1 Tags de execução

O dropdown de execução (`-i`) deve ser alimentado por tags reais encontradas nos arquivos `.robot` em `test_projects/`:

1. `Test Tags` na seção `*** Settings ***`;
2. `[Tags]` em cada caso de teste.

As tags são normalizadas para o valor usado pelo Robot: sem `@`, sem espaços e com separação adequada. A lista é deduplicada preservando a primeira ocorrência e pode manter `sourceFile` e `sourceFolder` para exibição e construção do comando.

A tag fictícia `@all_scenarios` não deve ser reintroduzida como se fosse uma tag nativa do Robot.

Regra de exibição no TMS: `Test Tags` da seção `*** Settings ***` não deve aparecer como tag de caso no badge/lista/detalhe. Em dados de teste, exibir somente a tag do cenário (`[Tags]`/`@`) e, quando houver identificador técnico concatenado (ex.: `ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01`), normalizar para o ID do teste (`TC-01`).

Regra visual dos cards TMS: a lista e o detalhe do cenário devem mostrar somente a tag/ID do teste e o título do cenário. Não exibir o nome da pasta ou feature no card (por exemplo, não renderizar `tc.folder` ao lado do badge) e não concatenar esse nome ao identificador visual.

### 6.2 Nome da pasta ao armazenar testes

Ao clicar em **Armazenar Testes**, `resolveRobotFolderLabel(content)` resolve a pasta nesta ordem:

1. Primeiro `Force Tags` encontrado em `*** Settings ***`;
2. primeiro `Test Tags` caso não exista `Force Tags`;
3. `Workspace Importados` como fallback final.

A primeira tag escolhida é convertida por `formatTestTagAsFolderLabel()`:

```text
adicionar_tests → Adicionar Tests
login_tests     → Login Tests
```

A conversão remove `_`, separa palavras e capitaliza cada palavra. Não usar o valor técnico cru como nome amigável quando a regra de pasta solicitar o label formatado.

Regra de escopo: `Force Tags` serve para nomeação/classificação de pasta no TMS e para composição técnica de chave interna quando necessário. `Force Tags` **não** deve ser exibido como tag de cenário, nem substituir a tag real do caso (`[Tags]`/`@`) nos badges de teste.

`Force Tags` e `Test Tags` podem ter continuações com `...`; o parser deve respeitar a seção `*** Settings ***` e não capturar diretivas de outras seções.

### 6.3 Escopo de carregamento

- Upload de `.robot` pode atualizar as tags de execução reais.
- Importação de `.feature` não deve reconstruir tags de execução a partir de tags Gherkin `@`.
- Abrir o modal **Configurar tag** deve recarregar as tags atuais de `test_projects/` e substituir tags manuais obsoletas conforme o fluxo vigente.
- Se não houver tags Robot, o seletor deve permanecer vazio até uma ação manual suportada.

## 7. Importação e armazenamento no TMS

### 7.1 Upload

Ao importar ou arrastar um novo `.feature`, `.txt` ou `.robot`:

- limpar os cenários anteriores do Workspace;
- parsear somente o novo conteúdo;
- inicializar cada cenário como não executado;
- limpar ou atualizar logs conforme o fluxo de importação;
- evitar que tags ou cenários antigos vazem para o novo arquivo.

O botão **Armazenar Testes** exige um projeto selecionado. O fluxo cria ou utiliza uma pasta sob o projeto e grava os casos derivados dos cenários atuais, incluindo passos, categoria, título, ID, histórico e status inicial.

Após o armazenamento, o sistema seleciona o primeiro caso/pasta quando aplicável e abre ou direciona para `/tms` conforme o fluxo da UI.

### 7.2 Status inicial

Casos recém-importados não podem aparecer como aprovados. O estado inicial deve ser representado como não executado e exibido como:

- PT: `Não Iniciado`;
- EN: `Not Started`.

A implementação pode usar `Not executed`, `undefined` ou outro valor interno compatível, desde que o rótulo visual e as regras de exportação sejam consistentes.

### 7.3 Cardinalidade e títulos repetidos

- A importação de `cadastro_tests.robot` deve preservar os 17 cenários atualmente presentes na suíte local, no Workspace e no TMS.
- Casos com títulos de prosa iguais, mas tags/IDs diferentes, são casos distintos e não podem ser deduplicados apenas pelo título.
- A reconciliação de reimportação deve priorizar o ID estável; a correspondência por título normalizado só é permitida quando houver exatamente uma ocorrência compatível.
- Toda alteração nessa regra deve manter uma regressão de cardinalidade para os 17 casos.

## 8. Execução real do Robot Framework

### 8.1 Comandos

- Suíte completa: `python -m robot test_projects/`.
- Execução de feature: `python -m robot --outputdir "<diretório-relativo-configurado>" -A project_args_file.txt --timestampoutputs -i <Test Tags ou Force Tags> ./`.
- Execução singular de caso: `python -m robot --include <tag-do-caso> ./`.

`buildFeatureRobotCommand(tag, sourceFolder, argsFile)` deve remover `@`, aceitar tags de suíte declaradas tanto em `Test Tags` quanto em `Force Tags`, incluir `-A <argsFile>` e `--timestampoutputs`, e usar `./` como alvo. O processo deve receber `workingDirectory` igual à pasta do projeto em `test_projects/`, para que o arquivo de argumentos e os recursos relativos sejam resolvidos pela suíte. `[Tags]` de cenário identificam o arquivo/caso selecionado, mas não devem substituir a tag de suíte na execução de feature.
`buildSingleTestRobotCommand(tag, sourceFolder)` deve remover `@`, usar `--include` e receber a tag real do caso selecionado. O alvo deve ser `./`, pois `sourceFolder` é enviado separadamente como `workingDirectory`; não duplicar `test_projects/<sourceFolder>/` no comando. Não reutilizar `filterTag` global para o botão singular.
`sourceFolder` deve vir do metadado da tag retornado por `/api/terminal/robot-tags`; uma string vazia explícita representa a raiz `test_projects/`.

### 8.2 Pontos de entrada

| Ação | Escopo |
| --- | --- |
| **Executar Feature** no Terminal/Reports | Feature ou pasta associada à tag ativa |
| **Execução** em um cartão Workspace | Cenário focalizado pela tag do cenário |
| **Executar Teste Automatizado** no detalhe TMS | Somente o caso selecionado, pela tag real e `--include` |
| **Executar Testes** na lista TMS | Todos os casos da pasta/feature selecionada |
| **Executar Todos os Testes** no Terminal ao vivo | Todas as suítes em `test_projects/` |
| Carregamento automatizado a partir do TMS | Um caso ou um conjunto, conforme a semântica do botão |

### 8.3 Pipeline de execução

1. Resolver a tag e a pasta de origem.
2. Criar um diretório `RUN-...` único.
3. Enviar o comando a `/api/terminal/run`.
4. Fazer streaming de stdout/stderr no console/xterm.
5. Persistir `output.xml` e artefatos em `results/<RUN-...>/` quando solicitado.
6. Enviar o resultado a `/api/terminal/output`.
7. Parsear o XML em execução, casos e passos.
8. Capturar screenshots/relatórios quando disponíveis.
9. Persistir o resultado relacional no SQLite.
10. Atualizar status e histórico da UI.

Após o stream do Robot ser encerrado, a UI deve sair imediatamente do estado de execução. O parse/persistência de `output.xml` e a captura opcional de `report.html`/`log.html` não podem bloquear o controle da interface. O `output.xml` é o artefato canônico: deve ser persistido diretamente pelo backend em transação antes da captura visual. Falha na captura não pode remover a execução dos Reports.

Durante a execução, o console e o Terminal Ao Vivo devem apresentar contadores em tempo real de **Total de Testes**, **Sucesso** e **Falhas**. O resumo final do Robot substitui os valores parciais.

O botão **Cancelar Execução** deve cancelar a execução identificada por `runId` no backend. No Windows, deve encerrar a árvore de processos do shell, Python e Robot; cancelar apenas a requisição do navegador não é suficiente.

Não mascarar falha de processo Robot como sucesso. O código de saída, os status do XML e a persistência devem permanecer coerentes.

### 8.4 Diretório de resultados Robot

O painel **Configurações** deve oferecer o campo **Repositório de Relatórios Robot**. O valor padrão é `results/`, é armazenado no SQLite (`robot_runtime_settings`) e é sempre um caminho relativo à raiz do projeto, por exemplo `results/robot_framework/`. Não existe variável `%ROBOT_HOME%` no sistema; valores legados com esse placeholder são migrados para caminhos relativos reais. Ao salvar, deve criar a pasta física recursivamente antes de gravar a preferência.

O preview, a linha `$ python ...` do Terminal e o comando persistido devem conter a preferência salva, por exemplo `--outputdir "results/robot_framework/"`. Para cada run, o backend substitui esse argumento pelo diretório físico `--outputdir "<diretório-configurado>/<RUN-...>" --output output.xml` antes de iniciar Python. O uso de uma subpasta única é obrigatório para não sobrescrever relatórios e evidências de execuções anteriores. O console deve exibir o `--outputdir` físico efetivo utilizado.

Após a execução, `results_path` absoluto e `results_folder` são a fonte de verdade para importar XML, capturar `report.html`/`log.html`, servir evidências e gerar PDF. Alterar o repositório em Configurações afeta somente as próximas runs; nunca pode impedir a abertura de relatórios anteriores.

### 8.5 Evidências

Os campos e diretórios de evidência devem ser preservados:

- `results_folder` na execução;
- `report_screenshot_path` na execução e no caso quando aplicável;
- `screenshot_path` nos passos;
- `robot_test_id` para vincular o teste ao nó do XML;
- screenshots de Browser/Playwright em `browser/screenshot/`;
- artefatos de log por cenário e relatório da suíte em `artifacts/`.

## 9. Semântica obrigatória dos botões TMS

A distinção entre singular e plural é uma regra de negócio, não apenas uma escolha de texto.

### 9.1 Singular: um caso

**Executar Teste Automatizado** fica no painel de detalhes do caso selecionado e deve carregar/executar somente esse caso.

Implementação de referência: `handleRunSingleTestCaseReal(currentCase)` em `src/App.tsx`.

O handler deve:

1. localizar a tag primária em `preconditions`/`[Tags]`/`@` do caso;
2. resolver a entrada correspondente em `executionTags` ou recarregar `/api/terminal/robot-tags` se o carregamento inicial ainda não terminou;
3. obter `sourceFolder` dessa entrada;
4. chamar `buildSingleTestRobotCommand()` com `--include`;
5. executar somente o caso selecionado, sem depender da tag ou pasta global atualmente selecionada.

Não ampliar esse botão para executar todos os casos da pasta.

### 9.2 Plural: conjunto de casos

**Executar Testes** fica na lista de casos, ao lado de **Criar Caso**, e deve executar todos os casos da pasta/feature selecionada.

Quando **Todas as Pastas** estiver ativo, o conjunto pode ser a suíte completa. O filtro de busca serve para apresentação e não deve restringir silenciosamente o conjunto que o botão plural executa.

Implementação de referência: `handleLoadMultipleTestCasesToWorkspace(folderCases)` em `src/App.tsx`.

Não trocar o handler plural pelo caminho singular nem alterar o Terminal ao vivo: `LiveTerminal` continua executando a suíte completa com `python -m robot test_projects/`.

Para uma pasta/feature Robot, o handler plural deve resolver as `[Tags]` dos casos até a suíte de origem e executar a feature pela sua tag de suíte (`Test Tags` ou `Force Tags`); não deve compilar uma sequência de `--include` para todos os cenários.

### 9.3 Ordenação dos cards

Os casos exibidos no TMS devem ser ordenados numericamente pelo badge/tag visual (`getSphereCaseBadgeValue()`), com o ID persistido como desempate. A ordem do banco não é contrato de apresentação.

## 10. Status do ciclo de vida

Os códigos internos e rótulos formais devem ser normalizados por `getStatusLabel()` em `src/utils/testCaseClassification.ts`.

| Código ou ausência | Rótulo PT | Rótulo EN |
| --- | --- | --- |
| ausência/novo | Não Iniciado | Not Started |
| execução ativa | Em Progresso | In Progress |
| `PASS`, `Passed`, `PASSED` | Aprovado | Passed |
| `FAIL`, `Failed`, `FAILED` | Falhou | Failed |
| `SKIP`, `Skipped`, `SKIPPED` | Ignorado | Skipped |
| `BLOCKED`, `Blocked` | Bloqueado | Blocked |

O status técnico pode continuar sendo `PASS`, `FAIL` ou `SKIP` no XML/banco, mas a interface executiva deve mostrar `Passed`, `Failed` e `Skipped` em inglês, ou os equivalentes em português.

Não usar `PASS` como rótulo final da UI quando a regra exigir `Passed`.

## 11. Banco, API e sincronização

### 11.1 Modelo relacional

O schema canônico está em `prisma/schema.prisma`. Os principais grupos são:

- `Execution`, `TestCase`, `Step`: resultados de execuções Robot;
- `TestSpec`: especificações salvas;
- `TestFolder`, `Project`, `FolderProject`: organização de projetos e pastas;
- `FolderAcceptanceDoc` e histórico: documentação de aceitação;
- `TestCaseSphere`: casos ricos do TMS;
- `SphereManualExecution`: execuções manuais;
- `TestCaseHistory`: auditoria;
- `TestCaseEvidence`: evidências manuais e links.

Relacionamentos de execução e evidências usam exclusão em cascata conforme o schema. Alterar nomes, chaves ou campos mapeados exige migração e revisão dos repositories/mappers.

### 11.2 `useDatabase`

`src/hooks/useDatabase.ts`:

- carrega um snapshot por `GET /api/database`;
- persiste mudanças por `PUT /api/database`;
- aplica debounce de 400 ms;
- evita loop de persistência ao receber dados remotos;
- sincroniza outras abas por `BroadcastChannel` (`tms_db_sync`);
- oferece reset, limpeza do histórico de execuções e SQL de leitura.

SQLite é a fonte persistente. Não reintroduzir `localStorage` como fonte principal da sincronização multi-abas.

### 11.3 Limpeza e reset

- **Reset DB** fica no card de Administração de Dados do Menu de Configuração e restaura o seed padrão.
- **Limpar Histórico** remove execuções, casos de execução e passos, preservando TMS e especificações.
- As APIs equivalentes devem manter as relações e o estado de seed coerentes.

## 12. Relatórios e exportações

### 12.1 Reports

A rota `/reports` lista execuções reais em ordem mais recente primeiro, com filtros por status e busca por ID, comando ou caminho de resultado.

O detalhe deve manter:

- identidade `Feature: <nome>` sem prefixo `@` na apresentação;
- badge de status;
- timestamp e comando compilado;
- métricas total, passed, failed, skipped e broken quando aplicável;
- árvore de cenários por categoria;
- metadados técnicos e caminho de resultados;
- botão de exportação PDF;
- botão de nova execução conforme o escopo da feature.

Quando não houver uma execução no banco ou quando o operador precisar recuperar um artefato existente, a tela deve oferecer **Ler último relatório Robot**. A ação encontra o `output.xml` mais recente no diretório configurado (ex.: `results/robot_framework/`), varrendo subpastas recursivamente e usando `results/` como fallback de compatibilidade. Ela faz parse, persiste/atualiza a execução de forma idempotente e atualiza a listagem. Ela deve salvar `results_path` com o caminho físico absoluto de `output.xml` e `results_folder` com a pasta da run, para que Reports e PDF localizem as evidências. Ela não deve depender do estado em memória da aba Terminal.

### 12.2 PDF

`src/utils/pdfExporter.ts` deve manter paridade visual e semântica com Reports.

Regras:

- resolver e validar a pasta física da execução;
- bloquear exportação se não houver pasta ou imagens exigidas;
- incorporar pelo menos uma evidência antes de concluir o download;
- usar nome `Relatorio_Execucao_com_evidencias_YYYY-MM-DD_HH-MM-SS.pdf`;
- mostrar árvore BDD/Gherkin, filtrando keywords internas Robot quando a seção for de passos de negócio;
- incluir evidências por cenário, logs Robot e relatório da suíte quando existentes;
- manter layout de coluna única e quebras de página legíveis.

APIs de apoio: `/api/terminal/resolve-folder`, `/api/terminal/evidence` e `/api/terminal/screenshot`.

Qualquer mudança visual importante em Reports deve ser refletida no PDF, e vice-versa.

### 12.3 Excel

`src/utils/excelExporter.ts` gera um workbook com:

1. **Resumo Executivo** com KPIs e cobertura por pasta;
2. **Matriz Geral de Testes** com autofiltro;
3. uma aba por feature/pasta.

Campos e regras de exportação incluem severidade, criticidade, status, teste automatizado, complexidade, observação e links de evidência. Valores de severidade são `Critical`, `High`, `Medium` e `Low`; o dropdown de status deve aceitar os valores formais atuais (`Passed`, `Skipped`, `Failed`, `Blocked`) quando aplicável.

Links devem ser hyperlinks reais quando o dado possuir uma URL válida. Não fabricar evidência ou link apenas para preencher uma coluna.

## 13. Internacionalização

O idioma é `PT` ou `ENG`, e a função central é:

```ts
const t = createTranslator(language);
t('Texto em português', 'Text in English');
```

Novos textos de UI, mensagens de terminal, rótulos de status, relatórios e argumentos Robot devem respeitar o idioma ativo. Não duplicar indicadores ou rótulos em português e inglês na mesma tela quando a regra pedir uma única apresentação.

O cabeçalho deve possuir um único indicador de conexão do banco:

- PT: `DB: CONECTADO`;
- EN: `DB: CONNECTED`.

Ele deve ter LED verde estável. Não adicionar um segundo botão redundante como `Banco: CONECTADO`.

## 14. Regras visuais

Todos os botões devem seguir o padrão:

- repouso: borda clara e suave;
- hover, foco ou seleção: borda mais forte/destacada;
- estado desabilitado: visual claramente inativo, sem parecer selecionado.

Use tons Tailwind válidos: `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` e `950`.

Não usar tons inexistentes como `slate-150`, `slate-205`, `slate-250`, `slate-705` ou `slate-750`. Quando uma cor intermediária for necessária, arredondar para o tom válido mais próximo.

Evitar refatorações visuais amplas ao corrigir uma regra funcional. Preservar acessibilidade, `data-testid` existentes e a semântica dos controles.

## 15. Testes e validação

### 15.1 Comandos do projeto

- `npm run typecheck`: valida TypeScript.
- **Build de validação obrigatório:** `node .\node_modules\next\dist\bin\next build`.
- `npm run test:e2e`: executa Playwright.
- `npm run test:e2e:ui`: abre Playwright em modo interativo.
- `npm run test:e2e:report`: abre o relatório HTML.
- `npm run db:generate`: gera o client Prisma.
- `npm run db:migrate`: aplica migrações de desenvolvimento.
- `npm run db:seed`: executa o seed.
- `npm run db:reset`: recria o banco e o seed.

Nesta máquina, não usar `npm run build` para validar alterações: o launcher do NVM pode resolver `NVM_HOME` para o perfil de outro usuário e falhar antes de iniciar o projeto com `EPERM`. O build deve sempre chamar o CLI local do Next.js pelo comando acima. A geração Prisma é uma etapa separada; se for necessária, validar a compatibilidade do CLI Prisma e do Node ativo antes de executá-la.

### 15.2 E2E

O Playwright é configurado para usar o servidor de produção (`npm run build && npm run start`) e `workers: 1`, porque os testes compartilham o SQLite.

Ao criar regressão de importação, preferir validar:

- upload e parse do arquivo;
- quantidade de cenários no Workspace;
- log de importação;
- resultado do botão **Armazenar Testes**;
- pasta e título/ID no TMS;
- persistência após sincronização.

Também manter regressões para:

- os 17 casos da suíte `cadastro_tests.robot` após armazenamento;
- ordenação numérica dos badges TMS;
- comando singular contendo `--include <tag-do-caso>`, sem a tag global da suíte e com o `sourceFolder` correto.

Os testes `e2e/feature-loader.spec.ts` são a referência de baixo custo para regras de IDs, títulos e pastas. Alterações em seletores devem preservar os `data-testid` do Terminal e do Workspace.

### 15.3 Verificação após alteração

Para uma alteração documental, executar ao menos uma verificação de integridade do diff. Para alterações de código, executar os testes focados, `npm run typecheck` e, quando o escopo justificar, `node .\node_modules\next\dist\bin\next build` e a suíte E2E.

## 16. Checklist obrigatório para futuros GPTs

### Antes de editar

- [ ] Identificar se a mudança é funcional, visual, de dados, de execução ou apenas documental.
- [ ] Ler o arquivo alvo e as funções chamadoras antes de editar.
- [ ] Consultar `AGENTS.md` e esta lista de invariantes.
- [ ] Procurar testes existentes para o fluxo.
- [ ] Verificar se existe dado legado ou referência persistida que não pode ser quebrada.

### Durante a implementação

- [ ] Preservar APIs públicas, nomes de campos e `data-testid` sem necessidade explícita de mudança.
- [ ] Não duplicar prefixos de ID em títulos.
- [ ] Priorizar prefixo numérico do cenário ao gerar ID.
- [ ] Usar `Force Tags` antes de `Test Tags` para nomear pastas.
- [ ] Manter execução Robot real e evidências reais.
- [ ] Respeitar singular/plural dos botões TMS.
- [ ] Usar `--include` e a tag real do caso no botão singular do TMS; não usar `filterTag` global.
- [ ] Preservar cardinalidade de importações Robot e a ordenação numérica dos cards TMS.
- [ ] Usar `createTranslator()` para textos novos.
- [ ] Usar bordas claras em repouso e classes Tailwind válidas.
- [ ] Não apagar documentos existentes.

### Depois da implementação

- [ ] Adicionar ou atualizar regressão para a regra alterada.
- [ ] Rodar typecheck, os testes relevantes e o build pelo CLI local: `node .\node_modules\next\dist\bin\next build`.
- [ ] Conferir schema/API se houver mudança de persistência.
- [ ] Executar `git diff --check`.
- [ ] Revisar se Reports e PDF continuam semanticamente alinhados.
- [ ] Atualizar este documento ou `AGENTS.md` somente de forma aditiva quando uma regra mudar.

## 17. Referências permanentes

- [`AGENTS.md`](AGENTS.md): regras de negócio e decisões já registradas.
- [`GEMINI.md`](GEMINI.md): diretrizes de persona e engenharia.
- [`README.md`](README.md): documentação técnica e operação do projeto.
- [`prisma/schema.prisma`](prisma/schema.prisma): contrato relacional.
- [`src/utils/featureLoader.ts`](src/utils/featureLoader.ts): parser e normalização de IDs/títulos.
- [`src/utils/robotTagLoader.ts`](src/utils/robotTagLoader.ts): tags e resolução de pasta.
- [`src/utils/robotCommands.ts`](src/utils/robotCommands.ts): comandos Robot.
- [`src/hooks/useDatabase.ts`](src/hooks/useDatabase.ts): persistência e sincronização.
- [`e2e/feature-loader.spec.ts`](e2e/feature-loader.spec.ts): regressões de importação.

Este arquivo é deliberadamente adicional: sua criação não autoriza a remoção, substituição ou truncamento de nenhuma documentação existente.
