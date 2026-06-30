import type { NextRequest } from 'next/server';
import { removeManualEvidence } from '@/src/server/services/testCaseEvidenceService';
import { handleRoute, ok } from '@/src/server/http/responses';

interface RouteContext {
  params: Promise<{ id: string; evidenceId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id, evidenceId } = await params;
    await removeManualEvidence(id, evidenceId);
    return ok({ id: evidenceId });
  });
}
