import type { DbTestSpec } from '@/src/utils/sqliteEngine';
import {
  listTestSpecs as listTestSpecRows,
  createTestSpec as createTestSpecRow,
  updateTestSpec as updateTestSpecRow,
  deleteTestSpec as deleteTestSpecRow,
} from '@/src/server/repositories/testSpecRepository';
import type { TestSpecCreateInput, TestSpecUpdateInput } from '@/src/server/validation/schemas';
import { generateId, nowTimestamp } from '@/src/server/utils/identifiers';

export async function listSpecs(): Promise<DbTestSpec[]> {
  return listTestSpecRows();
}

export async function createSpec(input: TestSpecCreateInput): Promise<DbTestSpec> {
  return createTestSpecRow({
    id: input.id ?? generateId('SPEC'),
    name: input.name,
    category: input.category,
    tags: input.tags,
    content: input.content,
    createdAt: nowTimestamp(),
  });
}

export async function updateSpec(
  id: string,
  input: TestSpecUpdateInput,
): Promise<DbTestSpec> {
  return updateTestSpecRow(id, {
    name: input.name,
    category: input.category,
    tags: input.tags,
    content: input.content,
  });
}

export async function deleteSpec(id: string): Promise<void> {
  await deleteTestSpecRow(id);
}
