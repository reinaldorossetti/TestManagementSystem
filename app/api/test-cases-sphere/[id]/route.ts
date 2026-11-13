import type { NextRequest } from 'next/server';
import { updateCase, deleteCase } from '@/src/server/services/testCaseSphereService';
import { sphereUpdateSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para editar casos de teste.');
    const { id } = await params;
    const input = await parseBody(request, sphereUpdateSchema);
    const updated = await updateCase(id, input);
    return ok(updated);
  });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para excluir casos de teste.');
    const { id } = await params;
    await deleteCase(id);
    return ok({ id });
  });
}
