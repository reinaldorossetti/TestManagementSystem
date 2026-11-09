import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import { parseTestRunBody } from '@/src/server/http/testRunHttp';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import { updateTestRunSchema } from '@/src/server/validation/testRunSchemas';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requireTestRunSessionUser(request);
    const { id } = await context.params;
    const run = await testRunService.getRunById(id);
    return ok(run);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const { id } = await context.params;
    const body = await parseTestRunBody(request, updateTestRunSchema);
    const run = await testRunService.updateRun(id, body, user);
    return ok(run);
  });
}

