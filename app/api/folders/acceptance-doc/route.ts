import type { NextRequest } from 'next/server';
import {
  getAcceptanceDocForFolder,
  getAcceptanceDocHistory,
  readAcceptanceMarkdown,
  removeAcceptanceDoc,
  saveAcceptanceDocWithHistory,
  moveAcceptanceDocFolder,
  updateAcceptanceDocContent,
} from '@/src/server/services/folderAcceptanceDocService';
import {
  folderAcceptanceRenameSchema,
  folderAcceptanceDocUpdateSchema,
} from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody, ApiError } from '@/src/server/http/responses';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const folderPath = request.nextUrl.searchParams.get('folderPath')?.trim();
    if (!folderPath) {
      throw new ApiError('Parâmetro folderPath é obrigatório.', 400);
    }

    const includeContent = request.nextUrl.searchParams.get('content') === '1';
    const doc = await getAcceptanceDocForFolder(folderPath);
    if (!doc) {
      throw new ApiError('Nenhum critério de aceite importado para esta pasta.', 404);
    }

    if (!includeContent) {
      return ok(doc);
    }

    const markdown = await readAcceptanceMarkdown(folderPath);
    return ok({ ...doc, markdown });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const formData = await request.formData();
    const folderPath = String(formData.get('folderPath') ?? '').trim();
    const file = formData.get('file');

    if (!folderPath) {
      throw new ApiError('Pasta/feature não informada.', 400);
    }
    if (!(file instanceof File)) {
      throw new ApiError('Arquivo .md não enviado.', 400);
    }

    const content = await file.text();
    const doc = await saveAcceptanceDocWithHistory(folderPath, file.name, content);
    return ok(doc, 201);
  });
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    const folderPath = request.nextUrl.searchParams.get('folderPath')?.trim();
    if (folderPath) {
      const body = await parseBody(request, folderAcceptanceDocUpdateSchema);
      if (body.folderPath !== folderPath) {
        throw new ApiError('folderPath do corpo difere do parâmetro da URL.', 400);
      }
      const result = await updateAcceptanceDocContent(
        body.folderPath,
        body.content,
        body.user,
      );
      return ok(result);
    }

    const { oldFolderPath, newFolderPath } = await parseBody(request, folderAcceptanceRenameSchema);
    await moveAcceptanceDocFolder(oldFolderPath, newFolderPath);
    const doc = await getAcceptanceDocForFolder(newFolderPath);
    return ok(doc ?? { oldFolderPath, newFolderPath });
  });
}

export async function DELETE(request: NextRequest) {
  return handleRoute(async () => {
    const folderPath = request.nextUrl.searchParams.get('folderPath')?.trim();
    if (!folderPath) {
      throw new ApiError('Parâmetro folderPath é obrigatório.', 400);
    }
    await removeAcceptanceDoc(folderPath);
    return ok({ folderPath });
  });
}
