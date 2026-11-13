import type { NextRequest } from 'next/server';
import { requireWriteAccessResponse } from '@/src/server/http/sessionGuard';
import { cancelRobotRun } from '@/src/server/robot/activeRunRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cancels a Robot run registered by `/api/terminal/run`. */
export async function POST(req: NextRequest): Promise<Response> {
  const denied = await requireWriteAccessResponse(
    req,
    'Usuário de consulta não possui permissão para controlar execuções de testes.',
  );
  if (denied) return denied;

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
