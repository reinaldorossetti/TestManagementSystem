import { NextRequest, NextResponse } from 'next/server';
import { handleRoute, parseBody } from '@/src/server/http/responses';
import { loginInputSchema } from '@/src/server/validation/authSchemas';
import { authService } from '@/src/server/services/authService';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(request, loginInputSchema);
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const { user, rawToken, expiresAt } = await authService.login(body, ipAddress, userAgent);

    const isHttps =
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https';

    const response = NextResponse.json({ data: { user } }, { status: 200 });
    response.cookies.set({
      name: 'tms_session',
      value: rawToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt,
    });

    return response;
  });
}
