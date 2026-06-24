'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { INITIAL_DB_SEED, type VirtualDatabase } from '@/src/utils/sqliteEngine';
import { apiClient, type SqlQueryResult } from '@/src/lib/api/client';

const SYNC_CHANNEL = 'tms_db_sync';
const PERSIST_DEBOUNCE_MS = 400;

export interface UseDatabaseResult {
  sqliteDb: VirtualDatabase;
  setSqliteDb: Dispatch<SetStateAction<VirtualDatabase>>;
  ready: boolean;
  reset: () => Promise<VirtualDatabase>;
  runSql: (query: string) => Promise<SqlQueryResult>;
}

/**
 * Owns the relational database state for the app, replacing the legacy
 * localStorage blob. It loads a snapshot from the backend, persists local
 * changes (debounced) through the API, and keeps every open tab in sync via the
 * HTML5 BroadcastChannel — preserving the previous real-time multi-tab UX
 * without using localStorage as the source of truth.
 */
export function useDatabase(): UseDatabaseResult {
  const [sqliteDb, setSqliteDbState] = useState<VirtualDatabase>(INITIAL_DB_SEED);
  const [ready, setReady] = useState(false);

  // When true, the next persist effect run is a remote/load echo and must not
  // be written back to the server (prevents save loops).
  const skipPersistRef = useRef(true);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .getDatabase()
      .then((db) => {
        if (!active) return;
        skipPersistRef.current = true;
        setSqliteDbState(db);
      })
      .catch((error) => console.error('Falha ao carregar o banco de dados:', error))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data !== 'changed') return;
      apiClient
        .getDatabase()
        .then((db) => {
          skipPersistRef.current = true;
          setSqliteDbState(db);
        })
        .catch((error) => console.error('Falha ao sincronizar banco entre abas:', error));
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      apiClient
        .replaceDatabase(sqliteDb)
        .then(() => channelRef.current?.postMessage('changed'))
        .catch((error) => console.error('Falha ao persistir banco de dados:', error));
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [sqliteDb, ready]);

  const reset = useCallback(async (): Promise<VirtualDatabase> => {
    const db = await apiClient.resetDatabase();
    skipPersistRef.current = true;
    setSqliteDbState(db);
    channelRef.current?.postMessage('changed');
    return db;
  }, []);

  const runSql = useCallback(
    (query: string): Promise<SqlQueryResult> => apiClient.runSql(query),
    [],
  );

  return { sqliteDb, setSqliteDb: setSqliteDbState, ready, reset, runSql };
}
