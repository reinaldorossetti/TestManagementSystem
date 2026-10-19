import { prisma } from '@/src/lib/db';
import type { SecurityAuditLog } from '@/generated/prisma/client';

export class SecurityAuditRepository {
  async recordEvent(params: {
    event: string;
    details?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SecurityAuditLog> {
    return prisma.securityAuditLog.create({
      data: {
        event: params.event,
        details: params.details,
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async listRecentLogs(limit = 100): Promise<SecurityAuditLog[]> {
    return prisma.securityAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}

export const securityAuditRepository = new SecurityAuditRepository();
