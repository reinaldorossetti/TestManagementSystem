import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/src/lib/db';
import { findSphereCaseById } from '@/src/server/repositories/testCaseSphereRepository';
import {
  createTestCaseEvidence,
  deleteTestCaseEvidence,
  deleteAllEvidenceForTestCase,
  findEvidenceById,
  listEvidenceByTestCase,
} from '@/src/server/repositories/testCaseEvidenceRepository';
import { resolveAutomatedEvidence } from '@/src/server/services/resolveAutomatedEvidence';
import type {
  DbTestCaseEvidenceBundle,
  DbTestCaseEvidenceItem,
} from '@/src/utils/sqliteEngine';

const PROJECT_ROOT = process.cwd();
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export class EvidenceValidationError extends Error {}
export class EvidenceNotFoundError extends Error {}

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function mediaUrl(testCaseId: string, evidenceId: string): string {
  return `/api/test-cases-sphere/${encodeURIComponent(testCaseId)}/evidence/${encodeURIComponent(evidenceId)}/media`;
}

function mapManualRow(row: {
  id: string;
  testCaseId: string;
  evidenceType: string;
  title: string;
  mimeType: string | null;
  fileName: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  createdAt: string;
  createdBy: string;
}): DbTestCaseEvidenceItem {
  const evidenceType = row.evidenceType as DbTestCaseEvidenceItem['evidence_type'];
  let previewUrl = row.externalUrl ?? '';
  if (evidenceType === 'image' || evidenceType === 'video') {
    previewUrl = mediaUrl(row.testCaseId, row.id);
  }

  return {
    id: row.id,
    test_case_id: row.testCaseId,
    source: 'manual',
    evidence_type: evidenceType,
    title: row.title || row.fileName || 'Evidência manual',
    mime_type: row.mimeType ?? undefined,
    file_name: row.fileName ?? undefined,
    storage_path: row.storagePath ?? undefined,
    external_url: row.externalUrl ?? undefined,
    created_at: row.createdAt,
    created_by: row.createdBy,
    preview_url: previewUrl,
    label:
      evidenceType === 'link'
        ? 'Link externo'
        : evidenceType === 'video'
          ? 'Vídeo manual'
          : 'Imagem manual',
  };
}

async function appendCaseHistory(testCaseId: string, action: string): Promise<void> {
  await prisma.testCaseHistory.create({
    data: {
      testCaseId,
      user: 'TMS',
      action,
      time: formatTimestamp(),
    },
  });
}

function evidenceStorageDir(testCaseId: string): string {
  return path.join(PROJECT_ROOT, 'storage', 'test-evidence', testCaseId);
}

export async function getEvidenceBundle(testCaseId: string): Promise<DbTestCaseEvidenceBundle> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) {
    throw new EvidenceNotFoundError('Caso de teste não encontrado.');
  }

  const [automated, manualRows] = await Promise.all([
    resolveAutomatedEvidence(sphereCase),
    listEvidenceByTestCase(testCaseId),
  ]);

  const manual = manualRows.map(mapManualRow);
  const allItems = [...automated, ...manual].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = allItems[0] ?? null;
  const items = latest
    ? allItems.filter((item) => item.id !== latest.id)
    : allItems;

  return {
    latest,
    items,
  };
}

export async function uploadManualEvidence(
  testCaseId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  title?: string,
): Promise<DbTestCaseEvidenceItem> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) {
    throw new EvidenceNotFoundError('Caso de teste não encontrado.');
  }

  const id = randomUUID();
  const createdAt = formatTimestamp();
  const safeTitle = title?.trim() || fileName;

  if (IMAGE_MIME.has(mimeType) || /\.(png|jpe?g|webp|gif)$/i.test(fileName)) {
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new EvidenceValidationError('Imagem excede o limite de 2 MB.');
    }
    const row = await createTestCaseEvidence({
      id,
      test_case_id: testCaseId,
      evidence_type: 'image',
      title: safeTitle,
      mime_type: mimeType || 'image/png',
      file_name: fileName,
      image_data: buffer,
      created_at: createdAt,
    });
    await appendCaseHistory(testCaseId, `uploaded manual evidence (image: ${fileName})`);
    return mapManualRow(row);
  }

  if (VIDEO_MIME.has(mimeType) || /\.(mp4|webm|mov)$/i.test(fileName)) {
    if (buffer.byteLength > MAX_VIDEO_BYTES) {
      throw new EvidenceValidationError('Vídeo excede o limite de 50 MB.');
    }
    const dir = evidenceStorageDir(testCaseId);
    await mkdir(dir, { recursive: true });
    const ext = path.extname(fileName) || '.mp4';
    const relPath = `storage/test-evidence/${testCaseId}/${id}${ext}`;
    const absPath = path.join(PROJECT_ROOT, relPath);
    await writeFile(absPath, buffer);

    const row = await createTestCaseEvidence({
      id,
      test_case_id: testCaseId,
      evidence_type: 'video',
      title: safeTitle,
      mime_type: mimeType || 'video/mp4',
      file_name: fileName,
      storage_path: relPath,
      created_at: createdAt,
    });
    await appendCaseHistory(testCaseId, `uploaded manual evidence (video: ${fileName})`);
    return mapManualRow(row);
  }

  throw new EvidenceValidationError('Formato não suportado. Use imagem (PNG/JPG/WebP) ou vídeo (MP4/WebM).');
}

export async function addLinkEvidence(
  testCaseId: string,
  url: string,
  title?: string,
): Promise<DbTestCaseEvidenceItem> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) {
    throw new EvidenceNotFoundError('Caso de teste não encontrado.');
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new EvidenceValidationError('URL inválida.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new EvidenceValidationError('Apenas links http/https são permitidos.');
  }

  const id = randomUUID();
  const createdAt = formatTimestamp();
  const row = await createTestCaseEvidence({
    id,
    test_case_id: testCaseId,
    evidence_type: 'link',
    title: title?.trim() || parsed.hostname,
    external_url: parsed.toString(),
    created_at: createdAt,
  });
  await appendCaseHistory(testCaseId, `uploaded manual evidence (link: ${parsed.hostname})`);
  return mapManualRow(row);
}

export async function readEvidenceMedia(
  testCaseId: string,
  evidenceId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const row = await findEvidenceById(testCaseId, evidenceId);
  if (!row || row.source !== 'manual') {
    throw new EvidenceNotFoundError('Evidência não encontrada.');
  }

  if (row.evidenceType === 'image' && row.imageData) {
    return {
      buffer: Buffer.from(row.imageData),
      mimeType: row.mimeType ?? 'image/png',
    };
  }

  if (row.evidenceType === 'video' && row.storagePath) {
    const abs = path.join(PROJECT_ROOT, row.storagePath);
    const buffer = await readFile(abs);
    return { buffer, mimeType: row.mimeType ?? 'video/mp4' };
  }

  throw new EvidenceNotFoundError('Arquivo de evidência não disponível.');
}

export async function removeManualEvidence(
  testCaseId: string,
  evidenceId: string,
): Promise<void> {
  const row = await findEvidenceById(testCaseId, evidenceId);
  if (!row || row.source !== 'manual') {
    throw new EvidenceNotFoundError('Evidência manual não encontrada.');
  }

  if (row.storagePath) {
    try {
      await rm(path.join(PROJECT_ROOT, row.storagePath), { force: true });
    } catch {
      /* ignore */
    }
  }

  const deleted = await deleteTestCaseEvidence(testCaseId, evidenceId);
  if (!deleted) {
    throw new EvidenceNotFoundError('Evidência manual não encontrada.');
  }
  await appendCaseHistory(testCaseId, 'deleted manual evidence');
}

export async function purgeEvidenceForTestCase(testCaseId: string): Promise<void> {
  const rows = await listEvidenceByTestCase(testCaseId);
  for (const row of rows) {
    if (row.storagePath) {
      try {
        await rm(path.join(PROJECT_ROOT, row.storagePath), { force: true });
      } catch {
        /* ignore */
      }
    }
  }
  const dir = evidenceStorageDir(testCaseId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  await deleteAllEvidenceForTestCase(testCaseId);
}
