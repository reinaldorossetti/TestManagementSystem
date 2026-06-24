import { getExecution, removeExecution } from '@/src/server/services/executionService';
import { ApiError, handleRoute, ok } from '@/src/server/http/responses';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    const execution = await getExecution(id);
    if (!execution) {
      throw new ApiError(`Execução "${id}" não encontrada.`, 404);
    }
    return ok(execution);
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    await removeExecution(id);
    return ok({ id });
  });
}
