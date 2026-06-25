import { access } from 'node:fs/promises';
import path from 'node:path';
import {
  extractResultsFolderFromPath,
  isPlausibleResultsFolderName,
} from '@/src/utils/robotResultsFolder';
import { resolveResultsDir } from '@/src/server/robot/resultsPaths';

export interface ResolveFolderInput {
  executionId: string;
  resultsPath?: string;
  resultsFolder?: string;
}

async function folderExistsOnDisk(folder: string): Promise<boolean> {
  if (!isPlausibleResultsFolderName(folder)) return false;
  try {
    const dir = resolveResultsDir(folder);
    await access(path.join(dir, 'output.xml'));
    return true;
  } catch {
    return false;
  }
}

/** Escolhe a primeira pasta em results/ que exista no disco para esta execução. */
export async function resolveBestResultsFolder(
  input: ResolveFolderInput,
): Promise<string | null> {
  const candidates = [
    input.resultsFolder?.trim(),
    input.resultsPath?.trim() ? extractResultsFolderFromPath(input.resultsPath) : null,
    input.executionId.trim(),
  ].filter((c): c is string => Boolean(c));

  const seen = new Set<string>();
  for (const folder of candidates) {
    if (seen.has(folder)) continue;
    seen.add(folder);
    if (await folderExistsOnDisk(folder)) return folder;
  }
  return null;
}
