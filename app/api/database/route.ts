import type { NextRequest } from 'next/server';
import { getSnapshot, replaceDatabase } from '@/src/server/services/databaseService';
import { virtualDatabaseSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';

export async function GET() {
  return handleRoute(async () => {
    const snapshot = await getSnapshot();
    return ok(snapshot);
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    const db = await parseBody(request, virtualDatabaseSchema);
    await replaceDatabase(db);
    const snapshot = await getSnapshot();
    return ok(snapshot);
  });
}
