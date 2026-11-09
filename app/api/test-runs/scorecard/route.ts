import type { NextRequest } from 'next/server';
import { ApiError, handleRoute, ok } from '@/src/server/http/responses';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import { scorecardQuerySchema } from '@/src/server/validation/testRunSchemas';

export function parseScorecardSearchParams(searchParams: URLSearchParams) {
  const milestone = searchParams.get('milestone')?.trim() || undefined;
  const rawRunIds = [
    ...searchParams.getAll('runIds'),
    ...searchParams.getAll('runId'),
  ]
    .flatMap((val) => val.split(','))
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  const from = searchParams.get('from')?.trim() || undefined;
  const to = searchParams.get('to')?.trim() || undefined;
  const includeAbortedParam = searchParams.get('includeAborted')?.trim()?.toLowerCase();
  const includeAborted = includeAbortedParam === 'true' || includeAbortedParam === '1';

  const parsed = scorecardQuerySchema.safeParse({
    milestone,
    runIds: rawRunIds.length > 0 ? rawRunIds : undefined,
    from,
    to,
    includeAborted,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiError(
      first?.message ?? 'Informe ao menos um critério (milestone, runIds ou período).',
      400,
      {
        field: first?.path?.join('.') || 'milestone',
        issues: parsed.error.issues,
      },
    );
  }

  return parsed.data;
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireTestRunSessionUser(request);
    const query = parseScorecardSearchParams(request.nextUrl.searchParams);
    const { scorecard } = await testRunService.getScorecardData(query);
    return ok(scorecard);
  });
}

