import type { NextRequest } from 'next/server';
import { readEvidenceMedia, EvidenceNotFoundError } from '@/src/server/services/testCaseEvidenceService';

interface RouteContext {
  params: Promise<{ id: string; evidenceId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, evidenceId } = await params;
    const { buffer, mimeType } = await readEvidenceMedia(id, evidenceId);
    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    if (error instanceof EvidenceNotFoundError) {
      return new Response(error.message, { status: 404 });
    }
    return new Response('Erro ao carregar evidência.', { status: 500 });
  }
}
