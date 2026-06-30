import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  FolderConflictError,
  FolderNotFoundError,
} from '@/src/server/services/folderService';
import {
  AcceptanceDocNotFoundError,
  AcceptanceDocValidationError,
} from '@/src/server/services/folderAcceptanceDocService';
import {
  EvidenceNotFoundError,
  EvidenceValidationError,
} from '@/src/server/services/testCaseEvidenceService';

/** Standard JSON success response. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/** Standard JSON error response. */
export function fail(message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Parses + validates a JSON request body against a Zod schema.
 * Throws an `ApiError` (handled by `handleRoute`) on invalid input.
 */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError('Corpo da requisição inválido (JSON malformado).', 400);
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError('Dados inválidos.', 400, result.error.issues);
  }
  return result.data;
}

/** Domain-agnostic API error carrying an HTTP status code. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Wraps a route handler, converting known error types into consistent HTTP
 * responses so individual handlers stay focused on the happy path.
 */
export async function handleRoute(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.message, error.status, error.details);
    }
    if (error instanceof FolderConflictError) {
      return fail(error.message, 409);
    }
    if (error instanceof FolderNotFoundError) {
      return fail(error.message, 404);
    }
    if (error instanceof AcceptanceDocValidationError) {
      return fail(error.message, 400);
    }
    if (error instanceof AcceptanceDocNotFoundError) {
      return fail(error.message, 404);
    }
    if (error instanceof EvidenceValidationError) {
      return fail(error.message, 400);
    }
    if (error instanceof EvidenceNotFoundError) {
      return fail(error.message, 404);
    }
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    console.error('[api] Unhandled route error:', error);
    return fail(message, 500);
  }
}
