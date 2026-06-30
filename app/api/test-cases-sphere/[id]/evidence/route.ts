import type { NextRequest } from 'next/server';
import {
  addLinkEvidence,
  getEvidenceBundle,
  uploadManualEvidence,
} from '@/src/server/services/testCaseEvidenceService';
import { testCaseEvidenceLinkSchema } from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody, ApiError } from '@/src/server/http/responses';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    const bundle = await getEvidenceBundle(id);
    return ok(bundle);
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  return handleRoute(async () => {
    const { id } = await params;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const body = await parseBody(request, testCaseEvidenceLinkSchema);
      const item = await addLinkEvidence(id, body.url, body.title);
      return ok(item, 201);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') ?? '').trim();

    if (!(file instanceof File)) {
      throw new ApiError('Arquivo de evidência não enviado.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const item = await uploadManualEvidence(
      id,
      file.name,
      file.type,
      buffer,
      title || undefined,
    );
    return ok(item, 201);
  });
}
