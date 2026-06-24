import { resetDatabase } from '@/src/server/services/databaseService';
import { handleRoute, ok } from '@/src/server/http/responses';

export async function POST() {
  return handleRoute(async () => {
    const snapshot = await resetDatabase();
    return ok(snapshot);
  });
}
