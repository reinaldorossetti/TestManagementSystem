import { prisma } from '@/src/lib/db';
import type { DbTestSpec } from '@/src/utils/sqliteEngine';
import { toDbTestSpec } from '@/src/server/mappers/dbMappers';
import type { DbClient } from './types';

interface TestSpecCreateData {
  id: string;
  name: string;
  category: string;
  tags: string;
  content: string;
  createdAt: string;
}

interface TestSpecUpdateData {
  name?: string;
  category?: string;
  tags?: string;
  content?: string;
}

export async function listTestSpecs(client: DbClient = prisma): Promise<DbTestSpec[]> {
  const rows = await client.testSpec.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toDbTestSpec);
}

export async function createTestSpec(
  data: TestSpecCreateData,
  client: DbClient = prisma,
): Promise<DbTestSpec> {
  const row = await client.testSpec.create({ data });
  return toDbTestSpec(row);
}

export async function updateTestSpec(
  id: string,
  data: TestSpecUpdateData,
  client: DbClient = prisma,
): Promise<DbTestSpec> {
  const row = await client.testSpec.update({ where: { id }, data });
  return toDbTestSpec(row);
}

export async function deleteTestSpec(id: string, client: DbClient = prisma): Promise<void> {
  await client.testSpec.delete({ where: { id } });
}
