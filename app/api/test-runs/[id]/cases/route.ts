import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import { parseTestRunBody } from '@/src/server/http/testRunHttp';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import { includeTestRunCasesSchema } from '@/src/server/validation/testRunSchemas';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const { id } = await context.params;
    const body = await parseTestRunBody(request, includeTestRunCasesSchema);
    const result = await testRunService.includeCases(id, body, user);
    return ok(result, 201);
  });
}

