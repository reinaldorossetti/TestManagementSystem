import type { NextRequest } from 'next/server';
import { getSnapshot, replaceDatabase } from '@/src/server/services/databaseService';
import { virtualDatabaseSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

export async function GET() {
  return handleRoute(async () => {
    const snapshot = await getSnapshot();
    return ok(snapshot);
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para alterar dados do sistema.');
    const db = await parseBody(request, virtualDatabaseSchema);
    await replaceDatabase(db);
    const snapshot = await getSnapshot();
    return ok(snapshot);
  });
}
