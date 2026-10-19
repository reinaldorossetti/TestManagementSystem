import { NextRequest } from 'next/server';
import { handleRoute, ok, fail } from '@/src/server/http/responses';
import { authService } from '@/src/server/services/authService';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const rawToken = request.cookies.get('tms_session')?.value;
    if (!rawToken) {
      return fail('Não autenticado.', 401);
    }

    const currentUser = await authService.getSessionUser(rawToken);
    if (!currentUser || currentUser.role !== 'admin') {
      return fail('Acesso negado: Visualização restrita a Administradores.', 403);
    }

    const users = await authService.listUsersForAdmin(currentUser.id);
    return ok(users);
  });
}
