import { prisma } from '@/src/lib/db';
import type { DbFolderAcceptanceDoc } from '@/src/utils/sqliteEngine';

function mapRow(row: {
  folderPath: string;
  docTitle: string;
  docWebPath: string;
  repoRelativePath: string;
  updatedAt: string;
}): DbFolderAcceptanceDoc {
  return {
    folder_path: row.folderPath,
    doc_title: row.docTitle,
    doc_web_path: row.docWebPath,
    repo_relative_path: row.repoRelativePath,
    updated_at: row.updatedAt,
  };
}

export async function listFolderAcceptanceDocs(): Promise<DbFolderAcceptanceDoc[]> {
  const rows = await prisma.folderAcceptanceDoc.findMany({
    orderBy: { folderPath: 'asc' },
  });
  return rows.map(mapRow);
}

export async function findFolderAcceptanceDocByPath(
  folderPath: string,
): Promise<DbFolderAcceptanceDoc | null> {
  const row = await prisma.folderAcceptanceDoc.findUnique({
    where: { folderPath },
  });
  return row ? mapRow(row) : null;
}

export async function upsertFolderAcceptanceDoc(
  data: DbFolderAcceptanceDoc,
): Promise<DbFolderAcceptanceDoc> {
  const row = await prisma.folderAcceptanceDoc.upsert({
    where: { folderPath: data.folder_path },
    create: {
      folderPath: data.folder_path,
      docTitle: data.doc_title,
      docWebPath: data.doc_web_path,
      repoRelativePath: data.repo_relative_path,
      updatedAt: data.updated_at,
    },
    update: {
      docTitle: data.doc_title,
      docWebPath: data.doc_web_path,
      repoRelativePath: data.repo_relative_path,
      updatedAt: data.updated_at,
    },
  });
  return mapRow(row);
}

export async function deleteFolderAcceptanceDoc(folderPath: string): Promise<void> {
  await prisma.folderAcceptanceDoc.deleteMany({ where: { folderPath } });
}

export async function renameFolderAcceptanceDoc(
  oldFolderPath: string,
  newFolderPath: string,
  updates: Pick<DbFolderAcceptanceDoc, 'doc_web_path' | 'repo_relative_path' | 'updated_at'>,
): Promise<void> {
  const existing = await prisma.folderAcceptanceDoc.findUnique({
    where: { folderPath: oldFolderPath },
  });
  if (!existing) return;

  await prisma.folderAcceptanceDoc.delete({ where: { folderPath: oldFolderPath } });
  await prisma.folderAcceptanceDoc.create({
    data: {
      folderPath: newFolderPath,
      docTitle: existing.docTitle,
      docWebPath: updates.doc_web_path,
      repoRelativePath: updates.repo_relative_path,
      updatedAt: updates.updated_at,
    },
  });
}
