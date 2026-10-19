import { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/src/server/http/responses';
import { authService } from '@/src/server/services/authService';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const rawToken = request.cookies.get('tms_session')?.value;
    if (!rawToken) {
      return ok({ user: null });
    }

    const user = await authService.getSessionUser(rawToken);
    return ok({ user });
  });
}
