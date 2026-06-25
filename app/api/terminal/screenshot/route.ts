import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveResultsDir } from '@/src/server/robot/resultsPaths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serve screenshots gerados pelo Robot Framework Browser (Playwright) a partir de
 * `results/<runId>/browser/screenshot/*.png` para uso no PDF e na UI.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId')?.trim();
  const relPath = url.searchParams.get('path')?.trim().replace(/\\/g, '/');

  if (!runId || !relPath || relPath.includes('..') || path.isAbsolute(relPath)) {
    return new Response('Parâmetros inválidos.', { status: 400 });
  }

  let resultsDir: string;
  try {
    resultsDir = resolveResultsDir(runId);
  } catch {
    return new Response('runId inválido.', { status: 400 });
  }

  const fullPath = path.resolve(resultsDir, relPath);
  if (!fullPath.startsWith(path.resolve(resultsDir))) {
    return new Response('Caminho inválido.', { status: 400 });
  }

  try {
    const buf = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return new Response(buf, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new Response('Screenshot não encontrado.', { status: 404 });
  }
}
