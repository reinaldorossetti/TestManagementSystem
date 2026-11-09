import type { NextRequest } from 'next/server';
import { ApiError, handleRoute, ok } from '@/src/server/http/responses';
import { parseTestRunBody } from '@/src/server/http/testRunHttp';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import { testRunEvidenceLinkSchema } from '@/src/server/validation/testRunSchemas';

interface RouteContext {
  params:
    | Promise<{ id: string; sourceTestCaseId: string }>
    | { id: string; sourceTestCaseId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    const { id, sourceTestCaseId } = await context.params;
    const decodedCaseId = decodeURIComponent(sourceTestCaseId);
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const body = await parseTestRunBody(request, testRunEvidenceLinkSchema);
      const result = await testRunService.addLinkEvidence(
        id,
        decodedCaseId,
        { url: body.url, title: body.title },
        user,
      );
      return ok(result, 201);
    }

    const formData = await request.formData();
    if (formData.has('executionId')) {
      throw new ApiError(
        'Campo "executionId" não é aceito nas rotas do módulo Test Runs.',
        400,
        { field: 'executionId' },
      );
    }

    const file = formData.get('file');
    const title = String(formData.get('title') ?? '').trim();

    if (!(file instanceof File)) {
      throw new ApiError('Arquivo de evidência não enviado.', 400, { field: 'file' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await testRunService.addFileEvidence(
      id,
      decodedCaseId,
      {
        fileName: file.name,
        mimeType: file.type,
        buffer,
        title: title || undefined,
      },
      user,
    );
    return ok(result, 201);
  });
}

