import { buildRunFolderName } from './robotResultsFolder';
import type { DbExecution, DbTestCase, DbStepLog } from './sqliteEngine';

export interface ParsedRunResult {
  execution: DbExecution;
  testCases: DbTestCase[];
  steps: DbStepLog[];
}

export const formatRobotRunTimestamp = (): string =>
  new Date().toISOString().slice(0, 19).replace('T', ' ');

export function createRunFolderForTimestamp(timestamp: string): string {
  return buildRunFolderName(timestamp);
}

export async function runRobotCommandStreaming(
  command: string,
  runFolder: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ aborted: boolean }> {
  const response = await fetch('/api/terminal/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, persist: true, runId: runFolder }),
    signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => response.statusText);
    onChunk(`[ERRO] ${message}`);
    return { aborted: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
    return { aborted: false };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { aborted: true };
    }
    throw err;
  }
}

export async function persistRobotRunOutput(
  runFolder: string,
  command: string,
  timestamp: string,
): Promise<{ ok: true; data: ParsedRunResult } | { ok: false; error: string }> {
  const res = await fetch('/api/terminal/output', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: runFolder, command, timestamp }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.error ?? res.statusText };
  }
  return { ok: true, data: data as ParsedRunResult };
}
