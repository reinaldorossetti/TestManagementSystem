import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  extractRobotExecutionTags,
  extractSuiteExecutionTags,
  normalizeExecutionTagValue,
  type RobotTestTagEntry,
} from '@/src/utils/robotTagLoader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEST_PROJECTS_DIR = path.join(process.cwd(), 'test_projects');

type RobotFileEntry = { file: string; folder: string };

/** Lista pastas de projeto de primeiro nível dentro de `test_projects/`. */
async function collectTopLevelProjectFolders(): Promise<string[]> {
  const entries = await readdir(TEST_PROJECTS_DIR, { withFileTypes: true });
  return entries
    .filter(
      (entry: { isDirectory: () => boolean; name: string }) =>
        entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'),
    )
    .map((entry: { name: string }) => entry.name)
    .sort((a: string, b: string) => a.localeCompare(b));
}

/**
 * Varre `test_projects/` recursivamente coletando arquivos `.robot`.
 * `folder` é o caminho (estilo posix) relativo a `test_projects/` da pasta
 * que contém o arquivo — `''` quando o arquivo está na raiz.
 */
async function collectRobotFiles(dir: string, relativeFolder = ''): Promise<RobotFileEntry[]> {
  const dirEntries = await readdir(dir, { withFileTypes: true });
  const files: RobotFileEntry[] = [];

  for (const entry of dirEntries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      const childFolder = relativeFolder ? `${relativeFolder}/${entry.name}` : entry.name;
      files.push(...(await collectRobotFiles(path.join(dir, entry.name), childFolder)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.robot')) {
      files.push({ file: entry.name, folder: relativeFolder });
    }
  }

  return files;
}

/** Lista as tags de suíte (`Test Tags` e `Force Tags`) e `[Tags]` de cada `.robot`. */
export async function GET(): Promise<Response> {
  try {
    const projectFolders = await collectTopLevelProjectFolders();
    const robotFiles = (await collectRobotFiles(TEST_PROJECTS_DIR)).sort((a, b) =>
      `${a.folder}/${a.file}`.localeCompare(`${b.folder}/${b.file}`),
    );

    const seen = new Set<string>();
    const tags: RobotTestTagEntry[] = [];

    for (const { file, folder } of robotFiles) {
      const content = await readFile(path.join(TEST_PROJECTS_DIR, folder, file), 'utf-8');
      const sourceProjectFolder = folder ? folder.split('/')[0] : '';
      const suiteExecutionTags = new Set(
        extractSuiteExecutionTags(content).map((tag) => normalizeExecutionTagValue(tag)),
      );
      for (const tag of extractRobotExecutionTags(content)) {
        const value = normalizeExecutionTagValue(tag);
        const seenKey = JSON.stringify([sourceProjectFolder, value]);
        if (!value || seen.has(seenKey)) continue;
        seen.add(seenKey);
        tags.push({
          tag,
          sourceFile: file,
          sourceFolder: sourceProjectFolder,
          isSuiteTestTag: suiteExecutionTags.has(value),
        });
      }
    }

    return Response.json({ tags, projectFolders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao ler test_projects/';
    return Response.json({ tags: [], projectFolders: [], error: message }, { status: 500 });
  }
}
