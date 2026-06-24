import { prisma } from '@/src/lib/db';
import type { DbClient } from './types';

export async function listFolders(client: DbClient = prisma): Promise<string[]> {
  const rows = await client.testFolder.findMany({ orderBy: { path: 'asc' } });
  return rows.map((row) => row.path);
}

export async function folderExists(path: string, client: DbClient = prisma): Promise<boolean> {
  const row = await client.testFolder.findUnique({ where: { path } });
  return row !== null;
}

export async function createFolder(path: string, client: DbClient = prisma): Promise<string> {
  const row = await client.testFolder.create({ data: { path } });
  return row.path;
}

export async function deleteFolder(path: string, client: DbClient = prisma): Promise<void> {
  await client.testFolder.delete({ where: { path } });
}

export async function deleteFoldersByPrefix(
  prefix: string,
  client: DbClient = prisma,
): Promise<void> {
  await client.testFolder.deleteMany({
    where: { OR: [{ path: prefix }, { path: { startsWith: `${prefix}/` } }] },
  });
}
