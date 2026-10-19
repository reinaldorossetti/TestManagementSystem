# 📋 Release Notes — Módulo de Autenticação, Cadastro e Governança de Usuários (v2.1.0)

**Centro de Execução QA TMS**  
**Versão:** `v2.1.0-auth-security`  
**Data:** 19 de Outubro de 2026  
**Status:** Planejado & Especificado (Pronto para Implementação)  
**Classificação:** Segurança Crítica / Governança de Acesso  

---

## 🎯 1. Sumário Executivo

A release **v2.1.0** introduz o ecossistema completo de **Autenticação, Cadastro de Usuários e Gestão de Sessões Seguras** no **Centro de Execução QA TMS**. 

Até a versão v2.0, a aplicação operava prioritariamente em modo sandbox local, expondo rotas e consoles (Terminal, Navegador SQLite, TMS e Relatórios) sem autenticação prévia obrigatória. Com a integração deste módulo, a plataforma adota o padrão de segurança corporativo em conformidade com as diretrizes **OWASP Top 10** e os padrões de senhas do **NIST SP 800-63B**, garantindo isolamento de perfis, trilha de auditoria e mitigação total de vulnerabilidades de injeção, força bruta e vazamento de sessões.

---

## 🚀 2. Novas Funcionalidades (New Features)

### 2.1. Tela de Login Corporativa (`/login`)
- **Interface de Alta Fidelidade**: Desenvolvida com a paleta nativa do TMS (Dark theme em `#0b0f19`, cartões em `#121826`, acentos em laranja `#FF6600` e bordas dinâmicas em conformidade com o design system do projeto).
- **Entrada Segura**:
  - Campos tipados e validados para E-mail corporativo e Senha de acesso.
  - Alternância visual de visibilidade de senha (ícone de olho com suporte a acessibilidade e labels dinâmicos via `lucide-react`).
  - Opção "Lembrar meu acesso" configurando persistência segura de sessão respeitando tempo limite do token.
  - Link direto para recuperação de acesso e cadastro de novos analistas.
- **Prevenção de Enumeração de Contas**:
  - Mensagens de erro unificadas ("Credenciais inválidas. Verifique seu e-mail e senha.") para evitar que atacantes descubram se um e-mail específico está cadastrado.
  - Tempo de resposta equalizado com compensação de latência constante para frustrar *timing attacks*.

### 2.2. Tela de Cadastro de Usuários (`/register`)
- **Fluxo Guiado de Registro**:
  - Coleta de Nome Completo, E-mail corporativo, Papel inicial (`Operador QA`, `Lead QA`, `Administrador`) e Senha de Acesso com Confirmação.
  - Sanitização e validação estrita no cliente e no servidor através de schemas **Zod** dedicados.
  - Seleção de papéis com validação de domínio institucional permitido.
- **Medidor Interativo de Força de Senha (`PasswordStrengthMeter`)**:
  - Barra de progresso visual com cálculo de entropia em tempo real.
  - Checklist dinâmico com 5 requisitos obrigatórios (12+ caracteres, maiúsculas, minúsculas, números e caracteres especiais).
  - Bloqueio imediato de senhas comuns ou que contenham partes do e-mail/nome do usuário.

### 2.3. Gestão Centralizada de Sessão e Cookies Criptografados
- **Armazenamento Seguro de Sessão**:
  - Utilização de cookies com atributos rigorosos: `HttpOnly` (inacessível via scripts no navegador, mitigando roubo via XSS), `Secure` (forçado em conexões TLS/HTTPS) e `SameSite=Strict` (blindagem nativa contra ataques CSRF).
  - Geração de tokens de sessão aleatórios de alta entropia (256 bits via `crypto.randomBytes`) com hash SHA-256 armazenado no banco de dados SQLite.
  - Rotação automática de sessão após login para mitigar fixação de sessão (*Session Fixation*).
  - Endpoint de encerramento seguro (`POST /api/auth/logout`) com invalidação imediata do registro de sessão no banco e limpeza atômica dos cookies.

### 2.4. Trilha de Auditoria e Logs de Segurança (`security_audit_logs`)
- Registro de todos os eventos sensíveis do ciclo de vida de autenticação:
  - `AUTH_LOGIN_SUCCESS` (Login realizado com sucesso)
  - `AUTH_LOGIN_FAILED` (Falha na autenticação com contador incremental)
  - `AUTH_ACCOUNT_LOCKED` (Bloqueio preventivo por excesso de tentativas)
  - `AUTH_REGISTER_SUCCESS` (Cadastro de novo analista)
  - `AUTH_PASSWORD_CHANGED` (Troca ou redefinição de credencial)
  - `AUTH_LOGOUT` (Encerramento de sessão ativa)
- Metadados capturados: ID do usuário (ou tentativa associada), Endereço IP mascarado, `User-Agent`, timestamp e detalhes técnicos (sem jamais persistir senhas ou dados sensíveis).

---

## 🛡️ 3. Especificação de Segurança e Conformidade OWASP Top 10

| Vetor de Risco (OWASP Top 10) | Mecanismo de Defesa Implementado no TMS |
|---|---|
| **A01: Broken Access Control** | Middleware centralizado no Next.js (`middleware.ts`) interceptando rotas privadas (`/terminal`, `/tms`, `/reports`, `/sqlite`). Controle de Acesso Baseado em Papéis (RBAC: `QA_OPERATOR`, `QA_LEAD`, `ADMIN`). |
| **A02: Cryptographic Failures** | Hashing de senhas utilizando **Argon2id** (ou `bcrypt` com fator de trabalho 12 e salt individual de 16 bytes). Tokens de sessão persistidos como hash SHA-256. Proibição de senhas em texto plano. |
| **A03: Injection (SQL / XSS)** | Consultas 100% parametrizadas via Prisma Client 7 + driver adapter `@prisma/adapter-libsql`. Validação Zod estrita na borda da API. Escapamento de caracteres no React 19. |
| **A04: Insecure Design** | Rate limiting baseado em janela deslizante (Sliding Window): bloqueio temporário de 15 minutos após 5 tentativas incorretas. Equalização de tempo contra timing attacks. |
| **A05: Security Misconfiguration** | Cabeçalhos HTTP reforçados: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`. |
| **A07: Identification & Auth Failures** | Política de Senha Forte obrigatória (mínimo 12 caracteres, complexidade regex, entropia e verificação contra dicionário de senhas vazadas). Rejeição de credenciais padrão. |
| **A08: Software & Data Integrity** | TypeScript estrito em todo o backend (`Zero any`), validação bidirecional cliente/servidor com Zod e tipagem unificada dos DTOs de autenticação. |

---

## 🔒 4. Política de Senha Forte (Especificação Técnica)

Toda senha submetida no cadastro ou alteração deve cumprir cumulativamente os seguintes critérios:

1. **Comprimento Mínimo**: 12 caracteres (recomendação NIST SP 800-63B). Máximo: 128 caracteres.
2. **Diversidade de Caracteres**:
   - Pelo menos 1 caractere em letra maiúscula (`[A-Z]`).
   - Pelo menos 1 caractere em letra minúscula (`[a-z]`).
   - Pelo menos 1 caractere numérico (`[0-9]`).
   - Pelo menos 1 caractere especial (`[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]`).
3. **Anti-Dicionário e Entropia**:
   - Rejeição automática contra lista das 10.000 senhas mais comuns (ex: `123456`, `password`, `admin123!`, etc.).
   - Rejeição se a senha contiver o primeiro nome, sobrenome ou o prefixo do e-mail do usuário.
4. **Histórico de Senhas**:
   - Impossibilidade de reutilizar qualquer uma das últimas 3 senhas cadastradas (armazenadas na tabela `password_history`).

---

## 🗄️ 5. Modelagem de Dados Relacional (Prisma Schema)

Novos modelos adicionados ao arquivo `prisma/schema.prisma`:

```prisma
/// Representa os usuários autenticados da plataforma TMS.
model User {
  id                  String             @id @default(cuid())
  email               String             @unique
  passwordHash        String             @map("password_hash")
  name                String
  role                String             @default("QA_OPERATOR") // QA_OPERATOR, QA_LEAD, ADMIN
  status              String             @default("ACTIVE")      // ACTIVE, BLOCKED, PENDING
  failedLoginAttempts Int                @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime?          @map("locked_until")
  lastLoginAt         DateTime?          @map("last_login_at")
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")
  
  sessions            Session[]
  passwordHistories   PasswordHistory[]
  auditLogs           SecurityAuditLog[]

  @@map("users")
}

/// Sessões ativas autenticadas com tokens de alta entropia.
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

/// Histórico de senhas criptografadas para evitar reutilização.
model PasswordHistory {
  id           Int      @id @default(autoincrement())
  userId       String   @map("user_id")
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_history")
}

/// Registro central de auditoria e segurança.
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

## 🧪 6. Estratégia de Qualidade e Testes de Automação

### 6.1. Cobertura Playwright E2E & API
Seguindo o padrão de segregação de testes do projeto (`e2e/specs/frontend/` e `e2e/specs/api/`):

- **Frontend (`e2e/specs/frontend/auth.spec.ts`)**:
  - `[TC-FE-01]` — Fluxo feliz de cadastro com senha forte e redirecionamento para o dashboard.
  - `[TC-FE-02]` — Bloqueio visual e desabilitação do botão de cadastro com senha fraca (< 12 chars ou sem símbolo).
  - `[TC-FE-03]` — Validação dos indicadores do `PasswordStrengthMeter` em tempo real.
  - `[TC-FE-04]` — Tentativa de login com credenciais incorretas exibe mensagem genérica amigável.
  - `[TC-FE-05]` — Bloqueio da interface após 5 tentativas consecutivas incorretas (lockout de 15 min).
  - `[TC-FE-06]` — Alternância de visibilidade de senha (type `password` <-> `text`).
  - `[TC-FE-07]` — Encerramento de sessão (Logout) invalida acesso a rotas privadas.

- **API & Segurança Backend (`e2e/specs/api/auth.spec.ts`)**:
  - `[TC-API-01]` — Endpoint `POST /api/auth/register` rejeita senhas fora da política (HTTP 400).
  - `[TC-API-02]` — Endpoint `POST /api/auth/register` impede e-mails duplicados sem expor detalhes internos.
  - `[TC-API-03]` — Endpoint `POST /api/auth/login` retorna cookie `HttpOnly` com flag `SameSite=Strict`.
  - `[TC-API-04]` — Rate limit acionado na 6ª tentativa consecutiva sem intervalo (HTTP 429 Too Many Requests).
  - `[TC-API-05]` — Teste de injeção SQL/NoSQL no payload de autenticação é neutralizado pelo Zod e Prisma.
  - `[TC-API-06]` — Injeção de tags XSS em campos de cadastro é higienizada e neutralizada.

### 6.2. Suíte Robot Framework BDD (`test_projects/robot-sample/`)
- Adição da suíte `auth_security.robot` com casos em sintaxe Gherkin para validação no motor de execução local do Terminal TMS.

---

## 🌐 7. Internacionalização (i18n)

Todas as novas telas, mensagens de validação, toasts de segurança e rótulos de acessibilidade suportam alternância dinâmica entre **Português (PT)** e **Inglês (ENG)** através da função `t(pt, en)` ou do hook de tradução unificado da aplicação, sem quebras de layout.

---

## 📦 8. Roteiro de Migração e Instalação

1. Executar migração do Prisma:
   ```bash
   npx prisma migrate dev --name add_auth_and_user_governance
   ```
2. Gerar o cliente atualizado:
   ```bash
   npx prisma generate
   ```
3. Executar a suíte de testes de regressão:
   ```bash
   npm run test:e2e
   ```
