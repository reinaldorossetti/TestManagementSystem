import { prisma } from '@/src/lib/db';
import type { Session, User } from '@/generated/prisma/client';

export type SessionWithUser = Session & {
  user: Omit<User, 'passwordHash'>;
};

export class SessionRepository {
  async createSession(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            failedAttempts: true,
            lockedAt: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.deleteByTokenHash(tokenHash);
      return null;
    }

    return session as SessionWithUser;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    try {
      await prisma.session.delete({
        where: { tokenHash },
      });
    } catch {
      // Ignore if already deleted
    }
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }
}

export const sessionRepository = new SessionRepository();
