# 📐 Especificação Técnica & Arquitetural: Autenticação, Cadastro e Governança de Acesso

**Projeto:** Centro de Execução QA TMS  
**Módulo:** Gestão de Identidade, Autenticação e Perfis (RBAC)  
**Versão:** 2.1.0  
**Data:** 19 de Outubro de 2026  
**Status:** Aprovado para Implementação  
**Autores:** Especialista Senior Fullstack & QA Architecture  

---

## 🎯 1. Visão Geral e Objetivos de Negócio

Este documento estabelece a especificação técnica detalhada para a implementação do ecossistema de **Autenticação, Cadastro de Usuários, Controle de Acesso Baseado em Papéis (RBAC)** e **Bloqueio Crítico de Contas** no **Centro de Execução QA TMS**.

### Princípios Norteadores:
1. **Segurança Extrema (Zero Trust / OWASP Top 10)**: Nenhuma brecha de enumeração, injeção, CSRF, XSS ou força bruta.
2. **Política de Senha Forte**: Padrão **NIST SP 800-63B** com cálculo de entropia em tempo real e verificação anti-dicionário.
3. **Regra de Bloqueio Rígida (3 Tentativas)**: Acesso bloqueado sumariamente após exatamente **3 tentativas falhas consecutivas**.
4. **Desbloqueio Exclusivo por Administrador**: **Proibido desbloqueio automático por tempo** ou auto-recuperação desgovernada. Apenas usuários com a role `admin` podem restabelecer o acesso de uma conta bloqueada.
5. **Perfis de Acesso Especializados**: Hierarquia RBAC dividida em `admin`, `analyst` e `tester`.

---

## 👥 2. Matriz de Perfis e Permissões (RBAC)

O sistema define três perfis com segregação de funções (*Separation of Duties*):

| Funcionalidade / Recurso | `admin` (Administrador) | `analyst` (Analista QA) | `tester` (Testador / Operador) |
|---|:---:|:---:|:---:|
| **Acessar Terminal de Execução Robot** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Executar Testes (Singular / Plural)** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Registrar Evidências Manuais** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Visualizar Relatórios e SQLite Browser** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Criar / Editar Casos de Teste (TMS)** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Editar Documentos de Critérios de Aceite** | ✅ Sim | ✅ Sim | ❌ Leitura apenas |
| **Exportar Relatórios Executivos (Excel/PDF)** | ✅ Sim | ✅ Sim | ❌ Não |
| **Acessar Painel de Gestão de Usuários** | ✅ Sim | ❌ Não | ❌ Não |
| **Desbloquear Usuários Travados (3 falhas)** | ✅ **Exclusivo** | ❌ Proibido | ❌ Proibido |
| **Alterar Perfil de Usuários (RBAC)** | ✅ **Exclusivo** | ❌ Proibido | ❌ Proibido |
| **Configurar Repositório Robot / Reset DB** | ✅ **Exclusivo** | ❌ Proibido | ❌ Proibido |

### 2.1. Identificação Visual de Perfil e Governança no Header Corporativo

A interface da aplicação expõe de forma proeminente e reativa a identidade do operador autenticado no cabeçalho superior (`Header.tsx`). Usuários com privilégio `admin` recebem distintivo roxo (`ADMIN`), além do botão de atalho com ícone de escudo para o **Painel de Gestão e Governança de Usuários**, permitindo auditoria e destrave imediato de contas:

![Identificação Visual do Usuário e Badge RBAC no Header](images/auth_user_header_badge.png)
*Figura 1: Cabeçalho corporativo do Centro de Execução TMS destacando a pílula de sessão ativa com a badge de perfil RBAC (ADMIN), ícone de escudo para governança e botão de logout seguro.*

---

## 🔒 3. Regra Mandatória de Bloqueio e Desbloqueio de Contas

```
   ┌───────────────────────────────────────────────────────────────┐
   │                    Tentativa de Autenticação                  │
   └───────────────────────────────┬───────────────────────────────┘
                                   │
                           Credenciais Válidas?
                                ├── Sim ──> Reseta failedAttempts = 0
                                │           Emite Cookie HttpOnly
                                │           Redireciona para Workspace
                                │
                                └── Não ──> failedAttempts = failedAttempts + 1
                                            Grava log de auditoria
                                            │
                                  failedAttempts >= 3?
                                        ├── Não ──> Alerta visual ("Credenciais inválidas. Tentativa X de 3.")
                                        │
                                        └── Sim ──> STATUS = "BLOCKED"
                                                    lockedAt = now()
                                                    failedAttempts = 3
                                                    Grava AUTH_ACCOUNT_LOCKED
                                                    │
                                                    ▼
                     ┌───────────────────────────────────────────────┐
                     │          CONTA PERMANENTEMENTE BLOQUEADA      │
                     │  (Sem auto-desbloqueio / Sem timeout)         │
                     └──────────────────────┬────────────────────────┘
                                            │
                       Solicitação de Desbloqueio ao Admin
                                            │
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │     ADMINISTRADOR EFETUA DESBLOQUEIO          │
                     │  POST /api/admin/users/:id/unlock             │
                     │  • status = "ACTIVE"                          │
                     │  • failedAttempts = 0                         │
                     │  • lockedAt = null                            │
                     │  • Audit: ADMIN_USER_UNLOCKED                 │
                     └───────────────────────────────────────────────┘
```

### 3.1. Regra de Bloqueio (3 Falhas):
1. Cada usuário possui o campo numérico `failedAttempts` inicializado em `0`.
2. A cada submissão com e-mail correto e senha incorreta:
   - **Tentativa 1**: `failedAttempts = 1`. Mensagem: `"Credenciais inválidas. Tentativa 1 de 3."`
   - **Tentativa 2**: `failedAttempts = 2`. Mensagem: `"Credenciais inválidas. Tentativa 2 de 3. Atenção: sua conta será bloqueada na próxima falha."`
   - **Tentativa 3**: `failedAttempts = 3`, `status = 'BLOCKED'`, `lockedAt = DateTime.now()`.

![Alerta Progressivo de Tentativas no Login](images/auth_login_attempts.png)
*Figura 2: Alerta visual progressivo indicando que 2 tentativas já foram consumidas e que a próxima falha bloqueará o acesso.*

3. Uma vez com status `BLOCKED`:
   - Qualquer nova tentativa de login é barrada imediatamente antes do hash de senha:
     `"Conta bloqueada por excesso de tentativas (3/3). Entre em contato com um Administrador para reativar seu acesso."`
   - **Não existe tempo de expiração do bloqueio**. O usuário permanecerá bloqueado até que um `admin` realize o desbloqueio explícito.

![Tela de Bloqueio Crítico na 3ª Tentativa](images/auth_account_locked.png)
*Figura 3: Substituição imediata do formulário pelo componente LockedAccountNotice, informando o bloqueio permanente e a política de destrave exclusivo por Administrador.*

### 3.2. Fluxo de Desbloqueio Exclusivo por Administrador:
1. Usuário com papel `admin` autenticado acessa a visualização de **Gestão de Acessos** através do botão de escudo no cabeçalho ou modal de governança.
2. O painel lista analistas cadastrados com badge vermelho em destaque: `🔴 BLOQUEADO (3/3)`.
3. Ao clicar no botão **"🔓 Desbloquear Conta"**:
   - É disparada a rota: `POST /api/admin/users/{userId}/unlock`
   - O backend valida a sessão: se `req.session.role !== 'admin'`, retorna `HTTP 403 Forbidden`.
   - Se autorizado, executa transação no SQLite:
     ```typescript
     await prisma.user.update({
       where: { id: targetUserId },
       data: {
         status: 'ACTIVE',
         failedAttempts: 0,
         lockedAt: null,
       },
     });
     ```
   - Registra auditoria obrigatória:
     ```typescript
     await prisma.securityAuditLog.create({
       data: {
         userId: targetUserId,
         event: 'ADMIN_USER_UNLOCKED',
         details: `Conta desbloqueada pelo administrador ${adminUser.name} (${adminUser.email})`,
         ipAddress: clientIp,
         userAgent: userAgent,
       },
     });
     ```

![Painel de Governança de Usuários e Desbloqueio Admin](images/auth_admin_governance.png)
*Figura 4: Modal administrativo exclusivo para o perfil Admin, exibindo o usuário com status BLOQUEADO (3/3) e a ação de desbloqueio em verde.*

---

## 🔑 4. Política de Senha Forte (NIST SP 800-63B)

Toda senha no cadastro ou alteração deve cumprir os requisitos sem concessões:

1. **Tamanho**: Mínimo de 12 caracteres (máximo 128).
2. **Complexidade**:
   - Ao menos 1 letra maiúscula (`[A-Z]`)
   - Ao menos 1 letra minúscula (`[a-z]`)
   - Ao menos 1 algarismo numérico (`[0-9]`)
   - Ao menos 1 caractere especial (`[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]`). Observação não pode conter espaçamentos, e os caracteres "'", "=", "\"", "´", "`", "'" (aspas simples ou duplas) não são permitidos.
3. **Validação Anti-Dicionário**:
   - Rejeição automática de senhas da lista de vulnerabilidades conhecidas (top 10.000 senhas expostas).
4. **Isolamento de Dados Pessoais**:
   - A senha não pode conter o primeiro nome, sobrenome ou username/e-mail do usuário.
5. **Histórico de Senhas**:
   - Tabela `password_history` retém as últimas 3 senhas hasheadas; nova senha não pode ser idêntica a nenhuma das 3 anteriores.

![Tela de Cadastro com Validação de Senha em Tempo Real](images/auth_register_strength.png)
*Figura 5: Tela de Cadastro de Usuário QA demonstrando o RoleSelector e o medidor de força de senha interativo com todos os critérios atendidos e barra 100% verde (Excelente).*

![Detecção e Bloqueio Imediato de Caracteres Proibidos e Espaços](images/auth_register_forbidden_chars.png)
*Figura 6: Feedback visual dinâmico em tempo real exibindo alerta vermelho quando o usuário tenta inserir caracteres proibidos (", =, ', ´, `) ou espaços em branco, rebaixando a força da senha e bloqueando a submissão.*

---

## 🛡️ 5. Blindagem contra Falhas de Segurança (OWASP Top 10)

| Vulnerabilidade OWASP | Mitigação Técnica no Projeto TMS |
|---|---|
| **A01: Broken Access Control** | Middleware Next.js (`middleware.ts`) interceptando rotas privadas. Validação rígida de papel (`admin`) em rotas administrativas e no endpoint de desbloqueio. |
| **A02: Cryptographic Failures** | Algoritmo **Argon2id** (ou `bcrypt` com fator de trabalho 12 e salt de 16 bytes). Tokens de sessão gerados com 256 bits de entropia e salvos como hash SHA-256 no SQLite. |
| **A03: Injection (SQL / XSS)** | Zero queries dinâmicas concatenadas. Uso estrito do Prisma ORM parametrizado. Validação e sanitização Zod em 100% dos dados de entrada. |
| **A04: Insecure Design** | Bloqueio permanente na 3ª falha; equalização temporal de resposta contra *timing attacks* na comparação de credenciais. |
| **A05: Security Misconfiguration** | Cabeçalhos HTTP de segurança obrigatórios: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`. |
| **A07: Identification and Authentication Failures** | Política de senha forte estrita; bloqueio na 3ª tentativa; cookies `HttpOnly`, `Secure` e `SameSite=Strict`. |
| **A08: Software and Data Integrity Failures** | TypeScript estrito (`Zero any`), validação Zod de entrada e saída, DTOs explícitos. |

---

## 🗄️ 6. Esquema do Banco de Dados Relacional (Prisma)

Modelos a serem integrados em [prisma/schema.prisma](file:///d:/github-projects/TestManagementSystem/prisma/schema.prisma):

```prisma
/// Perfis de acesso permitidos no sistema
enum UserRole {
  ADMIN    @map("admin")
  ANALYST  @map("analyst")
  TESTER   @map("tester")
}

/// Status da conta do usuário
enum UserStatus {
  ACTIVE   @map("ACTIVE")
  BLOCKED  @map("BLOCKED")
  PENDING  @map("PENDING")
}

/// Usuários autenticados da plataforma TMS
model User {
  id             String      @id @default(cuid())
  email          String      @unique
  passwordHash   String      @map("password_hash")
  name           String
  role           String      @default("tester") // admin, analyst, tester
  status         String      @default("ACTIVE") // ACTIVE, BLOCKED, PENDING
  failedAttempts Int         @default(0) @map("failed_attempts")
  lockedAt       DateTime?   @map("locked_at")
  lastLoginAt    DateTime?   @map("last_login_at")
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  sessions       Session[]
  passwordHistories PasswordHistory[]
  auditLogs      SecurityAuditLog[]

  @@map("users")
}

/// Sessões ativas autenticadas com tokens de alta entropia
model Session {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  tokenHash  String   @unique @map("token_hash")
  userAgent  String?  @map("user_agent")
  ipAddress  String?  @map("ip_address")
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@map("sessions")
}

/// Histórico de senhas criptografadas (evita repetição das últimas 3)
model PasswordHistory {
  id           Int      @id @default(autoincrement())
  userId       String   @map("user_id")
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_history")
}

/// Trilha de auditoria e segurança permanente
model SecurityAuditLog {
  id        Int      @id @default(autoincrement())
  userId    String?  @map("user_id")
  event     String
  details   String?
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  timestamp DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([event])
  @@map("security_audit_logs")
}
```

---

## 💻 7. Design das Telas e Componentes (Frontend Next.js)

### 7.1. Componentes em `src/components/auth/`
1. **`AuthLayout.tsx`**: Contêiner dark `#0b0f19` com marca d'água técnica, logotipo TMS e transições com `motion/react`.
2. **`PasswordInput.tsx`**:
   - Alternância de visibilidade com ícone de olho (`Eye` / `EyeOff`).
   - Rótulos acessíveis para leitores de tela (`aria-pressed`, `aria-label`).
3. **`PasswordStrengthMeter.tsx`**:
   - Barra de progresso colorida por entropia.
   - Lista dinâmica de 5 critérios (12+ caracteres, maiúscula, minúscula, número, caractere especial).
4. **`RoleSelector.tsx`**:
   - Seleção interativa dos perfis `admin`, `analyst` e `tester` com cartões visuais explicativos de cada permissão.
5. **`LockedAccountNotice.tsx`**:
   - Card de alerta estilizado em tom carmim/vermelho quando a conta atinge 3 falhas, exibindo orientações claras para contatar um usuário administrador.

![Tela de Login Corporativa do Centro de Execução TMS](images/auth_login.png)
*Figura 7: Interface oficial de Login no tema escuro `#0b0f19` com destaque em laranja `#FF6600`, inputs com foco estilizado e seletor de idiomas.*

### 7.2. Painel de Usuários para Administrador (`/admin/users`)
- Acessível apenas quando `currentUser.role === 'admin'`.
- Tabela de analistas cadastrados contendo:
  - Nome, E-mail, Papel (`admin`, `analyst`, `tester`), Status (`Ativo`, `Bloqueado`), Tentativas Falhas (`X/3`).
  - Botão **`🔓 Desbloquear Conta`** habilitado especificamente para registros com status `BLOCKED`.
  - Confirmação com modal de segurança antes de disparar o desbloqueio.

![Modal Administrativo de Gestão e Desbloqueio de Usuários](images/auth_admin_governance.png)
*Figura 8: Painel administrativo de controle de usuários acessível via cabeçalho para usuários com o perfil Admin.*

---

## 🧪 8. Plano de QA e Automação de Testes

### 8.1. Matriz Playwright E2E (`e2e/specs/frontend/auth-lockout.spec.ts`)
- `[TC-01]` — **Fluxo Feliz Login**: Usuário com senha forte loga com sucesso e acessa o Terminal TMS.
- `[TC-02]` — **1ª Tentativa Falha**: Digita senha incorreta. Sistema exibe: *"Tentativa 1 de 3"*. Contador no banco = 1.
- `[TC-03]` — **2ª Tentativa Falha**: Digita senha incorreta novamente. Sistema exibe: *"Tentativa 2 de 3"*. Contador = 2.
- `[TC-04]` — **3ª Tentativa Falha (Bloqueio)**: Na terceira falha, status passa para `BLOCKED`. Tela exibe card de bloqueio permanente orientando contato com o Admin.
- `[TC-05]` — **Tentativa de Acesso Bloqueado**: 4ª tentativa de login não consulta senha e exibe aviso de conta bloqueada.
- `[TC-06]` — **Desbloqueio por Admin**:
  1. Usuário administrador loga no sistema.
  2. Acessa o Painel de Gestão de Usuários.
  3. Clica em "Desbloquear Conta" no usuário bloqueado.
  4. Efetua logout.
  5. Usuário anteriormente bloqueado realiza login com sucesso.
- `[TC-07]` — **Tentativa de Desbloqueio por Não-Admin**: Usuário `tester` ou `analyst` tenta disparar `POST /api/admin/users/:id/unlock` e recebe `403 Forbidden`.

### 8.2. Matriz Playwright API (`e2e/specs/api/auth-security.spec.ts`)
- Validação de integridade de endpoints, verificação de cabeçalhos de cookies `HttpOnly; SameSite=Strict`, testes de injeção SQL nos payloads e validação do rate-limit de segurança.

---

## 📅 9. Cronograma de Implementação

1. **Fase 1 — Banco e Migração Prisma**: Criação dos modelos `User`, `Session`, `PasswordHistory`, `SecurityAuditLog`.
2. **Fase 2 — Camada de Serviços e Schemas Zod**: `authService.ts`, `userRepository.ts`, validação de senha forte e regra das 3 tentativas.
3. **Fase 3 — Endpoints de API & Middleware**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/admin/users/[id]/unlock` e `middleware.ts`.
4. **Fase 4 — Frontend e Componentes**: Telas `/login`, `/register`, medidor de senha e painel de desbloqueio para admin.
5. **Fase 5 — Cobertura E2E Playwright**: Execução da suíte completa de testes automatizados e homologação final.
