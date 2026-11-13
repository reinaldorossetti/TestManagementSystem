import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireWriteAccessResponse } from '@/src/server/http/sessionGuard';
import {
  getRobotResultsDirectory,
  setRobotResultsDirectory,
} from '@/src/server/services/robotRuntimeSettingsService';
import { resolveResultsRoot } from '@/src/server/robot/resultsPaths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  resultsDirectory: z.string().min(1).max(500),
});

export async function GET(): Promise<Response> {
  try {
    return Response.json({
      resultsDirectory: await getRobotResultsDirectory(),
      resolvedDirectory: await resolveResultsRoot(),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  const denied = await requireWriteAccessResponse(
    request,
    'Usuário de consulta não possui permissão para alterar configurações do sistema.',
  );
  if (denied) return denied;

  try {
    const body = settingsSchema.parse(await request.json());
    const resultsDirectory = await setRobotResultsDirectory(body.resultsDirectory);
    return Response.json({
      resultsDirectory,
      resolvedDirectory: await resolveResultsRoot(),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
