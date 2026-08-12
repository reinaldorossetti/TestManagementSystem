import { prisma } from '@/src/lib/db';
import { Prisma } from '@/generated/prisma/client';

/** Cascade when a TMS folder is renamed via the dedicated folders API. */
export async function renameFolderProjectForFolder(
  oldFolderPath: string,
  newFolderPath: string,
): Promise<void> {
  try {
    await prisma.folderProject.update({
      where: { folderPath: oldFolderPath },
      data: { folderPath: newFolderPath },
    });
  } catch (error) {
    // No-op if there was no project linked to this folder (P2025 = record not found).
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')) {
      throw error;
    }
  }
}

/** Cascade when a TMS folder is deleted via the dedicated folders API. */
export async function removeFolderProjectForFolder(folderPath: string): Promise<void> {
  await prisma.folderProject.deleteMany({ where: { folderPath } });
}
