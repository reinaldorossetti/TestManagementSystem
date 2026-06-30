import { prisma } from '@/src/lib/db';

export interface TestCaseEvidenceRow {
  id: string;
  testCaseId: string;
  source: string;
  evidenceType: string;
  title: string;
  mimeType: string | null;
  fileName: string | null;
  imageData: Uint8Array | null;
  storagePath: string | null;
  externalUrl: string | null;
  createdAt: string;
  createdBy: string;
}

export interface TestCaseEvidenceCreateInput {
  id: string;
  test_case_id: string;
  evidence_type: string;
  title: string;
  mime_type?: string | null;
  file_name?: string | null;
  image_data?: Buffer | null;
  storage_path?: string | null;
  external_url?: string | null;
  created_at: string;
  created_by?: string;
}

export async function listEvidenceByTestCase(testCaseId: string): Promise<TestCaseEvidenceRow[]> {
  return prisma.testCaseEvidence.findMany({
    where: { testCaseId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findEvidenceById(
  testCaseId: string,
  evidenceId: string,
): Promise<TestCaseEvidenceRow | null> {
  return prisma.testCaseEvidence.findFirst({
    where: { id: evidenceId, testCaseId },
  });
}

export async function createTestCaseEvidence(
  data: TestCaseEvidenceCreateInput,
): Promise<TestCaseEvidenceRow> {
  return prisma.testCaseEvidence.create({
    data: {
      id: data.id,
      testCaseId: data.test_case_id,
      source: 'manual',
      evidenceType: data.evidence_type,
      title: data.title,
      mimeType: data.mime_type ?? null,
      fileName: data.file_name ?? null,
      imageData: data.image_data ?? null,
      storagePath: data.storage_path ?? null,
      externalUrl: data.external_url ?? null,
      createdAt: data.created_at,
      createdBy: data.created_by ?? 'TMS',
    },
  });
}

export async function deleteTestCaseEvidence(testCaseId: string, evidenceId: string): Promise<boolean> {
  const result = await prisma.testCaseEvidence.deleteMany({
    where: { id: evidenceId, testCaseId, source: 'manual' },
  });
  return result.count > 0;
}

export async function deleteAllEvidenceForTestCase(testCaseId: string): Promise<void> {
  await prisma.testCaseEvidence.deleteMany({ where: { testCaseId } });
}
