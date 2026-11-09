import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import { parseTestRunBody } from '@/src/server/http/testRunHttp';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import { createTestRunSchema } from '@/src/server/validation/testRunSchemas';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireTestRunSessionUser(request);

    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('projectId')?.trim() || undefined;
    const milestone = searchParams.get('milestone')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const includeCatalog = searchParams.get('includeCatalog') === 'true';

    const runs = await testRunService.listRuns({ projectId, milestone, status });
    if (includeCatalog) {
      const catalog = await testRunService.getCatalogSnapshot();
      return ok({ runs, catalog });
    }
    return ok({ runs });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const body = await parseTestRunBody(request, createTestRunSchema);
    const run = await testRunService.createRun(body, user);
    return ok(run, 201);
  });
}

