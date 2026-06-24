import type { PrismaClient } from '@/generated/prisma/client';

/**
 * A Prisma executor: either the root client or a transaction-scoped client.
 * Repositories accept this so the same data-access functions work inside and
 * outside `$transaction` blocks.
 */
export type DbClient = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
