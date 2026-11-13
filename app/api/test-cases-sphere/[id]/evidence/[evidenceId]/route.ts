import type { NextRequest } from 'next/server';
import { removeManualEvidence } from '@/src/server/services/testCaseEvidenceService';
import { handleRoute, ok } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

interface RouteContext {
  params: Promise<{ id: string; evidenceId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para excluir evidências.');
    const { id, evidenceId } = await params;
    await removeManualEvidence(id, evidenceId);
    return ok({ id: evidenceId });
  });
}
