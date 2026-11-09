import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';

interface RouteContext {
  params:
    | Promise<{ id: string; sourceTestCaseId: string }>
    | { id: string; sourceTestCaseId: string };
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const { id, sourceTestCaseId } = await context.params;
    const run = await testRunService.removeCase(
      id,
      decodeURIComponent(sourceTestCaseId),
      user,
    );
    return ok(run);
  });
}

