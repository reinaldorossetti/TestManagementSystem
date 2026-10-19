import { NextRequest } from 'next/server';
import { handleRoute, ok, fail } from '@/src/server/http/responses';
import { authService } from '@/src/server/services/authService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return handleRoute(async () => {
    const rawToken = request.cookies.get('tms_session')?.value;
    if (!rawToken) {
      return fail('Não autenticado.', 401);
    }

    const currentUser = await authService.getSessionUser(rawToken);
    if (!currentUser || currentUser.role !== 'admin') {
      return fail('Acesso negado: Somente administradores podem desbloquear contas.', 403);
    }

    const resolvedParams = await context.params;
    const targetUserId = resolvedParams.id;
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const unlockedUser = await authService.unlockUser(
      targetUserId,
      currentUser.id,
      ipAddress,
      userAgent
    );

    return ok({
      message: `Usuário ${unlockedUser.email} desbloqueado com sucesso.`,
      user: unlockedUser,
    });
  });
}
