import { createClient, type Client, type InValue } from '@libsql/client';
import { INITIAL_DB_SEED } from '@/src/utils/sqliteEngine';
import type {
  TestRunCaseStatus,
  TestRunEventAction,
  TestRunStatus,
} from '../validation/testRunSchemas';

export interface TestRunEvidenceRecord {
  id: string;
  testRunCaseId: string;
  evidenceType: 'file' | 'link';
  title: string;
  mimeType: string | null;
  fileName: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  previewUrl: string;
  createdAt: string;
  createdBy: string;
}

export interface TestRunCaseRecord {
  id: string;
  testRunId: string;
  sourceTestCaseId: string;
  folderSnapshot: string;
  titleSnapshot: string;
  badgeSnapshot: string;
  status: TestRunCaseStatus;
  notes: string;
  durationS: number | null;
  executedByUserId: string | null;
  executedAt: string | null;
  evidence: TestRunEvidenceRecord[];
}

export interface TestRunEventRecord {
  id: string;
  testRunId: string;
  userId: string;
  action: TestRunEventAction | string;
  summary: string;
  time: string;
}

export interface TestRunRecord {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  appVersion: string;
  platform: string;
  environment: string;
  browserOrDevice: string | null;
  milestone: string;
  suiteType: string;
  mode: string;
  status: TestRunStatus;
  plannedStartAt: string | null;
  startedAt: string | null;
  closedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  cases: TestRunCaseRecord[];
  events: TestRunEventRecord[];
}

export interface CatalogProjectSummary {
  id: string;
  name: string;
  platform: string | null;
  details: string | null;
}

export interface CatalogCaseSummary {
  id: string;
  folder: string;
  title: string;
  preconditions: string;
}

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

const globalForTestRunDb = globalThis as unknown as {
  testRunLibsqlClient?: Client;
  testRunSchemaReady?: Promise<void>;
};

function getLibsqlClient(): Client {
  if (!globalForTestRunDb.testRunLibsqlClient) {
    globalForTestRunDb.testRunLibsqlClient = createClient({ url: DATABASE_URL });
  }
  return globalForTestRunDb.testRunLibsqlClient;
}

async function ensureTestRunTables(): Promise<void> {
  if (!globalForTestRunDb.testRunSchemaReady) {
    const client = getLibsqlClient();
    globalForTestRunDb.testRunSchemaReady = (async () => {
      await client.execute('PRAGMA foreign_keys = ON;');
      await client.execute(`
        CREATE TABLE IF NOT EXISTS "test_runs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "project_id" TEXT NOT NULL,
          "project_name" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "app_version" TEXT NOT NULL,
          "platform" TEXT NOT NULL,
          "environment" TEXT NOT NULL,
          "browser_or_device" TEXT,
          "milestone" TEXT NOT NULL,
          "suite_type" TEXT NOT NULL,
          "mode" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'Draft',
          "planned_start_at" TEXT,
          "started_at" TEXT,
          "closed_at" TEXT,
          "created_by_user_id" TEXT NOT NULL,
          "created_at" TEXT NOT NULL,
          "updated_at" TEXT NOT NULL
        );
      `);
      await client.execute(
        'CREATE INDEX IF NOT EXISTS "test_runs_project_id_idx" ON "test_runs"("project_id");',
      );
      await client.execute(
        'CREATE INDEX IF NOT EXISTS "test_runs_milestone_idx" ON "test_runs"("milestone");',
      );
      await client.execute(
        'CREATE INDEX IF NOT EXISTS "test_runs_status_idx" ON "test_runs"("status");',
      );

      await client.execute(`
        CREATE TABLE IF NOT EXISTS "test_run_cases" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "test_run_id" TEXT NOT NULL,
          "source_test_case_id" TEXT NOT NULL,
          "folder_snapshot" TEXT NOT NULL,
          "title_snapshot" TEXT NOT NULL,
          "badge_snapshot" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'Open',
          "notes" TEXT NOT NULL DEFAULT '',
          "duration_s" REAL,
          "executed_by_user_id" TEXT,
          "executed_at" TEXT,
          CONSTRAINT "test_run_cases_test_run_id_fkey"
            FOREIGN KEY ("test_run_id") REFERENCES "test_runs" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await client.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "test_run_cases_test_run_id_source_test_case_id_key" ON "test_run_cases"("test_run_id", "source_test_case_id");',
      );
      await client.execute(
        'CREATE INDEX IF NOT EXISTS "test_run_cases_test_run_id_idx" ON "test_run_cases"("test_run_id");',
      );

      await client.execute(`
        CREATE TABLE IF NOT EXISTS "test_run_events" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "test_run_id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "summary" TEXT NOT NULL DEFAULT '',
          "time" TEXT NOT NULL,
          CONSTRAINT "test_run_events_test_run_id_fkey"
            FOREIGN KEY ("test_run_id") REFERENCES "test_runs" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await client.execute(
        'CREATE INDEX IF NOT EXISTS "test_run_events_test_run_id_idx" ON "test_run_events"("test_run_id");',
      );

      await client.execute(`
        CREATE TABLE IF NOT EXISTS "test_run_evidence" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "test_run_case_id" TEXT NOT NULL,
          "evidence_type" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "mime_type" TEXT,
          "file_name" TEXT,
          "image_data" BLOB,
          "storage_path" TEXT,
          "external_url" TEXT,
          "created_at" TEXT NOT NULL,
          "created_by" TEXT NOT NULL,
          CONSTRAINT "test_run_evidence_test_run_case_id_fkey"
            FOREIGN KEY ("test_run_case_id") REFERENCES "test_run_cases" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await client.execute(
        'CREATE INDEX IF NOT EXISTS "test_run_evidence_test_run_case_id_idx" ON "test_run_evidence"("test_run_case_id");',
      );
    })();
  }
  await globalForTestRunDb.testRunSchemaReady;
}

const badgeCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function sortRunCases(cases: TestRunCaseRecord[]): TestRunCaseRecord[] {
  return [...cases].sort((a, b) => {
    const cmp = badgeCollator.compare(a.badgeSnapshot, b.badgeSnapshot);
    if (cmp !== 0) return cmp;
    return badgeCollator.compare(a.sourceTestCaseId, b.sourceTestCaseId);
  });
}

function buildEvidencePreviewUrl(row: {
  id: string;
  evidenceType: string;
  mimeType: string | null;
  imageData: unknown;
  externalUrl: string | null;
}): string {
  if (row.evidenceType === 'link') {
    return row.externalUrl ?? '';
  }
  if (row.imageData) {
    let buffer: Buffer | null = null;
    if (Buffer.isBuffer(row.imageData)) {
      buffer = row.imageData;
    } else if (row.imageData instanceof Uint8Array) {
      buffer = Buffer.from(row.imageData);
    } else if (row.imageData instanceof ArrayBuffer) {
      buffer = Buffer.from(row.imageData);
    }
    if (buffer && buffer.byteLength > 0) {
      const mime = row.mimeType || 'image/png';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }
  }
  return '';
}

export class TestRunRepository {
  /**
   * Read-only lookup of all projects from the catalog (`projects` table).
   * Falls back to INITIAL_DB_SEED if the table is empty.
   */
  async listCatalogProjects(): Promise<CatalogProjectSummary[]> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const byId = new Map<string, CatalogProjectSummary>();

    try {
      const res = await client.execute(
        'SELECT id, name, platform, details FROM projects ORDER BY name ASC;',
      );
      for (const r of res.rows) {
        const id = String(r.id);
        byId.set(id, {
          id,
          name: String(r.name),
          platform: r.platform !== null && r.platform !== undefined ? String(r.platform) : null,
          details: r.details !== null && r.details !== undefined ? String(r.details) : null,
        });
      }
    } catch {
      // Fallback to seed below if table not ready
    }

    for (const p of INITIAL_DB_SEED.projects ?? []) {
      if (!byId.has(p.id)) {
        byId.set(p.id, {
          id: p.id,
          name: p.name,
          platform: p.platform ?? null,
          details: p.details ?? null,
        });
      }
    }

    return Array.from(byId.values());
  }

  /**
   * Read-only lookup of a project by ID from the catalog (`projects` table).
   */
  async findCatalogProjectById(projectId: string): Promise<CatalogProjectSummary | null> {
    const projects = await this.listCatalogProjects();
    return projects.find((p) => p.id === projectId) ?? null;
  }

  /**
   * Read-only lookup of folders associated with a project (`folder_projects` + `test_cases_sphere`).
   */
  async listCatalogFoldersForProject(projectId: string): Promise<string[]> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const folderSet = new Set<string>();
    const otherProjectFolders = new Set<string>();

    try {
      const fpRes = await client.execute(
        'SELECT folder_path, project_id FROM folder_projects ORDER BY folder_path ASC;',
      );
      for (const row of fpRes.rows) {
        const folderPath = String(row.folder_path);
        const rowProjectId = String(row.project_id);
        if (rowProjectId === projectId) {
          folderSet.add(folderPath);
        } else {
          otherProjectFolders.add(folderPath);
        }
      }

      const allCases = await this.listAllCatalogCases();
      for (const tc of allCases) {
        const folder = tc.folder;
        if (!folder) continue;
        folderSet.add(folder);
      }
    } catch {
      // Fallback to seed if needed
    }

    if (folderSet.size === 0) {
      for (const fp of INITIAL_DB_SEED.folder_projects ?? []) {
        if (fp.project_id === projectId) {
          folderSet.add(fp.folder_path);
        }
      }
      for (const tc of INITIAL_DB_SEED.test_cases_sphere ?? []) {
        folderSet.add(tc.folder);
      }
    }

    return Array.from(folderSet).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Read-only lookup of catalog test cases (`test_cases_sphere`).
   */
  async listAllCatalogCases(): Promise<CatalogCaseSummary[]> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const byId = new Map<string, CatalogCaseSummary>();
    try {
      const res = await client.execute(
        'SELECT id, folder, title, preconditions FROM test_cases_sphere ORDER BY created_at ASC;',
      );
      for (const r of res.rows) {
        const id = String(r.id);
        byId.set(id, {
          id,
          folder: String(r.folder),
          title: String(r.title),
          preconditions: String(r.preconditions ?? ''),
        });
      }
    } catch {
      // Fallback to seed below
    }

    for (const c of INITIAL_DB_SEED.test_cases_sphere ?? []) {
      if (!byId.has(c.id)) {
        byId.set(c.id, {
          id: c.id,
          folder: c.folder,
          title: c.title,
          preconditions: c.preconditions ?? '',
        });
      }
    }

    return Array.from(byId.values());
  }

  async createTestRun(data: {
    id: string;
    projectId: string;
    projectName: string;
    name: string;
    appVersion: string;
    platform: string;
    environment: string;
    browserOrDevice: string | null;
    milestone: string;
    suiteType: string;
    mode: string;
    status: TestRunStatus;
    plannedStartAt: string | null;
    startedAt: string | null;
    closedAt: string | null;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    await client.execute({
      sql: `
        INSERT INTO test_runs (
          id, project_id, project_name, name, app_version, platform, environment,
          browser_or_device, milestone, suite_type, mode, status,
          planned_start_at, started_at, closed_at, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      args: [
        data.id,
        data.projectId,
        data.projectName,
        data.name,
        data.appVersion,
        data.platform,
        data.environment,
        data.browserOrDevice,
        data.milestone,
        data.suiteType,
        data.mode,
        data.status,
        data.plannedStartAt,
        data.startedAt,
        data.closedAt,
        data.createdByUserId,
        data.createdAt,
        data.updatedAt,
      ],
    });
  }

  async addEvent(data: {
    id: string;
    testRunId: string;
    userId: string;
    action: TestRunEventAction;
    summary: string;
    time: string;
  }): Promise<void> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    await client.execute({
      sql: `
        INSERT INTO test_run_events (id, test_run_id, user_id, action, summary, time)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      args: [data.id, data.testRunId, data.userId, data.action, data.summary, data.time],
    });
  }

  async insertRunCases(
    cases: Array<{
      id: string;
      testRunId: string;
      sourceTestCaseId: string;
      folderSnapshot: string;
      titleSnapshot: string;
      badgeSnapshot: string;
      status: TestRunCaseStatus;
      notes: string;
      durationS: number | null;
      executedByUserId: string | null;
      executedAt: string | null;
    }>,
  ): Promise<void> {
    if (cases.length === 0) return;
    await ensureTestRunTables();
    const client = getLibsqlClient();
    for (const c of cases) {
      await client.execute({
        sql: `
          INSERT INTO test_run_cases (
            id, test_run_id, source_test_case_id, folder_snapshot, title_snapshot,
            badge_snapshot, status, notes, duration_s, executed_by_user_id, executed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        args: [
          c.id,
          c.testRunId,
          c.sourceTestCaseId,
          c.folderSnapshot,
          c.titleSnapshot,
          c.badgeSnapshot,
          c.status,
          c.notes,
          c.durationS,
          c.executedByUserId,
          c.executedAt,
        ],
      });
    }
  }

  async deleteRunCase(testRunId: string, sourceTestCaseId: string): Promise<boolean> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const res = await client.execute({
      sql: 'DELETE FROM test_run_cases WHERE test_run_id = ? AND source_test_case_id = ?;',
      args: [testRunId, sourceTestCaseId],
    });
    return res.rowsAffected > 0;
  }

  async updateRunCaseResult(params: {
    testRunId: string;
    sourceTestCaseId: string;
    status: TestRunCaseStatus;
    notes: string;
    durationS: number | null;
    executedByUserId: string;
    executedAt: string;
  }): Promise<void> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    await client.execute({
      sql: `
        UPDATE test_run_cases
        SET status = ?, notes = ?, duration_s = ?, executed_by_user_id = ?, executed_at = ?
        WHERE test_run_id = ? AND source_test_case_id = ?;
      `,
      args: [
        params.status,
        params.notes,
        params.durationS,
        params.executedByUserId,
        params.executedAt,
        params.testRunId,
        params.sourceTestCaseId,
      ],
    });
  }

  async insertEvidence(data: {
    id: string;
    testRunCaseId: string;
    evidenceType: 'file' | 'link';
    title: string;
    mimeType: string | null;
    fileName: string | null;
    imageData: Uint8Array | null;
    storagePath: string | null;
    externalUrl: string | null;
    createdAt: string;
    createdBy: string;
  }): Promise<TestRunEvidenceRecord> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    await client.execute({
      sql: `
        INSERT INTO test_run_evidence (
          id, test_run_case_id, evidence_type, title, mime_type, file_name,
          image_data, storage_path, external_url, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      args: [
        data.id,
        data.testRunCaseId,
        data.evidenceType,
        data.title,
        data.mimeType,
        data.fileName,
        data.imageData as unknown as InValue,
        data.storagePath,
        data.externalUrl,
        data.createdAt,
        data.createdBy,
      ],
    });

    return {
      id: data.id,
      testRunCaseId: data.testRunCaseId,
      evidenceType: data.evidenceType,
      title: data.title,
      mimeType: data.mimeType,
      fileName: data.fileName,
      storagePath: data.storagePath,
      externalUrl: data.externalUrl,
      previewUrl: buildEvidencePreviewUrl({
        id: data.id,
        evidenceType: data.evidenceType,
        mimeType: data.mimeType,
        imageData: data.imageData,
        externalUrl: data.externalUrl,
      }),
      createdAt: data.createdAt,
      createdBy: data.createdBy,
    };
  }

  async updateTestRunFields(
    id: string,
    fields: Partial<{
      name: string;
      appVersion: string;
      platform: string;
      environment: string;
      browserOrDevice: string | null;
      milestone: string;
      suiteType: string;
      mode: string;
      status: TestRunStatus;
      plannedStartAt: string | null;
      startedAt: string | null;
      closedAt: string | null;
      updatedAt: string;
    }>,
  ): Promise<void> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const sets: string[] = [];
    const args: InValue[] = [];

    const mapping: Record<string, string> = {
      name: 'name',
      appVersion: 'app_version',
      platform: 'platform',
      environment: 'environment',
      browserOrDevice: 'browser_or_device',
      milestone: 'milestone',
      suiteType: 'suite_type',
      mode: 'mode',
      status: 'status',
      plannedStartAt: 'planned_start_at',
      startedAt: 'started_at',
      closedAt: 'closed_at',
      updatedAt: 'updated_at',
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (key in fields) {
        sets.push(`${col} = ?`);
        args.push((fields as Record<string, InValue>)[key] ?? null);
      }
    }

    if (sets.length === 0) return;
    args.push(id);
    await client.execute({
      sql: `UPDATE test_runs SET ${sets.join(', ')} WHERE id = ?;`,
      args,
    });
  }

  async findById(id: string): Promise<TestRunRecord | null> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const runRes = await client.execute({
      sql: 'SELECT * FROM test_runs WHERE id = ? LIMIT 1;',
      args: [id],
    });
    if (runRes.rows.length === 0) return null;

    const runs = await this.hydrateRuns(runRes.rows);
    return runs[0] ?? null;
  }

  async listTestRuns(filters?: {
    projectId?: string;
    milestone?: string;
    status?: string;
    runIds?: string[];
  }): Promise<TestRunRecord[]> {
    await ensureTestRunTables();
    const client = getLibsqlClient();
    const whereClauses: string[] = [];
    const args: InValue[] = [];

    if (filters?.projectId) {
      whereClauses.push('project_id = ?');
      args.push(filters.projectId);
    }
    if (filters?.milestone) {
      whereClauses.push('LOWER(milestone) = LOWER(?)');
      args.push(filters.milestone.trim());
    }
    if (filters?.status) {
      whereClauses.push('status = ?');
      args.push(filters.status);
    }
    if (filters?.runIds && filters.runIds.length > 0) {
      const placeholders = filters.runIds.map(() => '?').join(', ');
      whereClauses.push(`id IN (${placeholders})`);
      args.push(...filters.runIds);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const runRes = await client.execute({
      sql: `SELECT * FROM test_runs ${whereSql} ORDER BY created_at DESC;`,
      args,
    });

    return this.hydrateRuns(runRes.rows);
  }

  private async hydrateRuns(rawRuns: Array<Record<string, unknown>>): Promise<TestRunRecord[]> {
    if (rawRuns.length === 0) return [];
    const client = getLibsqlClient();
    const runIds = rawRuns.map((r) => String(r.id));
    const runPlaceholders = runIds.map(() => '?').join(', ');

    const [casesRes, eventsRes] = await Promise.all([
      client.execute({
        sql: `SELECT * FROM test_run_cases WHERE test_run_id IN (${runPlaceholders});`,
        args: runIds,
      }),
      client.execute({
        sql: `SELECT * FROM test_run_events WHERE test_run_id IN (${runPlaceholders}) ORDER BY time DESC;`,
        args: runIds,
      }),
    ]);

    const caseIds = casesRes.rows.map((c) => String(c.id));
    const evidenceByCaseId = new Map<string, TestRunEvidenceRecord[]>();

    if (caseIds.length > 0) {
      const casePlaceholders = caseIds.map(() => '?').join(', ');
      const evRes = await client.execute({
        sql: `SELECT * FROM test_run_evidence WHERE test_run_case_id IN (${casePlaceholders}) ORDER BY created_at DESC;`,
        args: caseIds,
      });

      for (const ev of evRes.rows) {
        const testRunCaseId = String(ev.test_run_case_id);
        const list = evidenceByCaseId.get(testRunCaseId) ?? [];
        const evidenceType = String(ev.evidence_type) === 'link' ? 'link' : 'file';
        const mimeType = ev.mime_type !== null && ev.mime_type !== undefined ? String(ev.mime_type) : null;
        const externalUrl =
          ev.external_url !== null && ev.external_url !== undefined ? String(ev.external_url) : null;
        list.push({
          id: String(ev.id),
          testRunCaseId,
          evidenceType,
          title: String(ev.title ?? ''),
          mimeType,
          fileName: ev.file_name !== null && ev.file_name !== undefined ? String(ev.file_name) : null,
          storagePath:
            ev.storage_path !== null && ev.storage_path !== undefined ? String(ev.storage_path) : null,
          externalUrl,
          previewUrl: buildEvidencePreviewUrl({
            id: String(ev.id),
            evidenceType,
            mimeType,
            imageData: ev.image_data,
            externalUrl,
          }),
          createdAt: String(ev.created_at),
          createdBy: String(ev.created_by),
        });
        evidenceByCaseId.set(testRunCaseId, list);
      }
    }

    const casesByRunId = new Map<string, TestRunCaseRecord[]>();
    for (const c of casesRes.rows) {
      const testRunId = String(c.test_run_id);
      const caseId = String(c.id);
      const list = casesByRunId.get(testRunId) ?? [];
      list.push({
        id: caseId,
        testRunId,
        sourceTestCaseId: String(c.source_test_case_id),
        folderSnapshot: String(c.folder_snapshot),
        titleSnapshot: String(c.title_snapshot),
        badgeSnapshot: String(c.badge_snapshot),
        status: String(c.status) as TestRunCaseStatus,
        notes: String(c.notes ?? ''),
        durationS:
          c.duration_s !== null && c.duration_s !== undefined ? Number(c.duration_s) : null,
        executedByUserId:
          c.executed_by_user_id !== null && c.executed_by_user_id !== undefined
            ? String(c.executed_by_user_id)
            : null,
        executedAt:
          c.executed_at !== null && c.executed_at !== undefined ? String(c.executed_at) : null,
        evidence: evidenceByCaseId.get(caseId) ?? [],
      });
      casesByRunId.set(testRunId, list);
    }

    const eventsByRunId = new Map<string, TestRunEventRecord[]>();
    for (const ev of eventsRes.rows) {
      const testRunId = String(ev.test_run_id);
      const list = eventsByRunId.get(testRunId) ?? [];
      list.push({
        id: String(ev.id),
        testRunId,
        userId: String(ev.user_id),
        action: String(ev.action),
        summary: String(ev.summary ?? ''),
        time: String(ev.time),
      });
      eventsByRunId.set(testRunId, list);
    }

    return rawRuns.map((r) => {
      const runId = String(r.id);
      return {
        id: runId,
        projectId: String(r.project_id),
        projectName: String(r.project_name),
        name: String(r.name),
        appVersion: String(r.app_version),
        platform: String(r.platform),
        environment: String(r.environment),
        browserOrDevice:
          r.browser_or_device !== null && r.browser_or_device !== undefined
            ? String(r.browser_or_device)
            : null,
        milestone: String(r.milestone),
        suiteType: String(r.suite_type),
        mode: String(r.mode),
        status: String(r.status) as TestRunStatus,
        plannedStartAt:
          r.planned_start_at !== null && r.planned_start_at !== undefined
            ? String(r.planned_start_at)
            : null,
        startedAt:
          r.started_at !== null && r.started_at !== undefined ? String(r.started_at) : null,
        closedAt:
          r.closed_at !== null && r.closed_at !== undefined ? String(r.closed_at) : null,
        createdByUserId: String(r.created_by_user_id),
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
        cases: sortRunCases(casesByRunId.get(runId) ?? []),
        events: eventsByRunId.get(runId) ?? [],
      };
    });
  }
}

export const testRunRepository = new TestRunRepository();

