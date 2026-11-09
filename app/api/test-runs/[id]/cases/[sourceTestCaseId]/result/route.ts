import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import { parseTestRunBody } from '@/src/server/http/testRunHttp';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import { testRunResultSchema } from '@/src/server/validation/testRunSchemas';

interface RouteContext {
  params:
    | Promise<{ id: string; sourceTestCaseId: string }>
    | { id: string; sourceTestCaseId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const { id, sourceTestCaseId } = await context.params;
    const body = await parseTestRunBody(request, testRunResultSchema);
    const run = await testRunService.recordCaseResult(
      id,
      decodeURIComponent(sourceTestCaseId),
      body,
      user,
    );
    return ok(run);
  });
}

