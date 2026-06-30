import { z } from 'zod';

/**
 * Zod schemas validating all data crossing the API boundary, guaranteeing the
 * service/repository layers never receive untyped/`any` input.
 */

const executionStatus = z.enum(['PASS', 'FAIL']);
const testStatus = z.enum(['PASS', 'FAIL', 'SKIP']);
const stepType = z.enum(['GIVEN', 'WHEN', 'THEN', 'AND']);

export const stepInputSchema = z.object({
  id: z.string().min(1),
  test_case_id: z.string().min(1),
  step_type: stepType,
  text: z.string(),
  status: testStatus,
  screenshot_path: z.string().optional(),
});

export const testCaseInputSchema = z.object({
  id: z.string().min(1),
  execution_id: z.string().min(1),
  name: z.string(),
  category: z.string(),
  status: testStatus,
  duration_s: z.number(),
  robot_test_id: z.string().optional(),
  report_screenshot_path: z.string().optional(),
});

export const executionInputSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  command: z.string(),
  duration_s: z.number(),
  total_tests: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
  skipped: z.number().int().optional().default(0),
  status: executionStatus,
  results_path: z.string(),
  results_folder: z.string().optional(),
  report_screenshot_path: z.string().optional(),
});

/** Payload persisted after a completed Robot run is parsed and saved. */
export const persistRunSchema = z.object({
  execution: executionInputSchema,
  testCases: z.array(testCaseInputSchema),
  steps: z.array(stepInputSchema),
});

export const testSpecCreateSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  category: z.string(),
  tags: z.string(),
  content: z.string(),
});

export const testSpecUpdateSchema = testSpecCreateSchema.partial().extend({
  name: z.string().min(1).optional(),
});

const historyEntrySchema = z.object({
  user: z.string(),
  action: z.string(),
  time: z.string(),
});

export const sphereCreateSchema = z.object({
  id: z.string().min(1),
  folder: z.string().min(1),
  title: z.string().min(1),
  preconditions: z.string().optional().default(''),
  steps: z.string().optional().default(''),
  expected_result: z.string().optional().default(''),
  observation: z.string().optional(),
  history: z.array(historyEntrySchema).optional(),
});

export const sphereUpdateSchema = z.object({
  folder: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  preconditions: z.string().optional(),
  steps: z.string().optional(),
  expected_result: z.string().optional(),
  observation: z.string().nullable().optional(),
  appendHistory: z.array(historyEntrySchema).optional(),
});

export const folderCreateSchema = z.object({
  path: z.string().min(1),
});

export const folderRenameSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
});

const folderAcceptanceDocSchema = z.object({
  folder_path: z.string().min(1),
  doc_title: z.string().min(1),
  doc_web_path: z.string().min(1),
  repo_relative_path: z.string().min(1),
  updated_at: z.string().min(1),
});

export const folderAcceptanceDocInputSchema = folderAcceptanceDocSchema;

export const folderAcceptanceRenameSchema = z.object({
  oldFolderPath: z.string().min(1),
  newFolderPath: z.string().min(1),
});

export const folderAcceptanceDocUpdateSchema = z.object({
  folderPath: z.string().min(1),
  content: z.string().min(1),
  user: z.string().min(1).optional(),
});

export const folderDeleteSchema = z.object({
  path: z.string().min(1),
});

export const testCaseEvidenceLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});

const sphereExecutionStatus = z.enum(['PASS', 'FAIL', 'BLOCKED', 'SKIP']);

export const manualExecutionCreateSchema = z.object({
  status: sphereExecutionStatus,
  notes: z.string().max(4000).optional(),
  executedBy: z.string().min(1).max(120).optional(),
  durationS: z.number().min(0).max(86400).optional(),
});

export const sqlQuerySchema = z.object({
  query: z.string().min(1),
});

const testSpecFullSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  category: z.string(),
  tags: z.string(),
  content: z.string(),
  created_at: z.string(),
});

const sphereFullSchema = z.object({
  id: z.string().min(1),
  folder: z.string(),
  title: z.string(),
  preconditions: z.string(),
  steps: z.string(),
  expected_result: z.string(),
  observation: z.string().optional(),
  created_at: z.string(),
  last_execution_status: sphereExecutionStatus.optional(),
  last_execution_mode: z.enum(['manual', 'automated']).optional(),
  last_executed_at: z.string().optional(),
  history: z.array(historyEntrySchema).optional(),
});

/**
 * Full relational snapshot. Used by the transitional `PUT /api/database`
 * persistence path that mirrors the legacy localStorage blob save.
 */
export const virtualDatabaseSchema = z.object({
  executions: z.array(executionInputSchema),
  test_cases: z.array(testCaseInputSchema),
  steps: z.array(stepInputSchema),
  test_specs: z.array(testSpecFullSchema).optional(),
  test_cases_sphere: z.array(sphereFullSchema).optional(),
  test_folders: z.array(z.string()).optional(),
  folder_acceptance_docs: z.array(folderAcceptanceDocSchema).optional(),
});

export type VirtualDatabaseInput = z.infer<typeof virtualDatabaseSchema>;

export type PersistRunInput = z.infer<typeof persistRunSchema>;
export type TestSpecCreateInput = z.infer<typeof testSpecCreateSchema>;
export type TestSpecUpdateInput = z.infer<typeof testSpecUpdateSchema>;
export type SphereCreateInput = z.infer<typeof sphereCreateSchema>;
export type SphereUpdateInput = z.infer<typeof sphereUpdateSchema>;
export type FolderCreateInput = z.infer<typeof folderCreateSchema>;
export type FolderRenameInput = z.infer<typeof folderRenameSchema>;
export type ManualExecutionCreateInput = z.infer<typeof manualExecutionCreateSchema>;
