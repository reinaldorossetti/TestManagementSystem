import { prisma } from '@/src/lib/db';
import type { DbFolderAcceptanceDocHistory } from '@/src/utils/sqliteEngine';

export type AcceptanceDocHistoryEntry = DbFolderAcceptanceDocHistory;

function mapRow(row: {
  id: number;
  folderPath: string;
  user: string;
  action: string;
  summary: string;
  time: string;
}): AcceptanceDocHistoryEntry {
  return {
    id: row.id,
    folder_path: row.folderPath,
    user: row.user,
    action: row.action,
    summary: row.summary,
    time: row.time,
  };
}

export async function listAcceptanceDocHistory(
  folderPath: string,
): Promise<AcceptanceDocHistoryEntry[]> {
  const rows = await prisma.folderAcceptanceDocHistory.findMany({
    where: { folderPath },
    orderBy: { id: 'desc' },
  });
  return rows.map(mapRow);
}

export async function createAcceptanceDocHistoryEntry(input: {
  folder_path: string;
  user: string;
  action: string;
  summary: string;
  time: string;
}): Promise<AcceptanceDocHistoryEntry> {
  const row = await prisma.folderAcceptanceDocHistory.create({
    data: {
      folderPath: input.folder_path,
      user: input.user,
      action: input.action,
      summary: input.summary,
      time: input.time,
    },
  });
  return mapRow(row);
}

export async function deleteAcceptanceDocHistoryForFolder(folderPath: string): Promise<void> {
  await prisma.folderAcceptanceDocHistory.deleteMany({ where: { folderPath } });
}

export async function renameAcceptanceDocHistoryFolder(
  oldFolderPath: string,
  newFolderPath: string,
): Promise<void> {
  await prisma.folderAcceptanceDocHistory.updateMany({
    where: { folderPath: oldFolderPath },
    data: { folderPath: newFolderPath },
  });
}
