import { prisma } from '@/src/lib/db';
import type { DbFolderProject } from '@/src/utils/sqliteEngine';
import type { DbClient } from './types';

function mapRow(row: { folderPath: string; projectId: string }): DbFolderProject {
  return {
    folder_path: row.folderPath,
    project_id: row.projectId,
  };
}

export async function listFolderProjects(client: DbClient = prisma): Promise<DbFolderProject[]> {
  const rows = await client.folderProject.findMany({ orderBy: { folderPath: 'asc' } });
  return rows.map(mapRow);
}

export async function createFolderProject(
  link: DbFolderProject,
  client: DbClient = prisma,
): Promise<DbFolderProject> {
  const row = await client.folderProject.create({
    data: {
      folderPath: link.folder_path,
      projectId: link.project_id,
    },
  });
  return mapRow(row);
}
