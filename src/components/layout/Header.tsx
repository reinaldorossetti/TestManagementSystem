/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, Globe, Settings, Sliders } from 'lucide-react';

interface HeaderProps {
  language: 'PT' | 'ENG';
  setLanguage: React.Dispatch<React.SetStateAction<'PT' | 'ENG'>>;
  robotResultsDirectory: string;
  setIsConfigOpen: (open: boolean) => void;
  setIsNavDrawerOpen: (open: boolean) => void;
  activeTab: 'terminal' | 'sqlite' | 'reports' | 'tms';
  t: (pt: string, en: string) => string;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  robotResultsDirectory,
  setIsConfigOpen,
  setIsNavDrawerOpen,
  activeTab,
  t,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-xl text-[#FF6600]">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg tracking-tight text-white font-sans">TMS - QA Execution Center</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            {t("Dashboard de Execução de Testes Automatizados Online com base na especificação do Sistema em ATDD.", "Online Automated Test Execution Dashboard based on the System Specification in ATDD.")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Single Connection Status Button */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-400 uppercase font-bold text-[9px]">{t("DB:", "DB:")}</span>
          <span className="text-emerald-400 font-bold">{t("CONECTADO", "CONNECTED")}</span>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono">
          <span className="text-slate-400 uppercase font-bold text-[9px]">{t("Repositório de Relatórios:", "Report Store:")}</span>
          <span className="text-[#FF6600] font-sans font-semibold">{robotResultsDirectory}</span>
        </div>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={() => setLanguage(l => l === 'PT' ? 'ENG' : 'PT')}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-sky-500 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-sm text-sky-400"
          title={t("Alterar idioma para Inglês", "Switch language to Portuguese")}
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>{language === 'PT' ? 'PT 🇧🇷' : 'EN 🇺🇸'}</span>
        </button>

        {/* Menu de Configuração Trigger */}
        <button 
          onClick={() => setIsConfigOpen(true)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer group"
          title={t("Abrir Painel de Configurações", "Open Settings Panel")}
        >
          <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF6600] group-hover:rotate-45 transition-all duration-300" />
          <span className="hidden leading-none sm:inline">{t("Configurações", "Settings")}</span>
        </button>

        {/* Menu Lateral Suspenso Trigger */}
        <button 
          onClick={() => setIsNavDrawerOpen(true)}
          className="flex items-center gap-2 bg-[#FF6600]/10 hover:bg-[#FF6600]/25 text-[#FF6600] border border-[#FF6600]/30 hover:border-[#FF6600]/55 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-sm relative group"
          title={t("Abrir Menu de Navegação de Painéis", "Open Panel Navigation Menu")}
          id="side-drawer-trigger"
        >
          <Sliders className="w-3.5 h-3.5 text-[#FF6600] group-hover:rotate-12 transition-transform" />
          <span className="leading-none">{t("Navegar Painéis", "Navigate Panels")}</span>
          <span className="bg-[#FF6600] text-slate-950 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-black shadow-inner leading-none">
            {activeTab === 'terminal' ? t('Terminal', 'Terminal') : activeTab === 'sqlite' ? t('Histórico', 'History') : activeTab === 'reports' ? t('Relatórios', 'Reports') : activeTab === 'tms' ? t('TMS', 'TMS') : t('Emulador', 'Emulator')}
          </span>
        </button>
      </div>
    </header>
  );
};
