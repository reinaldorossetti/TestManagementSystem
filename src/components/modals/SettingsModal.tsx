/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, FolderTree, Trash2, DatabaseZap } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotResultsDirectory: string;
  setRobotResultsDirectory: (dir: string) => void;
  onSaveRobotResultsDirectory: () => void;
  isSavingRobotResultsDirectory: boolean;
  onResetDatabase: () => void;
  t: (pt: string, en: string) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  robotResultsDirectory,
  setRobotResultsDirectory,
  onSaveRobotResultsDirectory,
  isSavingRobotResultsDirectory,
  onResetDatabase,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
      />

      {/* Config Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-screen w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-lg text-[#FF6600]">
                <Settings className="w-4 h-4 text-[#FF6600]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight leading-none text-left">
                  Menu de Configuração
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1 text-left">
                  Calibração e Administração
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Configurations Body */}
          <div className="flex flex-col gap-6 text-left">

            {/* REAL-TIME SYNC STATUS */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide font-mono">
                Sincronização Ativa
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-emerald-400 font-mono">CONECTADO (StorageEvent)</span>
              </div>
              <p className="text-[11px] leading-normal text-slate-400 font-mono">
                Todas as guias secundárias de **Histórico Remoto** ou **Relatórios** abertas sincronizam suas execuções instantaneamente.
              </p>
            </div>

            <div className="bg-slate-950 border border-sky-950/50 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sky-300">
                <FolderTree className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide font-mono">
                  {t('Repositório de Relatórios Robot', 'Robot Report Repository')}
                </span>
              </div>
              <p className="text-[11px] leading-normal text-slate-400 font-mono">
                {t(
                  'O Robot recebe --outputdir com uma subpasta RUN- única neste diretório. O valor é salvo no SQLite.',
                  'Robot receives --outputdir with a unique RUN subfolder in this directory. The value is saved in SQLite.',
                )}
              </p>
              <input
                value={robotResultsDirectory}
                onChange={(e) => setRobotResultsDirectory(e.target.value)}
                data-testid="settings-robot-results-directory-input"
                className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                aria-label={t('Diretório de resultados Robot', 'Robot results directory')}
              />
              <button
                type="button"
                onClick={onSaveRobotResultsDirectory}
                disabled={isSavingRobotResultsDirectory}
                data-testid="settings-save-robot-results-directory"
                className="w-full py-2 px-3 bg-sky-950/50 hover:bg-sky-900/50 text-sky-200 hover:text-sky-100 border border-slate-700 hover:border-sky-500 font-mono font-bold text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {isSavingRobotResultsDirectory
                  ? t('Salvando...', 'Saving...')
                  : t('Salvar diretório', 'Save directory')}
              </button>
            </div>

            {/* SQLITE DB ADMINISTRATION (RESET DB) */}
            <div className="bg-slate-950 border border-rose-950/40 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide font-mono">Administração de Dados</span>
              </div>
              <p className="text-[11px] leading-normal text-slate-400 font-mono">
                Ação destrutiva reversível. Reinicia todo o Histórico de Execuções e tabelas SQLite local, povoando-as com o Seed padrão.
              </p>
              <button
                type="button"
                onClick={() => {
                  onResetDatabase();
                  localStorage.setItem('cardmais_reset_success_feedback', 'true');
                }}
                className="w-full py-2 px-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 border border-rose-800/40 hover:border-rose-700 font-mono font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <DatabaseZap className="w-3.5 h-3.5" />
                Resetar Banco de Dados (Reset DB)
              </button>
            </div>

          </div>
        </div>

        {/* Drawer footer */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-755 text-slate-200 font-bold rounded-lg text-xs transition-colors border border-slate-700 cursor-pointer"
          >
            Confirmar e Fechar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
