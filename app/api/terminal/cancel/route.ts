import { cancelRobotRun } from '@/src/server/robot/activeRunRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cancels a Robot run registered by `/api/terminal/run`. */
export async function POST(req: Request): Promise<Response> {
  let runId = '';
  try {
    runId = String((await req.json() as { runId?: string }).runId ?? '').trim();
  } catch {
    return Response.json({ error: 'Corpo inválido (JSON esperado).' }, { status: 400 });
  }

  if (!runId) {
    return Response.json({ error: 'runId ausente.' }, { status: 400 });
  }

  if (!cancelRobotRun(runId)) {
    return Response.json({ error: 'Execução não encontrada ou já finalizada.' }, { status: 404 });
  }

  return Response.json({ cancelled: true });
}
