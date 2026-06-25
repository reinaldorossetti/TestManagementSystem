import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  extractRobotExecutionTags,
  normalizeExecutionTagValue,
  type RobotTestTagEntry,
} from '@/src/utils/robotTagLoader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROBOT_SAMPLE_DIR = path.join(process.cwd(), 'robot-sample');

/** Lista `Test Tags` e `[Tags]` de cada suíte `.robot` em robot-sample/. */
export async function GET(): Promise<Response> {
  try {
    const entries = await readdir(ROBOT_SAMPLE_DIR, { withFileTypes: true });
    const robotFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.robot') && !e.name.startsWith('_'))
      .map((e) => e.name)
      .sort();

    const seen = new Set<string>();
    const tags: RobotTestTagEntry[] = [];

    for (const file of robotFiles) {
      const content = await readFile(path.join(ROBOT_SAMPLE_DIR, file), 'utf-8');
      for (const tag of extractRobotExecutionTags(content)) {
        const value = normalizeExecutionTagValue(tag);
        if (!value || seen.has(value)) continue;
        seen.add(value);
        tags.push({ tag, sourceFile: file });
      }
    }

    return Response.json({ tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao ler robot-sample/';
    return Response.json({ tags: [], error: message }, { status: 500 });
  }
}
