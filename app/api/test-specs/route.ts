import type { NextRequest } from 'next/server';
import { listSpecs, createSpec } from '@/src/server/services/testSpecService';
import { testSpecCreateSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';

export async function GET() {
  return handleRoute(async () => {
    const specs = await listSpecs();
    return ok(specs);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const input = await parseBody(request, testSpecCreateSchema);
    const spec = await createSpec(input);
    return ok(spec, 201);
  });
}
