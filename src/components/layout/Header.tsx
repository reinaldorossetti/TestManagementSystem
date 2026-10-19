/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cpu, Globe, Settings, Sliders, User as UserIcon, LogIn, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import { AdminUserManagementModal } from '../auth/AdminUserManagementModal';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'tester';
  status: string;
}

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.data?.user) {
          setCurrentUser(data.data.user);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      window.location.reload();
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <>
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
          {/* Status do Usuário Autenticado */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono">
              <UserIcon className="w-3.5 h-3.5 text-[#FF6600]" />
              <span className="text-white font-bold max-w-[120px] truncate" title={currentUser.name}>
                {currentUser.name}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold border ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                    : currentUser.role === 'analyst'
                    ? 'bg-sky-950/80 border-sky-500/50 text-sky-300'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                }`}
              >
                {currentUser.role}
              </span>

              {/* Botão de Governança para Administrador */}
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  title={t("Abrir Gestão de Usuários (Admin)", "Open User Governance (Admin)")}
                  className="ml-1 p-1 text-purple-400 hover:text-white bg-purple-950/50 hover:bg-purple-900 border border-purple-500/40 rounded transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Botão Sair */}
              <button
                type="button"
                onClick={handleLogout}
                title={t("Encerrar sessão (Logout)", "Sign Out")}
                className="ml-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-[#FF6600]/10 hover:bg-[#FF6600]/25 text-[#FF6600] border border-[#FF6600]/30 hover:border-[#FF6600]/60 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t("Entrar / Login", "Sign In")}</span>
            </Link>
          )}

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

      {/* Modal de Gestão de Usuários (Admin) */}
      <AdminUserManagementModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        language={language}
      />
    </>
  );
};
