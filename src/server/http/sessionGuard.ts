import type { User } from '@/generated/prisma/client';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError } from '@/src/server/http/responses';
import { authService } from '@/src/server/services/authService';

export type AuthenticatedSessionUser = Omit<User, 'passwordHash'>;

const DEFAULT_VIEWER_FORBIDDEN_MESSAGE =
  'Usuário de consulta não possui permissão para cadastrar, editar ou executar testes.';

/**
 * Resolves the authenticated session user from the `tms_session` cookie.
 * Throws `ApiError(401)` when missing, invalid, expired, or blocked.
 */
export async function requireAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedSessionUser> {
  const rawToken = request.cookies.get('tms_session')?.value;
  if (!rawToken) {
    throw new ApiError('Não autenticado. Faça login para continuar.', 401);
  }
  const user = await authService.getSessionUser(rawToken);
  if (!user) {
    throw new ApiError('Sessão inválida ou expirada.', 401);
  }
  return user;
}

/**
 * Ensures the authenticated user is allowed to create, edit, delete, or execute tests.
 * Rejects `viewer` (Usuário de Consulta) with `ApiError(403)`.
 */
export async function requireWriteAccessUser(
  request: NextRequest,
  forbiddenMessage: string = DEFAULT_VIEWER_FORBIDDEN_MESSAGE,
): Promise<AuthenticatedSessionUser> {
  const user = await requireAuthenticatedUser(request);
  if (user.role === 'viewer') {
    throw new ApiError(forbiddenMessage, 403);
  }
  return user;
}

/**
 * Guard for streaming or custom `Response` route handlers that do not use `handleRoute`.
 * Returns a `NextResponse` (401 or 403) when blocked, or `null` when authorized.
 */
export async function requireWriteAccessResponse(
  request: NextRequest,
  forbiddenMessage: string = DEFAULT_VIEWER_FORBIDDEN_MESSAGE,
): Promise<NextResponse | null> {
  try {
    await requireWriteAccessUser(request, forbiddenMessage);
    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Erro ao validar permissões de sessão.' }, { status: 500 });
  }
}
