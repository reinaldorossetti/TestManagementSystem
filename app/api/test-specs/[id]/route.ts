import type { NextRequest } from 'next/server';
import { updateSpec, deleteSpec } from '@/src/server/services/testSpecService';
import { testSpecUpdateSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    const input = await parseBody(request, testSpecUpdateSchema);
    const spec = await updateSpec(id, input);
    return ok(spec);
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    await deleteSpec(id);
    return ok({ id });
  });
}
