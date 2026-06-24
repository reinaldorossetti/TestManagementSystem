import { prisma } from '@/src/lib/db';
import type { DbTestCaseSphere } from '@/src/utils/sqliteEngine';
import { toDbTestCaseSphere } from '@/src/server/mappers/dbMappers';
import type { DbClient } from './types';

interface SphereHistoryEntry {
  user: string;
  action: string;
  time: string;
}

interface SphereCreateData {
  id: string;
  folder: string;
  title: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  observation?: string | null;
  createdAt: string;
  history: SphereHistoryEntry[];
}

interface SphereUpdateData {
  folder?: string;
  title?: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  observation?: string | null;
}

export async function listSphereCases(client: DbClient = prisma): Promise<DbTestCaseSphere[]> {
  const rows = await client.testCaseSphere.findMany({
    include: { history: { orderBy: { id: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toDbTestCaseSphere);
}

export async function findSphereCaseById(
  id: string,
  client: DbClient = prisma,
): Promise<DbTestCaseSphere | null> {
  const row = await client.testCaseSphere.findUnique({
    where: { id },
    include: { history: { orderBy: { id: 'asc' } } },
  });
  return row ? toDbTestCaseSphere(row) : null;
}

export async function createSphereCase(
  data: SphereCreateData,
  client: DbClient = prisma,
): Promise<DbTestCaseSphere> {
  const row = await client.testCaseSphere.create({
    data: {
      id: data.id,
      folder: data.folder,
      title: data.title,
      preconditions: data.preconditions,
      steps: data.steps,
      expectedResult: data.expectedResult,
      observation: data.observation ?? null,
      createdAt: data.createdAt,
      history: { create: data.history },
    },
    include: { history: { orderBy: { id: 'asc' } } },
  });
  return toDbTestCaseSphere(row);
}

export async function updateSphereCase(
  id: string,
  data: SphereUpdateData,
  appendHistory: SphereHistoryEntry[],
  client: DbClient = prisma,
): Promise<DbTestCaseSphere> {
  const row = await client.testCaseSphere.update({
    where: { id },
    data: {
      ...data,
      history: appendHistory.length > 0 ? { create: appendHistory } : undefined,
    },
    include: { history: { orderBy: { id: 'asc' } } },
  });
  return toDbTestCaseSphere(row);
}

export async function deleteSphereCase(id: string, client: DbClient = prisma): Promise<void> {
  await client.testCaseSphere.delete({ where: { id } });
}

export async function moveCasesToFolder(
  fromFolder: string,
  toFolder: string,
  client: DbClient = prisma,
): Promise<void> {
  await client.testCaseSphere.updateMany({
    where: { folder: fromFolder },
    data: { folder: toFolder },
  });
}
