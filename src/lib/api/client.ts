import type {
  VirtualDatabase,
  DbExecution,
  DbTestSpec,
  DbTestCaseSphere,
} from '@/src/utils/sqliteEngine';

/**
 * Typed fetch client for the TMS backend API. Centralizes URL construction,
 * JSON parsing, and error handling so React components/hooks never touch
 * `fetch` or untyped responses directly.
 */

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  count: number;
  error?: string;
}

export class ApiClientError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;

  if (!response.ok) {
    const message = payload?.error ?? `Falha na requisição (${response.status}).`;
    throw new ApiClientError(message, response.status);
  }

  return (payload?.data ?? payload) as T;
}

export const apiClient = {
  getDatabase: () => request<VirtualDatabase>('/api/database'),

  replaceDatabase: (db: VirtualDatabase) =>
    request<VirtualDatabase>('/api/database', {
      method: 'PUT',
      body: JSON.stringify(db),
    }),

  resetDatabase: () => request<VirtualDatabase>('/api/database/reset', { method: 'POST' }),

  clearExecutionHistory: () =>
    request<VirtualDatabase>('/api/database/clear-executions', { method: 'POST' }),

  runSql: (query: string) =>
    request<SqlQueryResult>('/api/sql', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  listExecutions: () => request<DbExecution[]>('/api/executions'),

  deleteExecution: (id: string) =>
    request<{ id: string }>(`/api/executions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createSpec: (input: Omit<DbTestSpec, 'id' | 'created_at'> & { id?: string }) =>
    request<DbTestSpec>('/api/test-specs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateSpec: (id: string, input: Partial<Omit<DbTestSpec, 'id' | 'created_at'>>) =>
    request<DbTestSpec>(`/api/test-specs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteSpec: (id: string) =>
    request<{ id: string }>(`/api/test-specs/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createSphereCase: (input: DbTestCaseSphere) =>
    request<DbTestCaseSphere>('/api/test-cases-sphere', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateSphereCase: (
    id: string,
    input: Partial<Omit<DbTestCaseSphere, 'id' | 'created_at' | 'history'>> & {
      appendHistory?: DbTestCaseSphere['history'];
    },
  ) =>
    request<DbTestCaseSphere>(`/api/test-cases-sphere/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteSphereCase: (id: string) =>
    request<{ id: string }>(`/api/test-cases-sphere/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createFolder: (path: string) =>
    request<{ path: string }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  renameFolder: (oldPath: string, newPath: string) =>
    request<{ oldPath: string; newPath: string }>('/api/folders', {
      method: 'PATCH',
      body: JSON.stringify({ oldPath, newPath }),
    }),

  deleteFolder: (path: string) =>
    request<{ path: string }>('/api/folders', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    }),
};
