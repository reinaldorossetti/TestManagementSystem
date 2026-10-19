import { NextRequest, NextResponse } from 'next/server';
import { handleRoute } from '@/src/server/http/responses';
import { authService } from '@/src/server/services/authService';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const rawToken = request.cookies.get('tms_session')?.value;
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined;

    if (rawToken) {
      await authService.logout(rawToken, ipAddress);
    }

    const response = NextResponse.json({ data: { message: 'Sessão encerrada com sucesso.' } });
    response.cookies.delete('tms_session');
    return response;
  });
}
