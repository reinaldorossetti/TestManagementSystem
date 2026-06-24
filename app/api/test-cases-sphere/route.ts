import type { NextRequest } from 'next/server';
import { listCases, createCase } from '@/src/server/services/testCaseSphereService';
import { sphereCreateSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';

export async function GET() {
  return handleRoute(async () => {
    const cases = await listCases();
    return ok(cases);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const input = await parseBody(request, sphereCreateSchema);
    const created = await createCase(input);
    return ok(created, 201);
  });
}
