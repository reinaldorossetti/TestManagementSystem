import type { DbTestCaseSphere } from '@/src/utils/sqliteEngine';
import {
  listSphereCases as listSphereRows,
  createSphereCase as createSphereRow,
  updateSphereCase as updateSphereRow,
  deleteSphereCase as deleteSphereRow,
} from '@/src/server/repositories/testCaseSphereRepository';
import type { SphereCreateInput, SphereUpdateInput } from '@/src/server/validation/schemas';
import { nowTimestamp } from '@/src/server/utils/identifiers';

export async function listCases(): Promise<DbTestCaseSphere[]> {
  return listSphereRows();
}

export async function createCase(input: SphereCreateInput): Promise<DbTestCaseSphere> {
  const history = input.history ?? [
    { user: 'Operador QA', action: 'created test case', time: nowTimestamp() },
  ];

  return createSphereRow({
    id: input.id,
    folder: input.folder,
    title: input.title,
    preconditions: input.preconditions ?? '',
    steps: input.steps ?? '',
    expectedResult: input.expected_result ?? '',
    observation: input.observation ?? null,
    createdAt: nowTimestamp(),
    history,
  });
}

export async function updateCase(
  id: string,
  input: SphereUpdateInput,
): Promise<DbTestCaseSphere> {
  return updateSphereRow(
    id,
    {
      folder: input.folder,
      title: input.title,
      preconditions: input.preconditions,
      steps: input.steps,
      expectedResult: input.expected_result,
      observation: input.observation,
    },
    input.appendHistory ?? [],
  );
}

export async function deleteCase(id: string): Promise<void> {
  await deleteSphereRow(id);
}
