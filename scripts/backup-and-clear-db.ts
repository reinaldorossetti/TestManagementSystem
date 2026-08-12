import 'dotenv/config';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '@/src/lib/db';

const DEFAULT_DATABASE_URL = 'file:./prisma/dev.db';

function resolveDatabaseFile(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(
      `DATABASE_URL precisa apontar para um arquivo SQLite local durante o build. Valor recebido: ${databaseUrl}`,
    );
  }

  const fileReference = databaseUrl.slice('file:'.length).split('?')[0];
  if (!fileReference) {
    throw new Error('DATABASE_URL não contém o caminho do arquivo SQLite.');
  }

  if (fileReference.startsWith('/') && !fileReference.startsWith('/./')) {
    return fileURLToPath(`file:${fileReference}`);
  }

  return path.resolve(process.cwd(), fileReference);
}

function buildBackupName(databaseFile: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const extension = path.extname(databaseFile) || '.db';
  const baseName = path.basename(databaseFile, extension);
  return `${baseName}-${timestamp}${extension}`;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const databaseFile = resolveDatabaseFile(databaseUrl);
  const databaseDirectory = path.dirname(databaseFile);
  const backupDirectory = path.join(databaseDirectory, 'backups');

  await stat(databaseFile);
  await mkdir(backupDirectory, { recursive: true });

  const backupFile = path.join(backupDirectory, buildBackupName(databaseFile));
  await copyFile(databaseFile, backupFile);
  console.log(`[DB] Backup criado antes da limpeza: ${path.relative(process.cwd(), backupFile)}`);

  await prisma.$transaction(async (tx) => {
    // Remove dependentes antes dos registros pai para respeitar as FKs.
    await tx.step.deleteMany();
    await tx.testCase.deleteMany();
    await tx.testCaseEvidence.deleteMany();
    await tx.sphereManualExecution.deleteMany();
    await tx.testCaseHistory.deleteMany();
    await tx.folderAcceptanceDocHistory.deleteMany();
    await tx.execution.deleteMany();
    await tx.testCaseSphere.deleteMany();
    await tx.folderAcceptanceDoc.deleteMany();
    await tx.testSpec.deleteMany();
    await tx.folderProject.deleteMany();
    await tx.testFolder.deleteMany();
    await tx.project.deleteMany();
  });

  console.log('[DB] Banco limpo: schema preservado, tabelas sem registros e seed não executado.');
}

main()
  .catch((error) => {
    console.error('[DB] Falha ao criar backup ou limpar o banco:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

