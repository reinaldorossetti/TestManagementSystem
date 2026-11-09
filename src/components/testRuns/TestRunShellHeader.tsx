'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ClipboardCheck,
  Cpu,
  Globe,
  LogIn,
  LogOut,
  Sliders,
  User as UserIcon,
} from 'lucide-react';
import { NavDrawerModal } from '@/src/components/modals/NavDrawerModal';

export interface TestRunAuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'tester' | string;
}

export interface TestRunShellHeaderProps {
  activeSubRoute: 'runs' | 'scorecard';
  language: 'PT' | 'ENG';
  setLanguage: React.Dispatch<React.SetStateAction<'PT' | 'ENG'>>;
  currentUser: TestRunAuthUser | null;
  t: (pt: string, en: string) => string;
}

export const TestRunShellHeader: React.FC<TestRunShellHeaderProps> = ({
  activeSubRoute,
  language,
  setLanguage,
  currentUser,
  t,
}) => {
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.assign('/login');
    } catch {
      window.location.assign('/login');
    }
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-xl text-[#FF6600]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white font-sans">
              TMS - QA Execution Center
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {t(
                'Módulo Isolado de Ciclos de Teste (Test Runs) e Scorecard de Execução',
                'Isolated Test Runs Cycles & Execution Scorecard Module',
              )}
            </p>
          </div>
        </div>

        {/* Navegação Interna do Módulo (/test-runs e /test-runs/scorecard) */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <Link
            href="/test-runs"
            data-testid="test-runs-nav-cycles"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              activeSubRoute === 'runs'
                ? 'bg-[#FF6600] text-white border-[#FF6600]'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-sky-500'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>{t('Test Runs (Ciclos)', 'Test Runs (Cycles)')}</span>
          </Link>

          <Link
            href="/test-runs/scorecard"
            data-testid="test-runs-nav-scorecard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              activeSubRoute === 'scorecard'
                ? 'bg-[#FF6600] text-white border-[#FF6600]'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-sky-500'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('Scorecard', 'Scorecard')}</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {currentUser ? (
            <div
              data-testid="test-runs-user-badge"
              className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#FF6600]" />
              <span className="text-white font-bold max-w-[120px] truncate" title={currentUser.name}>
                {currentUser.name}
              </span>
              <span
                data-testid="test-runs-user-role"
                className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                    : currentUser.role === 'analyst'
                    ? 'bg-sky-950/80 border-sky-500/50 text-sky-300'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                }`}
              >
                {currentUser.role}
              </span>
              <button
                type="button"
                data-testid="test-runs-logout-btn"
                onClick={handleLogout}
                title={t('Encerrar sessão (Logout)', 'Sign Out')}
                className="ml-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              data-testid="test-runs-login-link"
              className="flex items-center gap-1.5 bg-[#FF6600]/10 hover:bg-[#FF6600]/25 text-[#FF6600] border border-slate-800 hover:border-sky-500 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('Entrar / Login', 'Sign In')}</span>
            </Link>
          )}

          {/* Single Connection Status Button (Rule Mandate) */}
          <div
            data-testid="test-runs-db-status"
            className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400 uppercase font-bold text-[9px]">{t('DB:', 'DB:')}</span>
            <span className="text-emerald-400 font-bold">{t('CONECTADO', 'CONNECTED')}</span>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            data-testid="test-runs-lang-toggle"
            onClick={() => setLanguage((l) => (l === 'PT' ? 'ENG' : 'PT'))}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 hover:border-sky-500 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>{language === 'PT' ? 'PT 🇧🇷' : 'EN 🇺🇸'}</span>
          </button>

          {/* Menu Lateral Suspenso Trigger */}
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            id="side-drawer-trigger"
            className="flex items-center gap-2 bg-[#FF6600]/10 hover:bg-[#FF6600]/25 text-[#FF6600] border border-slate-800 hover:border-sky-500 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#FF6600]" />
            <span className="leading-none">{t('Navegar Painéis', 'Navigate Panels')}</span>
            <span className="bg-[#FF6600] text-slate-950 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-black leading-none">
              Test Runs
            </span>
          </button>
        </div>
      </header>

      <NavDrawerModal
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        activeTab="terminal"
        setActiveTab={(tab) => {
          window.location.assign(`/${tab}`);
        }}
        t={t}
      />
    </>
  );
};

