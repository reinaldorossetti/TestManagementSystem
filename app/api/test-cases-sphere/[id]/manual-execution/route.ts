import type { NextRequest } from 'next/server';
import {
  listManualExecutionHistory,
  recordManualExecution,
  ManualExecutionNotFoundError,
} from '@/src/server/services/manualExecutionService';
import { manualExecutionCreateSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody, ApiError } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    try {
      const items = await listManualExecutionHistory(id);
      return ok(items);
    } catch (error) {
      if (error instanceof ManualExecutionNotFoundError) {
        throw new ApiError(error.message, 404);
      }
      throw error;
    }
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para executar testes manualmente.');
    const { id } = await params;
    const input = await parseBody(request, manualExecutionCreateSchema);
    try {
      const result = await recordManualExecution(id, input);
      return ok(result, 201);
    } catch (error) {
      if (error instanceof ManualExecutionNotFoundError) {
        throw new ApiError(error.message, 404);
      }
      throw error;
    }
  });
}
