/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Table, DatabaseZap, Search, Play, RefreshCw } from 'lucide-react';
import { VirtualDatabase, executeVirtualSQL } from '../../utils/sqliteEngine';

interface SqlExplorerViewProps {
  sqliteDb: VirtualDatabase;
  sqliteSubTab: 'browse' | 'playground';
  setSqliteSubTab: (tab: 'browse' | 'playground') => void;
  browseTableName: 'executions' | 'test_cases' | 'steps';
  setBrowseTableName: (table: 'executions' | 'test_cases' | 'steps') => void;
  dbSearchQuery: string;
  setDbSearchQuery: (query: string) => void;
  rawSqlQuery: string;
  setRawSqlQuery: (query: string) => void;
  sqlResults: {
    columns: string[];
    rows: Record<string, unknown>[];
    error?: string;
  } | null;
  setSqlResults: (res: { columns: string[]; rows: Record<string, unknown>[]; error?: string } | null) => void;
  handleExecuteRawSQL: () => void;
  t: (pt: string, en: string) => string;
}

export const SqlExplorerView: React.FC<SqlExplorerViewProps> = ({
  sqliteDb,
  sqliteSubTab,
  setSqliteSubTab,
  browseTableName,
  setBrowseTableName,
  dbSearchQuery,
  setDbSearchQuery,
  rawSqlQuery,
  setRawSqlQuery,
  sqlResults,
  setSqlResults,
  handleExecuteRawSQL,
  t,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Tables & Query Mode select tabs */}
      <div className="bg-slate-900 p-1 border border-slate-800 rounded-lg flex gap-1 self-start">
        <button
          type="button"
          onClick={() => setSqliteSubTab('browse')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${
            sqliteSubTab === 'browse' 
              ? 'bg-slate-950 text-white border border-slate-800' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          Tabelas do Banco (Layout Visual)
        </button>

        <button
          type="button"
          onClick={() => setSqliteSubTab('playground')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${
            sqliteSubTab === 'playground' 
              ? 'bg-slate-950 text-white border border-slate-800' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DatabaseZap className="w-3.5 h-3.5" />
          Console SQL Interativo (RAW SQL)
        </button>
      </div>

      {sqliteSubTab === 'browse' ? (
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[350px] gap-4">
          {/* Browse tables selector */}
          <div className="flex justify-between items-center gap-4 flex-wrap pb-3 border-b border-slate-800/80">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setBrowseTableName('executions')}
                className={`px-3 py-1.2 rounded-lg text-xs font-bold border ${
                  browseTableName === 'executions'
                    ? 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Tabela: executions ({sqliteDb.executions.length} linhas)
              </button>

              <button
                type="button"
                onClick={() => setBrowseTableName('test_cases')}
                className={`px-3 py-1.2 rounded-lg text-xs font-bold border ${
                  browseTableName === 'test_cases'
                    ? 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Tabela: test_cases ({sqliteDb.test_cases.length} linhas)
              </button>

              <button
                type="button"
                onClick={() => setBrowseTableName('steps')}
                className={`px-3 py-1.2 rounded-lg text-xs font-bold border ${
                  browseTableName === 'steps'
                    ? 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Tabela: steps ({sqliteDb.steps.length} linhas)
              </button>
            </div>

            {/* Filter Search Input */}
            <div className="grow md:max-w-xs relative text-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={dbSearchQuery}
                onChange={(e) => setDbSearchQuery(e.target.value)}
                placeholder={`Buscar na tabela ${browseTableName}...`}
                className="w-full bg-slate-950 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#FF6600] text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Table Render */}
          <div className="flex-1 overflow-x-auto min-h-0">
            {browseTableName === 'executions' && (
              <table className="w-full text-xs font-mono text-slate-300 text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-200">
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">COMMAND</th>
                    <th className="p-2.5">TIMESTAMP</th>
                    <th className="p-2.5">DURATION (S)</th>
                    <th className="p-2.5">PASSED</th>
                    <th className="p-2.5">FAILED</th>
                    <th className="p-2.5">SKIPPED</th>
                    <th className="p-2.5">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sqliteDb.executions
                    .filter(ex => !dbSearchQuery || JSON.stringify(ex).toLowerCase().includes(dbSearchQuery.toLowerCase()))
                    .map(ex => (
                      <tr key={ex.id} className="hover:bg-slate-950/40 transition-all font-mono">
                        <td className="p-2.5 font-bold text-sky-400">{ex.id}</td>
                        <td className="p-2.5 max-w-xs truncate text-slate-300" title={ex.command}>{ex.command}</td>
                        <td className="p-2.5 text-slate-400">{ex.timestamp}</td>
                        <td className="p-2.5">{ex.duration_s}s</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{ex.passed}</td>
                        <td className="p-2.5 text-rose-400 font-bold">{ex.failed}</td>
                        <td className="p-2.5 text-amber-400 font-bold">{ex.skipped ?? 0}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ex.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {ex.status === 'PASS' ? 'Passed' : ex.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {browseTableName === 'test_cases' && (
              <table className="w-full text-xs font-mono text-slate-300 text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-200">
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">EXECUTION ID</th>
                    <th className="p-2.5">NOME / CENÁRIO</th>
                    <th className="p-2.5">CATEGORIA</th>
                    <th className="p-2.5">DURAÇÃO (S)</th>
                    <th className="p-2.5">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sqliteDb.test_cases
                    .filter(tc => !dbSearchQuery || JSON.stringify(tc).toLowerCase().includes(dbSearchQuery.toLowerCase()))
                    .map(tc => (
                      <tr key={tc.id} className="hover:bg-slate-950/40 transition-all font-mono">
                        <td className="p-2.5 font-bold text-amber-400">{tc.id}</td>
                        <td className="p-2.5 text-slate-400">{tc.execution_id}</td>
                        <td className="p-2.5 font-sans font-medium text-slate-200">{tc.name}</td>
                        <td className="p-2.5 text-slate-400">{tc.category}</td>
                        <td className="p-2.5">{tc.duration_s}s</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tc.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : tc.status === 'SKIP' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {tc.status === 'PASS' ? 'Passed' : tc.status === 'SKIP' ? 'Ignorado' : tc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {browseTableName === 'steps' && (
              <table className="w-full text-xs font-mono text-slate-300 text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-200">
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">TEST CASE ID</th>
                    <th className="p-2.5">TIPO</th>
                    <th className="p-2.5">TEXTO DO PASSO</th>
                    <th className="p-2.5">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sqliteDb.steps
                    .filter(st => !dbSearchQuery || JSON.stringify(st).toLowerCase().includes(dbSearchQuery.toLowerCase()))
                    .map(st => (
                      <tr key={st.id} className="hover:bg-slate-950/40 transition-all font-mono">
                        <td className="p-2.5 text-slate-500">{st.id}</td>
                        <td className="p-2.5 text-amber-400 font-bold">{st.test_case_id}</td>
                        <td className="p-2.5 font-bold text-sky-400">{st.step_type}</td>
                        <td className="p-2.5 text-slate-300 max-w-md truncate" title={st.text}>{st.text}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : st.status === 'SKIP' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {st.status === 'PASS' ? 'Passed' : st.status === 'SKIP' ? 'Ignorado' : st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Playground RAW SQL view */
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[400px] gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <div>
              <h3 className="font-extrabold text-sm uppercase text-slate-200 font-mono tracking-tight">Console SQL Interativo (SQLite Engine)</h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Escreva comandos SELECT, INSERT ou UPDATE diretamente nas tabelas relacionais do sistema.</p>
            </div>
            <button
              type="button"
              onClick={handleExecuteRawSQL}
              className="bg-[#FF6600] hover:bg-[#E05500] text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-colors font-mono flex items-center gap-1.5 shadow-md shadow-[#FF6600]/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Executar Query SQL
            </button>
          </div>

          {/* Editor TextArea */}
          <textarea
            rows={6}
            value={rawSqlQuery}
            onChange={(e) => setRawSqlQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 font-mono text-xs text-sky-300 focus:outline-none focus:border-[#FF6600] leading-relaxed resize-y select-text"
            placeholder="SELECT * FROM executions;"
          />

          {/* Results Table */}
          {sqlResults && (
            <div className="flex-1 border border-slate-800 rounded-xl p-3 bg-slate-950/60 overflow-y-auto min-h-[180px] text-left">
              {sqlResults.error ? (
                <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 font-mono text-xs">
                  ❌ Erro SQL: {sqlResults.error}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-slate-300 text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-200">
                        {sqlResults.columns.map(col => (
                          <th key={col} className="p-2.5 uppercase text-[10px] tracking-wider">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {sqlResults.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/40 transition-all font-mono">
                          {sqlResults.columns.map(col => {
                            const cellVal = row[col];
                            return (
                              <td key={col} className="p-2.5 max-w-sm truncate text-slate-300" title={String(cellVal || '')}>
                                {cellVal === 'PASS' ? (
                                  <span className="text-emerald-400 font-bold bg-emerald-950/45 border border-emerald-900 rounded px-1 text-[9px]">Passed</span>
                                ) : cellVal === 'FAIL' ? (
                                  <span className="text-rose-400 font-bold bg-rose-950/45 border border-rose-900 rounded px-1 text-[9px]">FAIL</span>
                                ) : (
                                  String(cellVal !== undefined ? cellVal : 'NULL')
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
