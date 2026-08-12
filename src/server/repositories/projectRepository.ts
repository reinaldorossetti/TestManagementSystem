import { prisma } from '@/src/lib/db';
import type { DbProject, ProjectPlatform } from '@/src/utils/sqliteEngine';
import type { DbClient } from './types';

function mapRow(row: {
  id: string;
  name: string;
  details: string | null;
  platform: string | null;
  createdAt: string;
}): DbProject {
  return {
    id: row.id,
    name: row.name,
    details: row.details,
    platform: (row.platform as ProjectPlatform | null) ?? null,
    created_at: row.createdAt,
  };
}

export async function listProjects(client: DbClient = prisma): Promise<DbProject[]> {
  const rows = await client.project.findMany({ orderBy: { name: 'asc' } });
  return rows.map(mapRow);
}

export async function createProject(
  project: DbProject,
  client: DbClient = prisma,
): Promise<DbProject> {
  const row = await client.project.create({
    data: {
      id: project.id,
      name: project.name,
      details: project.details ?? null,
      platform: project.platform ?? null,
      createdAt: project.created_at,
    },
  });
  return mapRow(row);
}
