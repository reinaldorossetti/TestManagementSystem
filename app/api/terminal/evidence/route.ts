import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { resolveResultsDir } from '@/src/server/robot/resultsPaths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface EvidenceManifest {
  folder: string;
  browserScreenshots: string[];
  testReports: Record<string, string>;
  suiteReport?: string;
}

/**
 * Lista imagens de evidência em `results/<folder>/` (browser/screenshot + artifacts)
 * para o PDF resolver arquivos mesmo quando os caminhos não estão no banco.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const folder = url.searchParams.get('folder')?.trim();
  if (!folder) {
    return Response.json({ error: 'Parâmetro folder ausente.' }, { status: 400 });
  }

  let resultsDir: string;
  try {
    resultsDir = resolveResultsDir(folder);
  } catch {
    return Response.json({ error: 'Pasta inválida.' }, { status: 400 });
  }

  const manifest: EvidenceManifest = {
    folder,
    browserScreenshots: [],
    testReports: {},
  };

  const browserDir = path.join(resultsDir, 'browser', 'screenshot');
  try {
    const files = await readdir(browserDir);
    manifest.browserScreenshots = files
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .map((f) => `browser/screenshot/${f}`);
  } catch {
    /* sem screenshots de passos */
  }

  const artifactsDir = path.join(resultsDir, 'artifacts');
  try {
    const files = await readdir(artifactsDir);
    for (const f of files) {
      if (!/\.(png|jpe?g)$/i.test(f)) continue;
      const rel = `artifacts/${f}`;
      if (f === 'robot-report.png') {
        manifest.suiteReport = rel;
      } else if (f.startsWith('robot-log-')) {
        const robotId = f.replace(/^robot-log-/, '').replace(/\.(png|jpe?g)$/i, '');
        manifest.testReports[robotId] = rel;
      }
    }
  } catch {
    /* sem artifacts */
  }

  return Response.json(manifest, { status: 200 });
}
