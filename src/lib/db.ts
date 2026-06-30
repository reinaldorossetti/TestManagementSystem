import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Singleton PrismaClient instance.
 *
 * Next.js re-evaluates modules on hot reload in development, which would otherwise
 * create a new database connection on every change. We cache the client on the
 * global object to guarantee a single instance per process.
 *
 * After `prisma generate` adds new models, the cached instance can be stale (missing
 * delegates like `folderAcceptanceDoc`). We detect that and recreate the client.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaLibSql({ url: DATABASE_URL });
  return new PrismaClient({ adapter });
};

type PrismaClientWithDelegates = PrismaClient & {
  folderAcceptanceDoc?: { findMany: (...args: unknown[]) => unknown };
  folderAcceptanceDocHistory?: { findMany: (...args: unknown[]) => unknown };
  testCaseEvidence?: { findMany: (...args: unknown[]) => unknown };
};

const isPrismaClientReady = (client: PrismaClient): boolean => {
  const withDelegates = client as PrismaClientWithDelegates;
  return (
    typeof withDelegates.folderAcceptanceDoc?.findMany === 'function' &&
    typeof withDelegates.folderAcceptanceDocHistory?.findMany === 'function' &&
    typeof withDelegates.testCaseEvidence?.findMany === 'function'
  );
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const resolvePrismaClient = (): PrismaClient => {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientReady(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
};

export const prisma: PrismaClient = resolvePrismaClient();
