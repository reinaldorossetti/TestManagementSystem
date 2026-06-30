import { mkdir, writeFile, readFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/src/lib/db';
import {
  acceptanceDocAbsolutePath,
  acceptanceDocRepoRelativePath,
  acceptanceDocWebPath,
  folderSlugFromPath,
  isMarkdownFileName,
} from '@/src/utils/acceptanceDocPaths';
import type { DbFolderAcceptanceDoc } from '@/src/utils/sqliteEngine';
import {
  deleteFolderAcceptanceDoc,
  findFolderAcceptanceDocByPath,
  listFolderAcceptanceDocs,
  renameFolderAcceptanceDoc,
  upsertFolderAcceptanceDoc,
} from '@/src/server/repositories/folderAcceptanceDocRepository';
import {
  createAcceptanceDocHistoryEntry,
  deleteAcceptanceDocHistoryForFolder,
  listAcceptanceDocHistory,
  renameAcceptanceDocHistoryFolder,
  type AcceptanceDocHistoryEntry,
} from '@/src/server/repositories/folderAcceptanceDocHistoryRepository';
import { folderExists } from '@/src/server/repositories/folderRepository';

const MAX_MARKDOWN_BYTES = 512 * 1024;
const PROJECT_ROOT = process.cwd();

export class AcceptanceDocValidationError extends Error {}
export class AcceptanceDocNotFoundError extends Error {}

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function buildEditSummary(previous: string, next: string): string {
  const prevLines = previous.split('\n').length;
  const nextLines = next.split('\n').length;
  const charDelta = next.length - previous.length;
  const sign = charDelta >= 0 ? '+' : '';
  const lineDelta = nextLines - prevLines;
  const lineSign = lineDelta >= 0 ? '+' : '';
  return `${sign}${charDelta} caracteres, ${lineSign}${lineDelta} linhas`;
}

async function recordDocHistory(
  folderPath: string,
  action: string,
  summary: string,
  user = 'TMS',
): Promise<AcceptanceDocHistoryEntry> {
  return createAcceptanceDocHistoryEntry({
    folder_path: folderPath,
    user,
    action,
    summary,
    time: formatTimestamp(),
  });
}

export type { AcceptanceDocHistoryEntry } from '@/src/server/repositories/folderAcceptanceDocHistoryRepository';

export async function getAcceptanceDocHistory(
  folderPath: string,
): Promise<AcceptanceDocHistoryEntry[]> {
  return listAcceptanceDocHistory(folderPath);
}

export async function listAcceptanceDocs(): Promise<DbFolderAcceptanceDoc[]> {
  return listFolderAcceptanceDocs();
}

export async function getAcceptanceDocForFolder(
  folderPath: string,
): Promise<DbFolderAcceptanceDoc | null> {
  return findFolderAcceptanceDocByPath(folderPath);
}

export async function findFolderPathBySlug(slug: string): Promise<string | null> {
  const docs = await listFolderAcceptanceDocs();
  const match = docs.find((doc) => folderSlugFromPath(doc.folder_path) === slug);
  return match?.folder_path ?? null;
}

export async function readAcceptanceMarkdown(folderPath: string): Promise<string> {
  const absolute = acceptanceDocAbsolutePath(PROJECT_ROOT, folderPath);
  try {
    return await readFile(absolute, 'utf8');
  } catch {
    throw new AcceptanceDocNotFoundError('Critério de aceite não encontrado no disco.');
  }
}

export async function saveAcceptanceDoc(
  folderPath: string,
  fileName: string,
  content: string,
): Promise<DbFolderAcceptanceDoc> {
  if (!(await folderExists(folderPath))) {
    throw new AcceptanceDocValidationError('Pasta/feature não encontrada.');
  }
  if (!isMarkdownFileName(fileName)) {
    throw new AcceptanceDocValidationError('Apenas arquivos .md são permitidos.');
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > MAX_MARKDOWN_BYTES) {
    throw new AcceptanceDocValidationError('Arquivo excede o limite de 512 KB.');
  }
  if (!content.trim()) {
    throw new AcceptanceDocValidationError('O arquivo markdown está vazio.');
  }

  const absolute = acceptanceDocAbsolutePath(PROJECT_ROOT, folderPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');

  const doc: DbFolderAcceptanceDoc = {
    folder_path: folderPath,
    doc_title: fileName,
    doc_web_path: acceptanceDocWebPath(folderPath),
    repo_relative_path: acceptanceDocRepoRelativePath(folderPath),
    updated_at: formatTimestamp(),
  };

  return upsertFolderAcceptanceDoc(doc);
}

export async function updateAcceptanceDocContent(
  folderPath: string,
  content: string,
  user = 'TMS',
): Promise<{ doc: DbFolderAcceptanceDoc; history: AcceptanceDocHistoryEntry }> {
  const existing = await findFolderAcceptanceDocByPath(folderPath);
  if (!existing) {
    throw new AcceptanceDocNotFoundError('Critério de aceite não encontrado.');
  }

  let previous = '';
  try {
    previous = await readAcceptanceMarkdown(folderPath);
  } catch {
    previous = '';
  }

  if (previous === content) {
    throw new AcceptanceDocValidationError('Nenhuma alteração detectada no documento.');
  }

  const doc = await saveAcceptanceDoc(folderPath, existing.doc_title, content);
  const history = await recordDocHistory(
    folderPath,
    'edited',
    buildEditSummary(previous, content),
    user,
  );
  await appendAcceptanceHistoryForFolder(
    folderPath,
    `edited acceptance criteria (${history.summary})`,
  );

  return { doc, history };
}

export async function saveAcceptanceDocWithHistory(
  folderPath: string,
  fileName: string,
  content: string,
  user = 'TMS',
): Promise<DbFolderAcceptanceDoc> {
  const doc = await saveAcceptanceDoc(folderPath, fileName, content);
  await recordDocHistory(
    folderPath,
    'imported',
    `Importação inicial (${fileName}, ${content.split('\n').length} linhas)`,
    user,
  );
  await appendAcceptanceHistoryForFolder(
    folderPath,
    `imported acceptance criteria (${fileName})`,
  );
  return doc;
}

export async function removeAcceptanceDoc(folderPath: string): Promise<void> {
  const existing = await findFolderAcceptanceDocByPath(folderPath);
  if (!existing) {
    throw new AcceptanceDocNotFoundError('Critério de aceite não encontrado.');
  }

  await appendAcceptanceHistoryForFolder(folderPath, 'deleted acceptance criteria');

  const absolute = acceptanceDocAbsolutePath(PROJECT_ROOT, folderPath);
  const slugDir = path.dirname(absolute);
  try {
    await rm(slugDir, { recursive: true, force: true });
  } catch {
    // ignore missing directory
  }
  await deleteFolderAcceptanceDoc(folderPath);
  await deleteAcceptanceDocHistoryForFolder(folderPath);
}

export async function moveAcceptanceDocFolder(
  oldFolderPath: string,
  newFolderPath: string,
): Promise<void> {
  const existing = await findFolderAcceptanceDocByPath(oldFolderPath);
  if (!existing) return;

  const oldAbsolute = acceptanceDocAbsolutePath(PROJECT_ROOT, oldFolderPath);
  const newAbsolute = acceptanceDocAbsolutePath(PROJECT_ROOT, newFolderPath);

  try {
    await mkdir(path.dirname(newAbsolute), { recursive: true });
    await rename(oldAbsolute, newAbsolute);
    await rm(path.dirname(oldAbsolute), { recursive: true, force: true });
  } catch {
    // If move fails, keep DB in sync with new paths only when file exists at new path
    try {
      await readFile(newAbsolute, 'utf8');
    } catch {
      return;
    }
  }

  await renameFolderAcceptanceDoc(oldFolderPath, newFolderPath, {
    doc_web_path: acceptanceDocWebPath(newFolderPath),
    repo_relative_path: acceptanceDocRepoRelativePath(newFolderPath),
    updated_at: formatTimestamp(),
  });
  await renameAcceptanceDocHistoryFolder(oldFolderPath, newFolderPath);
}

/** Cascade when a TMS folder is deleted. */
export async function removeAcceptanceDocForFolder(folderPath: string): Promise<void> {
  const existing = await findFolderAcceptanceDocByPath(folderPath);
  if (!existing) return;
  await removeAcceptanceDoc(folderPath);
}

/** Cascade when a TMS folder is renamed. */
export async function renameAcceptanceDocForFolder(
  oldFolderPath: string,
  newFolderPath: string,
): Promise<void> {
  await moveAcceptanceDocFolder(oldFolderPath, newFolderPath);
}

export async function appendAcceptanceHistoryForFolder(
  folderPath: string,
  action: string,
): Promise<void> {
  const cases = await prisma.testCaseSphere.findMany({
    where: { folder: folderPath },
    select: { id: true },
  });
  const time = formatTimestamp();
  for (const sphereCase of cases) {
    await prisma.testCaseHistory.create({
      data: {
        testCaseId: sphereCase.id,
        user: 'TMS',
        action,
        time,
      },
    });
  }
}
