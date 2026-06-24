import type { NextRequest } from 'next/server';
import { runReadOnlyQuery } from '@/src/server/services/sqlService';
import { sqlQuerySchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const { query } = await parseBody(request, sqlQuerySchema);
    const result = await runReadOnlyQuery(query);
    return ok(result);
  });
}
