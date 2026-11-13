import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { ApiError } from '@/src/server/http/responses';
import { authService } from '@/src/server/services/authService';
import {
  testRunRepository,
  type CatalogCaseSummary,
  type CatalogProjectSummary,
  type TestRunEvidenceRecord,
  type TestRunRecord,
  type TestRunRepository,
} from '@/src/server/repositories/testRunRepository';
import {
  aggregateScorecard,
  planTestRunCaseInclusion,
  startTestRunState,
  type AggregatedScorecard,
} from '@/src/server/services/testRunScorecard';
import type {
  CreateTestRunInput,
  IncludeTestRunCasesInput,
  ScorecardQueryInput,
  TestRunResultInput,
  UpdateTestRunInput,
} from '@/src/server/validation/testRunSchemas';

export interface AuthenticatedTestRunUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'tester' | 'viewer' | string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

/**
 * Resolves the authenticated session user from `tms_session` cookie.
 * Throws 401 `ApiError` if unauthenticated.
 */
export async function requireTestRunSessionUser(
  request: NextRequest,
): Promise<AuthenticatedTestRunUser> {
  const rawToken = request.cookies.get('tms_session')?.value;
  if (!rawToken) {
    throw new ApiError('Não autenticado. Faça login para acessar Test Runs.', 401);
  }
  const user = await authService.getSessionUser(rawToken);
  if (!user) {
    throw new ApiError('Sessão inválida ou expirada.', 401);
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export class TestRunService {
  constructor(private readonly repo: TestRunRepository = testRunRepository) {}

  private assertWriteAccess(user: AuthenticatedTestRunUser): void {
    if (user.role === 'viewer') {
      throw new ApiError(
        'Usuário de consulta não possui permissão para criar, alterar ou executar Test Runs.',
        403,
      );
    }
  }

  async getCatalogSnapshot(): Promise<{
    projects: CatalogProjectSummary[];
    foldersByProject: Record<string, string[]>;
    cases: CatalogCaseSummary[];
  }> {
    const [projects, cases] = await Promise.all([
      this.repo.listCatalogProjects(),
      this.repo.listAllCatalogCases(),
    ]);
    const foldersByProject: Record<string, string[]> = {};
    for (const project of projects) {
      foldersByProject[project.id] = await this.repo.listCatalogFoldersForProject(project.id);
    }
    return { projects, foldersByProject, cases };
  }

  async listRuns(filters?: {
    projectId?: string;
    milestone?: string;
    status?: string;
  }): Promise<TestRunRecord[]> {
    return this.repo.listTestRuns(filters);
  }

  async getRunById(id: string): Promise<TestRunRecord> {
    const run = await this.repo.findById(id);
    if (!run) {
      throw new ApiError('Test Run não encontrado.', 404);
    }
    return run;
  }

  async createRun(
    input: CreateTestRunInput,
    user: AuthenticatedTestRunUser,
  ): Promise<TestRunRecord> {
    this.assertWriteAccess(user);
    const project = await this.repo.findCatalogProjectById(input.projectId);
    if (!project) {
      throw new ApiError('Projeto informado não existe no catálogo.', 400, {
        field: 'projectId',
      });
    }

    const now = new Date().toISOString();
    const id = `TRUN-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const browserOrDevice = (input.browserOrDevice ?? '').trim() || null;

    await this.repo.createTestRun({
      id,
      projectId: project.id,
      projectName: project.name,
      name: input.name.trim(),
      appVersion: input.appVersion.trim(),
      platform: input.platform,
      environment: input.environment,
      browserOrDevice,
      milestone: input.milestone.trim(),
      suiteType: input.suiteType,
      mode: input.mode,
      status: 'Draft',
      plannedStartAt: (input.plannedStartAt ?? '').trim() || null,
      startedAt: null,
      closedAt: null,
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: id,
      userId: user.id,
      action: 'RUN_CREATED',
      summary: `Test Run "${input.name.trim()}" criado em Draft (${input.platform} / ${input.environment} / v${input.appVersion.trim()}).`,
      time: now,
    });

    const hasInitialCases =
      (input.sourceTestCaseIds && input.sourceTestCaseIds.length > 0) ||
      Boolean(input.folderPath && input.folderPath.trim().length > 0) ||
      (input.folderPaths && input.folderPaths.length > 0);

    if (hasInitialCases) {
      await this.includeCases(
        id,
        {
          sourceTestCaseIds: input.sourceTestCaseIds,
          folderPath: input.folderPath,
          folderPaths: input.folderPaths,
        },
        user,
      );
    }

    return this.getRunById(id);
  }

  async updateRun(
    id: string,
    input: UpdateTestRunInput,
    user: AuthenticatedTestRunUser,
  ): Promise<TestRunRecord> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(id);

    if (run.status === 'Completed' || run.status === 'Aborted') {
      throw new ApiError(
        `Test Run com status "${run.status}" não permite alteração de configuração até ser reaberto.`,
        400,
      );
    }

    const nextPlatform = input.platform ?? run.platform;
    const nextBrowser =
      input.browserOrDevice !== undefined
        ? (input.browserOrDevice ?? '').trim() || null
        : run.browserOrDevice;

    if ((nextPlatform === 'Web' || nextPlatform === 'Mobile') && !nextBrowser) {
      throw new ApiError(
        'Browser ou dispositivo é obrigatório para plataformas Web e Mobile.',
        400,
        { field: 'browserOrDevice' },
      );
    }

    const now = new Date().toISOString();
    const versionChanged =
      input.appVersion !== undefined && input.appVersion.trim() !== run.appVersion;

    if (versionChanged) {
      const hasNonOpenCase = run.cases.some((c) => c.status !== 'Open');
      if (hasNonOpenCase && user.role !== 'admin') {
        throw new ApiError(
          'Apenas administradores podem alterar a versão da aplicação quando já existem resultados registrados no ciclo.',
          403,
        );
      }
    }

    await this.repo.updateTestRunFields(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.appVersion !== undefined ? { appVersion: input.appVersion.trim() } : {}),
      ...(input.platform !== undefined ? { platform: input.platform } : {}),
      ...(input.environment !== undefined ? { environment: input.environment } : {}),
      ...(input.browserOrDevice !== undefined ? { browserOrDevice: nextBrowser } : {}),
      ...(input.milestone !== undefined ? { milestone: input.milestone.trim() } : {}),
      ...(input.suiteType !== undefined ? { suiteType: input.suiteType } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.plannedStartAt !== undefined
        ? { plannedStartAt: (input.plannedStartAt ?? '').trim() || null }
        : {}),
      updatedAt: now,
    });

    if (versionChanged && input.appVersion) {
      await this.repo.addEvent({
        id: randomUUID(),
        testRunId: id,
        userId: user.id,
        action: 'VERSION_CHANGED',
        summary: `Versão alterada de ${run.appVersion} para ${input.appVersion.trim()}.`,
        time: now,
      });
    }

    return this.getRunById(id);
  }

  async includeCases(
    runId: string,
    input: IncludeTestRunCasesInput,
    user: AuthenticatedTestRunUser,
  ): Promise<{
    run: TestRunRecord;
    addedCount: number;
    skippedDuplicates: string[];
  }> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(runId);
    if (run.status === 'Completed' || run.status === 'Aborted') {
      throw new ApiError(
        `Não é permitido adicionar casos a um Test Run com status "${run.status}".`,
        400,
      );
    }

    const [allowedFolders, allCatalogCases] = await Promise.all([
      this.repo.listCatalogFoldersForProject(run.projectId),
      this.repo.listAllCatalogCases(),
    ]);

    const allowedFolderSet = new Set(allowedFolders);
    const isFolderAllowed = (folder: string): boolean =>
      allowedFolderSet.has(folder) ||
      allowedFolders.some((allowed) => folder.startsWith(`${allowed}/`));

    const requestedFolders: string[] = [];
    if (input.folderPath?.trim()) {
      requestedFolders.push(input.folderPath.trim());
    }
    if (input.folderPaths) {
      for (const fp of input.folderPaths) {
        if (fp.trim() && !requestedFolders.includes(fp.trim())) {
          requestedFolders.push(fp.trim());
        }
      }
    }

    for (const folder of requestedFolders) {
      if (!isFolderAllowed(folder)) {
        throw new ApiError(
          `A pasta "${folder}" não pertence ao projeto "${run.projectName}".`,
          400,
          { field: 'folderPath' },
        );
      }
    }

    const candidateCases: CatalogCaseSummary[] = [];

    if (requestedFolders.length > 0) {
      const folderMatches = allCatalogCases.filter((c) =>
        requestedFolders.some((f) => c.folder === f || c.folder.startsWith(`${f}/`)),
      );
      candidateCases.push(...folderMatches);
    }

    if (input.sourceTestCaseIds && input.sourceTestCaseIds.length > 0) {
      const catalogById = new Map(allCatalogCases.map((c) => [c.id, c]));
      for (const requestedId of input.sourceTestCaseIds) {
        const found = catalogById.get(requestedId);
        if (!found) {
          throw new ApiError(
            `Caso de teste "${requestedId}" não encontrado no catálogo.`,
            400,
            { field: 'sourceTestCaseIds' },
          );
        }
        candidateCases.push(found);
      }
    }

    if (candidateCases.length === 0) {
      throw new ApiError(
        'Nenhum caso de teste encontrado para os critérios informados.',
        400,
      );
    }

    let plan: ReturnType<typeof planTestRunCaseInclusion>;
    try {
      plan = planTestRunCaseInclusion({
        existingSourceIds: run.cases.map((c) => c.sourceTestCaseId),
        candidateCases,
        allowedFoldersForProject: allowedFolders,
      });
    } catch (err) {
      throw new ApiError(
        err instanceof Error ? err.message : 'Caso inválido para o projeto do run.',
        400,
        { field: 'sourceTestCaseIds' },
      );
    }

    const now = new Date().toISOString();
    if (plan.toInsert.length > 0) {
      await this.repo.insertRunCases(
        plan.toInsert.map((item) => ({
          id: randomUUID(),
          testRunId: run.id,
          ...item,
        })),
      );
      await this.repo.updateTestRunFields(run.id, { updatedAt: now });
      await this.repo.addEvent({
        id: randomUUID(),
        testRunId: run.id,
        userId: user.id,
        action: 'CASES_ADDED',
        summary: `${plan.toInsert.length} caso(s) copiado(s) para o ciclo.`,
        time: now,
      });
    }

    const updatedRun = await this.getRunById(run.id);
    return {
      run: updatedRun,
      addedCount: plan.toInsert.length,
      skippedDuplicates: plan.skippedDuplicates,
    };
  }

  async removeCase(
    runId: string,
    sourceTestCaseId: string,
    user: AuthenticatedTestRunUser,
  ): Promise<TestRunRecord> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(runId);
    if (run.status !== 'Draft' && run.status !== 'In Progress') {
      throw new ApiError(
        'Casos só podem ser removidos enquanto o Test Run está em Draft ou In Progress.',
        400,
      );
    }

    const targetCase = run.cases.find((c) => c.sourceTestCaseId === sourceTestCaseId);
    if (!targetCase) {
      throw new ApiError('Caso não encontrado neste Test Run.', 404);
    }
    if (targetCase.status !== 'Open') {
      throw new ApiError(
        'Apenas casos ainda Não Iniciados (Open) podem ser removidos do Test Run.',
        400,
      );
    }

    const now = new Date().toISOString();
    await this.repo.deleteRunCase(runId, sourceTestCaseId);
    await this.repo.updateTestRunFields(runId, { updatedAt: now });
    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'CASE_REMOVED',
      summary: `Caso ${targetCase.badgeSnapshot} removido do escopo.`,
      time: now,
    });

    return this.getRunById(runId);
  }

  async startRun(runId: string, user: AuthenticatedTestRunUser): Promise<TestRunRecord> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(runId);
    const now = new Date().toISOString();

    let nextState;
    try {
      nextState = startTestRunState(
        {
          status: run.status,
          startedAt: run.startedAt,
          closedAt: run.closedAt,
          cases: run.cases,
        },
        now,
      );
    } catch (err) {
      throw new ApiError(
        err instanceof Error ? err.message : 'Não foi possível iniciar o Test Run.',
        400,
      );
    }

    await this.repo.updateTestRunFields(runId, {
      status: nextState.status,
      startedAt: nextState.startedAt,
      updatedAt: now,
    });
    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'RUN_STARTED',
      summary: 'Ciclo de execução iniciado (In Progress).',
      time: now,
    });

    return this.getRunById(runId);
  }

  async recordCaseResult(
    runId: string,
    sourceTestCaseId: string,
    input: TestRunResultInput,
    user: AuthenticatedTestRunUser,
  ): Promise<TestRunRecord> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(runId);

    if (run.status === 'Completed' || run.status === 'Aborted') {
      throw new ApiError(
        `Test Run com status "${run.status}" não aceita novos resultados até reabertura por um administrador.`,
        400,
      );
    }

    const targetCase = run.cases.find((c) => c.sourceTestCaseId === sourceTestCaseId);
    if (!targetCase) {
      throw new ApiError('Caso de teste não pertence a este Test Run.', 404);
    }

    const now = new Date().toISOString();

    if (run.status === 'Draft') {
      await this.repo.updateTestRunFields(runId, {
        status: 'In Progress',
        startedAt: run.startedAt ?? now,
        updatedAt: now,
      });
      await this.repo.addEvent({
        id: randomUUID(),
        testRunId: runId,
        userId: user.id,
        action: 'RUN_STARTED',
        summary: 'Test Run promovido automaticamente para In Progress no primeiro resultado.',
        time: now,
      });
    } else {
      await this.repo.updateTestRunFields(runId, { updatedAt: now });
    }

    await this.repo.updateRunCaseResult({
      testRunId: runId,
      sourceTestCaseId,
      status: input.status,
      notes: (input.notes ?? '').trim(),
      durationS: input.durationS ?? null,
      executedByUserId: user.id,
      executedAt: now,
    });

    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'RESULT_RECORDED',
      summary: `Resultado ${input.status} registrado para ${targetCase.badgeSnapshot}.`,
      time: now,
    });

    return this.getRunById(runId);
  }

  async addLinkEvidence(
    runId: string,
    sourceTestCaseId: string,
    params: { url: string; title?: string },
    user: AuthenticatedTestRunUser,
  ): Promise<{ evidence: TestRunEvidenceRecord; run: TestRunRecord }> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(runId);
    if (run.status === 'Completed' || run.status === 'Aborted') {
      throw new ApiError(
        `Test Run com status "${run.status}" não aceita novas evidências.`,
        400,
      );
    }

    const targetCase = run.cases.find((c) => c.sourceTestCaseId === sourceTestCaseId);
    if (!targetCase) {
      throw new ApiError('Caso de teste não encontrado neste Test Run.', 404);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(params.url.trim());
    } catch {
      throw new ApiError('URL de evidência inválida.', 400, { field: 'url' });
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new ApiError('Apenas URLs http ou https são aceitas.', 400, { field: 'url' });
    }

    const now = new Date().toISOString();
    const evidence = await this.repo.insertEvidence({
      id: randomUUID(),
      testRunCaseId: targetCase.id,
      evidenceType: 'link',
      title: (params.title ?? '').trim() || parsedUrl.hostname,
      mimeType: null,
      fileName: null,
      imageData: null,
      storagePath: null,
      externalUrl: parsedUrl.toString(),
      createdAt: now,
      createdBy: user.id,
    });

    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'EVIDENCE_ADDED',
      summary: `Link de evidência anexado ao caso ${targetCase.badgeSnapshot}.`,
      time: now,
    });

    const updatedRun = await this.getRunById(runId);
    return { evidence, run: updatedRun };
  }

  async addFileEvidence(
    runId: string,
    sourceTestCaseId: string,
    params: {
      fileName: string;
      mimeType: string;
      buffer: Buffer;
      title?: string;
    },
    user: AuthenticatedTestRunUser,
  ): Promise<{ evidence: TestRunEvidenceRecord; run: TestRunRecord }> {
    this.assertWriteAccess(user);
    const run = await this.getRunById(runId);
    if (run.status === 'Completed' || run.status === 'Aborted') {
      throw new ApiError(
        `Test Run com status "${run.status}" não aceita novas evidências.`,
        400,
      );
    }

    const targetCase = run.cases.find((c) => c.sourceTestCaseId === sourceTestCaseId);
    if (!targetCase) {
      throw new ApiError('Caso de teste não encontrado neste Test Run.', 404);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const safeTitle = (params.title ?? '').trim() || params.fileName;
    const isImage =
      IMAGE_MIME_TYPES.has(params.mimeType) || /\.(png|jpe?g|webp|gif)$/i.test(params.fileName);
    const isVideo =
      VIDEO_MIME_TYPES.has(params.mimeType) || /\.(mp4|webm|mov)$/i.test(params.fileName);

    if (isImage) {
      if (params.buffer.byteLength > MAX_IMAGE_BYTES) {
        throw new ApiError('Imagem excede o limite de 5 MB.', 400);
      }
      const evidence = await this.repo.insertEvidence({
        id,
        testRunCaseId: targetCase.id,
        evidenceType: 'file',
        title: safeTitle,
        mimeType: params.mimeType || 'image/png',
        fileName: params.fileName,
        imageData: new Uint8Array(params.buffer),
        storagePath: null,
        externalUrl: null,
        createdAt: now,
        createdBy: user.id,
      });

      await this.repo.addEvent({
        id: randomUUID(),
        testRunId: runId,
        userId: user.id,
        action: 'EVIDENCE_ADDED',
        summary: `Imagem "${params.fileName}" anexada ao caso ${targetCase.badgeSnapshot}.`,
        time: now,
      });

      const updatedRun = await this.getRunById(runId);
      return { evidence, run: updatedRun };
    }

    if (isVideo) {
      if (params.buffer.byteLength > MAX_VIDEO_BYTES) {
        throw new ApiError('Vídeo excede o limite de 50 MB.', 400);
      }
      const ext = path.extname(params.fileName) || '.mp4';
      const relDir = path.join('results', 'test-runs', runId);
      const absDir = path.join(process.cwd(), relDir);
      await mkdir(absDir, { recursive: true });
      const relPath = path.posix.join('results', 'test-runs', runId, `${id}${ext}`);
      await writeFile(path.join(process.cwd(), relPath), params.buffer);

      const evidence = await this.repo.insertEvidence({
        id,
        testRunCaseId: targetCase.id,
        evidenceType: 'file',
        title: safeTitle,
        mimeType: params.mimeType || 'video/mp4',
        fileName: params.fileName,
        imageData: null,
        storagePath: relPath,
        externalUrl: null,
        createdAt: now,
        createdBy: user.id,
      });

      await this.repo.addEvent({
        id: randomUUID(),
        testRunId: runId,
        userId: user.id,
        action: 'EVIDENCE_ADDED',
        summary: `Arquivo "${params.fileName}" anexado ao caso ${targetCase.badgeSnapshot}.`,
        time: now,
      });

      const updatedRun = await this.getRunById(runId);
      return { evidence, run: updatedRun };
    }

    throw new ApiError(
      'Formato de arquivo não suportado. Envie imagem (PNG, JPG, WebP, GIF) ou vídeo (MP4, WebM).',
      400,
    );
  }

  async completeRun(runId: string, user: AuthenticatedTestRunUser): Promise<TestRunRecord> {
    if (user.role !== 'analyst' && user.role !== 'admin') {
      throw new ApiError('Apenas usuários analyst ou admin podem encerrar um Test Run.', 403);
    }

    const run = await this.getRunById(runId);
    if (run.status !== 'In Progress') {
      throw new ApiError('Apenas ciclos em In Progress podem ser encerrados (Completed).', 400);
    }

    const now = new Date().toISOString();
    await this.repo.updateTestRunFields(runId, {
      status: 'Completed',
      closedAt: now,
      updatedAt: now,
    });
    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'RUN_COMPLETED',
      summary: 'Ciclo de execução encerrado (Completed).',
      time: now,
    });

    return this.getRunById(runId);
  }

  async abortRun(runId: string, user: AuthenticatedTestRunUser): Promise<TestRunRecord> {
    if (user.role !== 'analyst' && user.role !== 'admin') {
      throw new ApiError('Apenas usuários analyst ou admin podem abortar um Test Run.', 403);
    }

    const run = await this.getRunById(runId);
    if (run.status !== 'Draft' && run.status !== 'In Progress') {
      throw new ApiError('Apenas ciclos em Draft ou In Progress podem ser abortados.', 400);
    }

    const now = new Date().toISOString();
    await this.repo.updateTestRunFields(runId, {
      status: 'Aborted',
      closedAt: now,
      updatedAt: now,
    });
    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'RUN_ABORTED',
      summary: 'Ciclo de execução descartado (Aborted).',
      time: now,
    });

    return this.getRunById(runId);
  }

  async reopenRun(runId: string, user: AuthenticatedTestRunUser): Promise<TestRunRecord> {
    if (user.role !== 'admin') {
      throw new ApiError('Apenas administradores podem reabrir um Test Run encerrado ou abortado.', 403);
    }

    const run = await this.getRunById(runId);
    if (run.status !== 'Completed' && run.status !== 'Aborted') {
      throw new ApiError('Apenas ciclos Completed ou Aborted podem ser reabertos.', 400);
    }

    const now = new Date().toISOString();
    await this.repo.updateTestRunFields(runId, {
      status: 'In Progress',
      closedAt: null,
      updatedAt: now,
    });
    await this.repo.addEvent({
      id: randomUUID(),
      testRunId: runId,
      userId: user.id,
      action: 'RUN_REOPENED',
      summary: 'Ciclo de execução reaberto por administrador (In Progress).',
      time: now,
    });

    return this.getRunById(runId);
  }

  async getScorecardData(query: ScorecardQueryInput): Promise<{
    scorecard: AggregatedScorecard;
    matchingRuns: TestRunRecord[];
  }> {
    const rawRuns = await this.repo.listTestRuns({
      milestone: query.milestone || undefined,
      runIds: query.runIds && query.runIds.length > 0 ? query.runIds : undefined,
    });

    const fromTime = query.from ? new Date(query.from).getTime() : null;
    const toTime = query.to ? new Date(`${query.to}T23:59:59.999Z`).getTime() : null;

    const periodFiltered = rawRuns.filter((run) => {
      if (!query.includeAborted && run.status === 'Aborted') {
        return false;
      }
      if (fromTime !== null || toTime !== null) {
        const refDateStr = run.startedAt || run.closedAt || run.createdAt;
        const refTime = new Date(refDateStr).getTime();
        if (Number.isNaN(refTime)) return false;
        if (fromTime !== null && !Number.isNaN(fromTime) && refTime < fromTime) return false;
        if (toTime !== null && !Number.isNaN(toTime) && refTime > toTime) return false;
      }
      return true;
    });

    const scorecard = aggregateScorecard(periodFiltered, {
      includeAborted: query.includeAborted,
    });

    return {
      scorecard,
      matchingRuns: periodFiltered,
    };
  }
}

export const testRunService = new TestRunService();

