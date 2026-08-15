/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { 
  X, 
  Terminal, 
  Database, 
  BarChart3, 
  Layers, 
  ChevronRight, 
  Sliders
} from 'lucide-react';

interface NavDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'tms' | 'terminal' | 'sqlite' | 'reports';
  setActiveTab: (tab: 'tms' | 'terminal' | 'sqlite' | 'reports') => void;
  t: (pt: string, en: string) => string;
}

export const NavDrawerModal: React.FC<NavDrawerModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  t,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panels = [
    {
      id: 'tms' as const,
      title: t('Sistema de Gestão de Testes (TMS)', 'Test Management System (TMS)'),
      description: t('Gestão completa de casos de teste, suítes e especificações BDD em prosa.', 'Full management of test cases, suites, and BDD specifications.'),
      icon: Layers,
      badge: t('TMS & Casos', 'TMS & Cases'),
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400',
    },
    {
      id: 'terminal' as const,
      title: t('Console Terminal (Robot Framework)', 'Terminal Console (Robot Framework)'),
      description: t('Execução real de suítes e cenários Robot BDD com logs em tempo real.', 'Real execution of Robot BDD suites and scenarios with streaming logs.'),
      icon: Terminal,
      badge: t('Execução Ao Vivo', 'Live Execution'),
      color: 'from-[#FF6600]/20 to-orange-600/10 border-[#FF6600]/40 text-[#FF6600]',
    },
    {
      id: 'sqlite' as const,
      title: t('Explorador SQLite (Banco Relacional)', 'SQLite Explorer (Relational DB)'),
      description: t('Inspeção relacional de execuções, tabelas, steps e playground SQL.', 'Relational inspection of executions, tables, steps, and SQL playground.'),
      icon: Database,
      badge: t('Histórico & SQL', 'History & SQL'),
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/40 text-sky-400',
    },
    {
      id: 'reports' as const,
      title: t('Relatórios de Execução (Analytics & KPI)', 'Execution Reports (Analytics & KPI)'),
      description: t('Métricas consolidadas, taxa de êxito, exportação Excel/PDF e gráficos.', 'Consolidated metrics, pass rates, Excel/PDF exports, and analytical charts.'),
      icon: BarChart3,
      badge: t('Relatórios & KPI', 'Reports & KPI'),
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="nav-drawer-backdrop"
    >
      <div 
        className="w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 h-full flex flex-col p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
        data-testid="nav-drawer-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-xl text-[#FF6600]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white tracking-tight">
                {t('Navegar Painéis', 'Navigate Panels')}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {t('Selecione o painel de trabalho desejado', 'Select your desired workspace panel')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="nav-drawer-close-button"
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Options List */}
        <div className="flex flex-col gap-3.5 my-6">
          {panels.map((panel) => {
            const Icon = panel.icon;
            const isActive = activeTab === panel.id;

            return (
              <div
                key={panel.id}
                onClick={() => {
                  setActiveTab(panel.id);
                  onClose();
                  if (typeof window !== 'undefined') {
                    const targetUrl = `/${panel.id}`;
                    if (window.location.pathname !== targetUrl) {
                      window.history.pushState({}, '', targetUrl);
                    }
                  }
                }}
                data-testid={`nav-panel-item-${panel.id}`}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative overflow-hidden group ${
                  isActive 
                    ? `bg-gradient-to-r ${panel.color} shadow-lg ring-1 ring-[#FF6600]/30` 
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${
                      isActive 
                        ? 'bg-slate-900 border-[#FF6600]/40 text-[#FF6600]' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-100 group-hover:text-white font-sans">
                      {panel.title}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    isActive
                      ? 'bg-[#FF6600] text-slate-950 border-[#FF6600]'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {panel.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-sans leading-relaxed pl-9">
                  {panel.description}
                </p>

                <div className="flex items-center justify-end pt-1">
                  <span className={`text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
                    isActive ? 'text-[#FF6600]' : 'text-slate-500 group-hover:text-slate-300'
                  }`}>
                    {isActive ? t('Painel Ativo', 'Active Panel') : t('Acessar Painel', 'Access Panel')}
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
