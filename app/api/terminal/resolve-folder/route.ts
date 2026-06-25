import { resolveBestResultsFolder } from '@/src/server/robot/resolveResultsFolder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resolve a pasta física em `results/` para uma execução (PDF / evidências).
 * Ignora caminhos simulados (`%ROBOT_HOME%/output_*.xml`) e valida no disco.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const executionId = url.searchParams.get('executionId')?.trim();
  if (!executionId) {
    return Response.json({ error: 'executionId ausente.' }, { status: 400 });
  }

  const folder = await resolveBestResultsFolder({
    executionId,
    resultsPath: url.searchParams.get('resultsPath')?.trim() || undefined,
    resultsFolder: url.searchParams.get('resultsFolder')?.trim() || undefined,
  });

  if (!folder) {
    return Response.json(
      {
        error:
          'Nenhuma pasta de evidências encontrada em results/. Execute os testes pelo Terminal Ao Vivo.',
        folder: null,
      },
      { status: 404 },
    );
  }

  return Response.json({ folder }, { status: 200 });
}
