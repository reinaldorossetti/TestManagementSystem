import { prisma } from '@/src/lib/db';
import type { User, PasswordHistory } from '@/generated/prisma/client';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role,
        status: 'ACTIVE',
        failedAttempts: 0,
      },
    });
  }

  async incrementFailedAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedAttempts: { increment: 1 },
      },
    });
  }

  async lockUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        status: 'BLOCKED',
        failedAttempts: 3,
        lockedAt: new Date(),
      },
    });
  }

  async resetFailedAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedAttempts: 0,
      },
    });
  }

  async unlockUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        failedAttempts: 0,
        lockedAt: null,
      },
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        failedAttempts: 0,
      },
    });
  }

  async listAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    return prisma.user.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentPasswordHistory(userId: string, limit = 3): Promise<PasswordHistory[]> {
    return prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async addPasswordHistory(userId: string, passwordHash: string): Promise<PasswordHistory> {
    return prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash,
      },
    });
  }
}

export const userRepository = new UserRepository();
