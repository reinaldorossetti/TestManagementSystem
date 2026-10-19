import { userRepository, type UserRepository } from '../repositories/userRepository';
import { sessionRepository, type SessionRepository } from '../repositories/sessionRepository';
import { securityAuditRepository, type SecurityAuditRepository } from '../repositories/securityAuditRepository';
import { hashPassword, verifyPassword, generateSessionToken, hashToken } from '../utils/crypto';
import type { RegisterInput, LoginInput } from '../validation/authSchemas';
import type { User } from '@/generated/prisma/client';

export class AuthenticationError extends Error {
  constructor(message: string, public readonly attemptsLeft?: number) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AccountLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountLockedError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository = userRepository,
    private readonly sessionRepo: SessionRepository = sessionRepository,
    private readonly auditRepo: SecurityAuditRepository = securityAuditRepository
  ) {}

  /**
   * Realiza o registro de um novo usuário na plataforma.
   */
  async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('E-mail corporativo já cadastrado no sistema.');
    }

    const passwordHash = hashPassword(input.password);

    const newUser = await this.userRepo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    // Registra no histórico de senhas
    await this.userRepo.addPasswordHistory(newUser.id, passwordHash);

    // Auditoria
    await this.auditRepo.recordEvent({
      event: 'AUTH_REGISTER_SUCCESS',
      details: `Novo usuário registrado como ${newUser.role}: ${newUser.email}`,
      userId: newUser.id,
      ipAddress,
      userAgent,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Autentica o usuário com regra estrita de bloqueio na 3ª falha consecutiva.
   */
  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    user: Omit<User, 'passwordHash'>;
    rawToken: string;
    expiresAt: Date;
  }> {
    const user = await this.userRepo.findByEmail(input.email);

    // Se o usuário não existir, realiza comparação simulada contra timing attacks
    if (!user) {
      verifyPassword(input.password, '0000000000000000:00000000000000000000000000000000');
      await this.auditRepo.recordEvent({
        event: 'AUTH_LOGIN_FAILED_UNKNOWN_USER',
        details: `Tentativa de login para e-mail não existente: ${input.email}`,
        ipAddress,
        userAgent,
      });
      throw new AuthenticationError('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    // Se a conta já estiver bloqueada (ou com 3+ falhas)
    if (user.status === 'BLOCKED' || user.failedAttempts >= 3) {
      await this.auditRepo.recordEvent({
        event: 'AUTH_LOGIN_REJECTED_BLOCKED',
        details: `Tentativa de login barrada. Conta bloqueada para ${user.email}`,
        userId: user.id,
        ipAddress,
        userAgent,
      });
      throw new AccountLockedError(
        'Conta bloqueada por excesso de tentativas (3/3). Entre em contato com um administrador para desbloqueio.'
      );
    }

    // Verifica a senha informada
    const isPasswordValid = verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      const currentAttempts = user.failedAttempts + 1;

      if (currentAttempts >= 3) {
        // Bloqueia permanentemente o usuário
        await this.userRepo.lockUser(user.id);

        await this.auditRepo.recordEvent({
          event: 'AUTH_ACCOUNT_LOCKED_3_ATTEMPTS',
          details: `Conta bloqueada após 3 falhas consecutivas para ${user.email}`,
          userId: user.id,
          ipAddress,
          userAgent,
        });

        throw new AccountLockedError(
          'Conta bloqueada por excesso de tentativas incorretas (3/3). Entre em contato com um administrador do sistema para desbloqueio.'
        );
      } else {
        await this.userRepo.incrementFailedAttempts(user.id);

        await this.auditRepo.recordEvent({
          event: 'AUTH_LOGIN_FAILED',
          details: `Senha incorreta para ${user.email}. Tentativa ${currentAttempts} de 3`,
          userId: user.id,
          ipAddress,
          userAgent,
        });

        const warningMsg =
          currentAttempts === 2
            ? ' Atenção: sua conta será bloqueada na próxima falha.'
            : '';

        throw new AuthenticationError(
          `Credenciais inválidas. Tentativa ${currentAttempts} de 3.${warningMsg}`,
          3 - currentAttempts
        );
      }
    }

    // Login com sucesso: reseta tentativas e atualiza timestamp
    const updatedUser = await this.userRepo.updateLastLogin(user.id);

    // Emissão de sessão segura
    const { rawToken, tokenHash } = generateSessionToken();
    const sessionDurationDays = input.rememberMe ? 30 : 1;
    const expiresAt = new Date(Date.now() + sessionDurationDays * 24 * 60 * 60 * 1000);

    await this.sessionRepo.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await this.auditRepo.recordEvent({
      event: 'AUTH_LOGIN_SUCCESS',
      details: `Login autorizado com sucesso para ${user.email} (${user.role})`,
      userId: user.id,
      ipAddress,
      userAgent,
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return {
      user: safeUser,
      rawToken,
      expiresAt,
    };
  }

  /**
   * Desbloqueio exclusivo executado por um usuário com perfil 'admin'.
   */
  async unlockUser(
    targetUserId: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Omit<User, 'passwordHash'>> {
    const adminUser = await this.userRepo.findById(adminUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      throw new AuthorizationError(
        'Acesso negado: Somente usuários com perfil de Administrador podem desbloquear contas.'
      );
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Usuário alvo não encontrado.');
    }

    const unlocked = await this.userRepo.unlockUser(targetUserId);

    await this.auditRepo.recordEvent({
      event: 'ADMIN_USER_UNLOCKED',
      details: `Usuário ${unlocked.email} desbloqueado pelo administrador ${adminUser.name} (${adminUser.email})`,
      userId: targetUserId,
      ipAddress,
      userAgent,
    });

    const { passwordHash: _, ...safeUser } = unlocked;
    return safeUser;
  }

  /**
   * Encerra a sessão ativa (Logout).
   */
  async logout(rawToken: string, ipAddress?: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (session) {
      await this.sessionRepo.deleteByTokenHash(tokenHash);
      await this.auditRepo.recordEvent({
        event: 'AUTH_LOGOUT',
        details: `Sessão encerrada para ${session.user.email}`,
        userId: session.user.id,
        ipAddress,
      });
    }
  }

  /**
   * Resgata a sessão ativa do usuário a partir do token de cookie.
   */
  async getSessionUser(rawToken: string): Promise<Omit<User, 'passwordHash'> | null> {
    const tokenHash = hashToken(rawToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);
    return session ? session.user : null;
  }

  /**
   * Lista todos os usuários (exclusivo para tela administrativa de gestão de acessos).
   */
  async listUsersForAdmin(adminUserId: string): Promise<Omit<User, 'passwordHash'>[]> {
    const adminUser = await this.userRepo.findById(adminUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      throw new AuthorizationError('Acesso negado: Visualização restrita a Administradores.');
    }
    return this.userRepo.listAllUsers();
  }
}

export const authService = new AuthService();
