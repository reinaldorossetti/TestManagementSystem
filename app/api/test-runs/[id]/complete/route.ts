import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const { id } = await context.params;
    const run = await testRunService.completeRun(id, user);
    return ok(run);
  });
}

