import { z } from 'zod';
import { ApiError } from '@/src/server/http/responses';

/**
 * Parses and validates JSON body for `/api/test-runs` endpoints, returning
 * HTTP 400 with the failing field key in both `error` and `details` when invalid.
 */
export async function parseTestRunBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError('Corpo da requisição inválido (JSON malformado).', 400);
  }

  if (
    json &&
    typeof json === 'object' &&
    'executionId' in (json as Record<string, unknown>) &&
    (json as Record<string, unknown>).executionId !== undefined
  ) {
    throw new ApiError(
      'Campo "executionId" não é aceito nas rotas do módulo Test Runs.',
      400,
      { field: 'executionId', fieldErrors: { executionId: ['executionId não permitido'] } },
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldKey = firstIssue?.path?.join('.') || 'body';
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'body';
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    throw new ApiError(
      `Erro no campo "${fieldKey}": ${firstIssue?.message ?? 'Dados inválidos.'}`,
      400,
      {
        field: fieldKey,
        fieldErrors,
        issues: parsed.error.issues,
      },
    );
  }

  return parsed.data;
}

