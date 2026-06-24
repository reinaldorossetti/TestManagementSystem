import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Singleton PrismaClient instance.
 *
 * Next.js re-evaluates modules on hot reload in development, which would otherwise
 * create a new database connection on every change. We cache the client on the
 * global object to guarantee a single instance per process.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaLibSql({ url: DATABASE_URL });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
