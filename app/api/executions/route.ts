import type { NextRequest } from 'next/server';
import { listExecutions } from '@/src/server/repositories/executionRepository';
import { persistRun } from '@/src/server/services/executionService';
import { persistRunSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

export async function GET() {
  return handleRoute(async () => {
    const executions = await listExecutions();
    return ok(executions);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para persistir execuções de testes.');
    const payload = await parseBody(request, persistRunSchema);
    await persistRun(payload);
    return ok({ id: payload.execution.id }, 201);
  });
}
