import { prisma } from '@/src/lib/db';
import {
  listFolders as listFolderRows,
  folderExists,
  createFolder as createFolderRow,
} from '@/src/server/repositories/folderRepository';
import {
  removeAcceptanceDocForFolder,
  renameAcceptanceDocForFolder,
} from '@/src/server/services/folderAcceptanceDocService';
import {
  removeFolderProjectForFolder,
  renameFolderProjectForFolder,
} from '@/src/server/services/folderProjectService';

export class FolderConflictError extends Error {}
export class FolderNotFoundError extends Error {}

export async function listFolders(): Promise<string[]> {
  return listFolderRows();
}

export async function createFolder(path: string): Promise<string> {
  if (await folderExists(path)) {
    throw new FolderConflictError(`A pasta "${path}" já existe.`);
  }
  return createFolderRow(path);
}

/**
 * Renames a folder and cascades the change to every descendant folder and to all
 * sphere test cases whose `folder` prefix matches, atomically.
 */
export async function renameFolder(oldPath: string, newPath: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const folders = await tx.testFolder.findMany({
      where: { OR: [{ path: oldPath }, { path: { startsWith: `${oldPath}/` } }] },
    });

    if (folders.length === 0) {
      throw new FolderNotFoundError(`A pasta "${oldPath}" não existe.`);
    }

    const target = await tx.testFolder.findUnique({ where: { path: newPath } });
    if (target) {
      throw new FolderConflictError(`A pasta "${newPath}" já existe.`);
    }

    for (const folder of folders) {
      const replacement = newPath + folder.path.slice(oldPath.length);
      await tx.testFolder.delete({ where: { path: folder.path } });
      await tx.testFolder.create({ data: { path: replacement } });
    }

    const cases = await tx.testCaseSphere.findMany({
      where: { OR: [{ folder: oldPath }, { folder: { startsWith: `${oldPath}/` } }] },
      select: { id: true, folder: true },
    });

    for (const sphereCase of cases) {
      const replacement = newPath + sphereCase.folder.slice(oldPath.length);
      await tx.testCaseSphere.update({
        where: { id: sphereCase.id },
        data: { folder: replacement },
      });
    }

    await renameAcceptanceDocForFolder(oldPath, newPath);
    await renameFolderProjectForFolder(oldPath, newPath);
  });
}

/** Deletes a folder, its descendant folders, and all contained sphere cases. */
export async function deleteFolder(path: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.testCaseSphere.deleteMany({
      where: { OR: [{ folder: path }, { folder: { startsWith: `${path}/` } }] },
    });
    await tx.testFolder.deleteMany({
      where: { OR: [{ path }, { path: { startsWith: `${path}/` } }] },
    });
  });

  await removeAcceptanceDocForFolder(path);
  await removeFolderProjectForFolder(path);
}
