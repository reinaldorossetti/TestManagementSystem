import { z } from 'zod';

export const TEST_RUN_PLATFORMS = ['Web', 'Mobile', 'Desktop'] as const;
export type TestRunPlatform = (typeof TEST_RUN_PLATFORMS)[number];

export const TEST_RUN_ENVIRONMENTS = ['Local', 'Dev', 'Homologação', 'Produção'] as const;
export type TestRunEnvironment = (typeof TEST_RUN_ENVIRONMENTS)[number];

export const TEST_RUN_SUITE_TYPES = ['Smoke', 'Regressão', 'Feature', 'Sanidade'] as const;
export type TestRunSuiteType = (typeof TEST_RUN_SUITE_TYPES)[number];

export const TEST_RUN_MODES = ['Manual', 'Automatizado', 'Misto'] as const;
export type TestRunMode = (typeof TEST_RUN_MODES)[number];

export const TEST_RUN_STATUSES = ['Draft', 'In Progress', 'Completed', 'Aborted'] as const;
export type TestRunStatus = (typeof TEST_RUN_STATUSES)[number];

export const TEST_RUN_CASE_STATUSES = ['Open', 'Passed', 'Failed', 'Blocked', 'Skipped'] as const;
export type TestRunCaseStatus = (typeof TEST_RUN_CASE_STATUSES)[number];

export const TEST_RUN_RESULT_STATUSES = ['Passed', 'Failed', 'Blocked', 'Skipped'] as const;
export type TestRunResultStatus = (typeof TEST_RUN_RESULT_STATUSES)[number];

export const TEST_RUN_EVENT_ACTIONS = [
  'RUN_CREATED',
  'RUN_STARTED',
  'RUN_COMPLETED',
  'RUN_ABORTED',
  'RUN_REOPENED',
  'CASES_ADDED',
  'CASE_REMOVED',
  'RESULT_RECORDED',
  'VERSION_CHANGED',
  'EVIDENCE_ADDED',
] as const;
export type TestRunEventAction = (typeof TEST_RUN_EVENT_ACTIONS)[number];

export const APP_VERSION_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const APP_VERSION_ERROR_MESSAGE =
  'Versão inválida. Informe no formato SemVer (ex.: 2.5.0 ou 2.5.0+build.1842).';

export const BROWSER_SUGGESTIONS_BY_PLATFORM: Record<TestRunPlatform, readonly string[]> = {
  Web: ['Chrome', 'Firefox', 'Edge', 'Safari'],
  Mobile: ['Android Chrome', 'iOS Safari', 'Pixel 8', 'iPhone 15'],
  Desktop: ['Windows 11', 'macOS'],
};

export interface SuggestTestRunNameParams {
  milestone?: string | null;
  browserOrDevice?: string | null;
  platform?: string | null;
  suiteType?: string | null;
  featureLabel?: string | null;
}

/**
 * Builds the canonical suggested Test Run name:
 * `{milestone} - {browser ou plataforma} - {tipo de suíte [featureLabel]}`
 * Example: `Sprint 24 - Chrome - Regressão Login`
 */
export function suggestTestRunName(params: SuggestTestRunNameParams): string {
  const milestonePart = (params.milestone ?? '').trim();
  const targetPart = (params.browserOrDevice ?? '').trim() || (params.platform ?? '').trim();
  const rawSuite = (params.suiteType ?? '').trim();
  const featurePart = (params.featureLabel ?? '').trim();

  const suiteWithFeature =
    rawSuite && featurePart && !rawSuite.toLowerCase().includes(featurePart.toLowerCase())
      ? `${rawSuite} ${featurePart}`
      : rawSuite || featurePart;

  const segments = [milestonePart, targetPart, suiteWithFeature].filter((part) => part.length > 0);
  return segments.join(' - ');
}

/**
 * Returns the suggested name only while the operator has not manually edited the name field.
 */
export function resolveTestRunName(
  params: SuggestTestRunNameParams & {
    currentName: string;
    isManuallyEdited: boolean;
  },
): string {
  if (params.isManuallyEdited) {
    return params.currentName;
  }
  return suggestTestRunName(params);
}

export const appVersionSchema = z
  .string()
  .trim()
  .refine((val) => APP_VERSION_REGEX.test(val), {
    message: APP_VERSION_ERROR_MESSAGE,
  });

export const testRunPlatformSchema = z.enum(TEST_RUN_PLATFORMS, {
  message: 'Plataforma inválida. Escolha Web, Mobile ou Desktop.',
});

export const testRunEnvironmentSchema = z.enum(TEST_RUN_ENVIRONMENTS, {
  message: 'Ambiente inválido. Escolha Local, Dev, Homologação ou Produção.',
});

export const testRunSuiteTypeSchema = z.enum(TEST_RUN_SUITE_TYPES, {
  message: 'Tipo de suíte inválido. Escolha Smoke, Regressão, Feature ou Sanidade.',
});

export const testRunModeSchema = z.enum(TEST_RUN_MODES, {
  message: 'Modo inválido. Escolha Manual, Automatizado ou Misto.',
});

export const createTestRunSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'O nome do Test Run deve ter entre 3 e 160 caracteres.')
      .max(160, 'O nome do Test Run deve ter entre 3 e 160 caracteres.'),
    projectId: z.string().trim().min(1, 'O projeto é obrigatório.'),
    appVersion: appVersionSchema,
    platform: testRunPlatformSchema,
    environment: testRunEnvironmentSchema,
    browserOrDevice: z
      .string()
      .trim()
      .max(60, 'Browser ou dispositivo deve ter até 60 caracteres.')
      .optional()
      .nullable(),
    milestone: z
      .string()
      .trim()
      .min(2, 'Milestone deve ter entre 2 e 80 caracteres.')
      .max(80, 'Milestone deve ter entre 2 e 80 caracteres.'),
    suiteType: testRunSuiteTypeSchema,
    mode: testRunModeSchema,
    plannedStartAt: z.string().trim().optional().nullable(),
    sourceTestCaseIds: z.array(z.string().trim().min(1)).optional(),
    folderPath: z.string().trim().optional(),
    folderPaths: z.array(z.string().trim().min(1)).optional(),
    executionId: z.undefined({ message: 'O módulo Test Runs não aceita executionId.' }),
  })
  .superRefine((data, ctx) => {
    const browserVal = (data.browserOrDevice ?? '').trim();
    if ((data.platform === 'Web' || data.platform === 'Mobile') && browserVal.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['browserOrDevice'],
        message: 'Browser ou dispositivo é obrigatório para plataformas Web e Mobile.',
      });
    }
  });

export type CreateTestRunInput = z.infer<typeof createTestRunSchema>;

export const updateTestRunSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'O nome do Test Run deve ter entre 3 e 160 caracteres.')
      .max(160, 'O nome do Test Run deve ter entre 3 e 160 caracteres.')
      .optional(),
    appVersion: appVersionSchema.optional(),
    platform: testRunPlatformSchema.optional(),
    environment: testRunEnvironmentSchema.optional(),
    browserOrDevice: z
      .string()
      .trim()
      .max(60, 'Browser ou dispositivo deve ter até 60 caracteres.')
      .optional()
      .nullable(),
    milestone: z
      .string()
      .trim()
      .min(2, 'Milestone deve ter entre 2 e 80 caracteres.')
      .max(80, 'Milestone deve ter entre 2 e 80 caracteres.')
      .optional(),
    suiteType: testRunSuiteTypeSchema.optional(),
    mode: testRunModeSchema.optional(),
    plannedStartAt: z.string().trim().optional().nullable(),
    executionId: z.undefined({ message: 'O módulo Test Runs não aceita executionId.' }),
  })
  .superRefine((data, ctx) => {
    if (
      (data.platform === 'Web' || data.platform === 'Mobile') &&
      data.browserOrDevice !== undefined &&
      (data.browserOrDevice ?? '').trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['browserOrDevice'],
        message: 'Browser ou dispositivo é obrigatório para plataformas Web e Mobile.',
      });
    }
  });

export type UpdateTestRunInput = z.infer<typeof updateTestRunSchema>;

export const includeTestRunCasesSchema = z
  .object({
    sourceTestCaseIds: z.array(z.string().trim().min(1)).optional(),
    folderPath: z.string().trim().min(1).optional(),
    folderPaths: z.array(z.string().trim().min(1)).optional(),
    executionId: z.undefined({ message: 'O módulo Test Runs não aceita executionId.' }),
  })
  .refine(
    (data) =>
      (data.sourceTestCaseIds && data.sourceTestCaseIds.length > 0) ||
      Boolean(data.folderPath && data.folderPath.trim().length > 0) ||
      (data.folderPaths && data.folderPaths.length > 0),
    {
      message: 'Informe sourceTestCaseIds, folderPath ou folderPaths para incluir casos.',
      path: ['sourceTestCaseIds'],
    },
  );

export type IncludeTestRunCasesInput = z.infer<typeof includeTestRunCasesSchema>;

export const testRunResultSchema = z
  .object({
    status: z.enum(TEST_RUN_RESULT_STATUSES, {
      message: 'Status inválido. Use Passed, Failed, Blocked ou Skipped.',
    }),
    notes: z
      .string()
      .max(4000, 'As notas não podem exceder 4000 caracteres.')
      .optional()
      .default(''),
    durationS: z
      .number()
      .min(0, 'A duração deve estar entre 0 e 86400 segundos.')
      .max(86400, 'A duração deve estar entre 0 e 86400 segundos.')
      .optional()
      .nullable(),
    executionId: z.undefined({ message: 'O módulo Test Runs não aceita executionId.' }),
  })
  .superRefine((data, ctx) => {
    const trimmedNotes = (data.notes ?? '').trim();
    if ((data.status === 'Failed' || data.status === 'Blocked') && trimmedNotes.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message: 'Nota explicativa com pelo menos 10 caracteres é obrigatória para Failed e Blocked.',
      });
    }
  });

export type TestRunResultInput = z.infer<typeof testRunResultSchema>;

export const testRunEvidenceLinkSchema = z
  .object({
    url: z
      .string()
      .trim()
      .url('Informe uma URL válida (http:// ou https://).')
      .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
        message: 'Apenas links http/https são permitidos.',
      }),
    title: z.string().trim().max(200).optional().default(''),
    executionId: z.undefined({ message: 'O módulo Test Runs não aceita executionId.' }),
  });

export type TestRunEvidenceLinkInput = z.infer<typeof testRunEvidenceLinkSchema>;

export const scorecardQuerySchema = z
  .object({
    milestone: z.string().trim().optional(),
    runIds: z.array(z.string().trim().min(1)).optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    includeAborted: z.boolean().optional().default(false),
  })
  .refine(
    (q) =>
      Boolean(q.milestone && q.milestone.length > 0) ||
      Boolean(q.runIds && q.runIds.length > 0) ||
      Boolean(q.from && q.from.length > 0) ||
      Boolean(q.to && q.to.length > 0),
    {
      message: 'Informe ao menos um filtro para o scorecard: milestone, runIds ou período (from/to).',
      path: ['milestone'],
    },
  );

export type ScorecardQueryInput = z.infer<typeof scorecardQuerySchema>;

