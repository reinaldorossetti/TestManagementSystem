import type { NextRequest } from 'next/server';
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
} from '@/src/server/services/folderService';
import {
  folderCreateSchema,
  folderRenameSchema,
  folderDeleteSchema,
} from '@/src/server/validation/schemas';
import { handleRoute, ok, parseBody } from '@/src/server/http/responses';
import { requireWriteAccessUser } from '@/src/server/http/sessionGuard';

export async function GET() {
  return handleRoute(async () => {
    const folders = await listFolders();
    return ok(folders);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para criar pastas de teste.');
    const { path } = await parseBody(request, folderCreateSchema);
    const created = await createFolder(path);
    return ok({ path: created }, 201);
  });
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para renomear pastas de teste.');
    const { oldPath, newPath } = await parseBody(request, folderRenameSchema);
    await renameFolder(oldPath, newPath);
    return ok({ oldPath, newPath });
  });
}

export async function DELETE(request: NextRequest) {
  return handleRoute(async () => {
    await requireWriteAccessUser(request, 'Usuário de consulta não possui permissão para excluir pastas de teste.');
    const { path } = await parseBody(request, folderDeleteSchema);
    await deleteFolder(path);
    return ok({ path });
  });
}
