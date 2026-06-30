import type {
  VirtualDatabase,
  DbExecution,
  DbTestSpec,
  DbTestCaseSphere,
  DbFolderAcceptanceDoc,
  DbFolderAcceptanceDocHistory,
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(url, init);
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

  getAcceptanceDoc: (folderPath: string) =>
    request<DbFolderAcceptanceDoc>(
      `/api/folders/acceptance-doc?folderPath=${encodeURIComponent(folderPath)}`,
    ),

  uploadAcceptanceDoc: async (folderPath: string, file: File): Promise<DbFolderAcceptanceDoc> => {
    const formData = new FormData();
    formData.append('folderPath', folderPath);
    formData.append('file', file);

    const response = await fetch('/api/folders/acceptance-doc', {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: DbFolderAcceptanceDoc; error?: string }
      | null;

    if (!response.ok) {
      const message = payload?.error ?? `Falha na requisição (${response.status}).`;
      throw new ApiClientError(message, response.status);
    }

    return (payload?.data ?? payload) as DbFolderAcceptanceDoc;
  },

  renameAcceptanceDocFolder: (oldFolderPath: string, newFolderPath: string) =>
    request<DbFolderAcceptanceDoc | { oldFolderPath: string; newFolderPath: string }>(
      '/api/folders/acceptance-doc',
      {
        method: 'PATCH',
        body: JSON.stringify({ oldFolderPath, newFolderPath }),
      },
    ),

  deleteAcceptanceDoc: (folderPath: string) =>
    request<{ folderPath: string }>(
      `/api/folders/acceptance-doc?folderPath=${encodeURIComponent(folderPath)}`,
      { method: 'DELETE' },
    ),

  getAcceptanceDocHistory: (folderPath: string) =>
    request<DbFolderAcceptanceDocHistory[]>(
      `/api/folders/acceptance-doc/history?folderPath=${encodeURIComponent(folderPath)}`,
    ),

  updateAcceptanceDocContent: (
    folderPath: string,
    content: string,
    user?: string,
  ) =>
    request<{ doc: DbFolderAcceptanceDoc; history: DbFolderAcceptanceDocHistory }>(
      `/api/folders/acceptance-doc?folderPath=${encodeURIComponent(folderPath)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ folderPath, content, user }),
      },
    ),
};
