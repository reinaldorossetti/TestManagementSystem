import type { NextRequest } from 'next/server';
import { getAcceptanceDocHistory } from '@/src/server/services/folderAcceptanceDocService';
import { handleRoute, ok, ApiError } from '@/src/server/http/responses';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const folderPath = request.nextUrl.searchParams.get('folderPath')?.trim();
    if (!folderPath) {
      throw new ApiError('Parâmetro folderPath é obrigatório.', 400);
    }

    const history = await getAcceptanceDocHistory(folderPath);
    return ok(history);
  });
}
