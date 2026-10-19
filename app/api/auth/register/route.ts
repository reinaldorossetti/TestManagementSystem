import { NextRequest } from 'next/server';
import { handleRoute, parseBody, ok } from '@/src/server/http/responses';
import { registerInputSchema } from '@/src/server/validation/authSchemas';
import { authService } from '@/src/server/services/authService';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(request, registerInputSchema);
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const user = await authService.register(body, ipAddress, userAgent);
    return ok(user, 201);
  });
}
