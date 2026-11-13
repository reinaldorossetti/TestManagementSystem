import type { NextRequest } from 'next/server';
import { clearExecutionHistory } from '@/src/server/services/databaseService';
import { handleRoute, ok } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para limpar o histórico de execuções.');
    const snapshot = await clearExecutionHistory();
    return ok(snapshot);
  });
}
