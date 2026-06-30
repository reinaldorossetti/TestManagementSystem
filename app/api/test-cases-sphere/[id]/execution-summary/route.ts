import type { NextRequest } from 'next/server';
import {
  getExecutionSummary,
  ManualExecutionNotFoundError,
} from '@/src/server/services/manualExecutionService';
import { handleRoute, ok, ApiError } from '@/src/server/http/responses';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    try {
      const summary = await getExecutionSummary(id);
      return ok(summary);
    } catch (error) {
      if (error instanceof ManualExecutionNotFoundError) {
        throw new ApiError(error.message, 404);
      }
      throw error;
    }
  });
}
