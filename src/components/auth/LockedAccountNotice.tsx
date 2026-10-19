'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';

interface LockedAccountNoticeProps {
  onReset: () => void;
  language?: 'PT' | 'ENG';
  emailAttempted?: string;
}

export const LockedAccountNotice: React.FC<LockedAccountNoticeProps> = ({
  onReset,
  language = 'PT',
  emailAttempted,
}) => {
  const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

  return (
    <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-6 flex flex-col items-center text-center gap-4 animate-fade-in shadow-2xl shadow-rose-950/30">
      <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-400">
        <ShieldAlert className="w-10 h-10 animate-pulse" />
      </div>

      <div className="flex flex-col gap-1.5 max-w-sm">
        <span className="px-2.5 py-0.5 rounded-full bg-rose-900/60 border border-rose-500/60 text-rose-300 font-mono text-[10px] font-extrabold uppercase tracking-wider self-center">
          {t('Bloqueio Crítico de Segurança (3/3)', 'Critical Security Lockout (3/3)')}
        </span>
        <h3 className="font-sans font-extrabold text-base text-rose-100">
          {t('Acesso Bloqueado Permanentemente', 'Access Permanently Blocked')}
        </h3>
        <p className="font-sans text-xs text-rose-200/90 leading-relaxed mt-1">
          {t(
            'Foram registradas 3 tentativas consecutivas com credenciais incorretas. Por políticas de segurança OWASP e governança do TMS, esta conta foi desativada.',
            '3 consecutive attempts with incorrect credentials were recorded. Under OWASP and TMS governance policies, this account has been disabled.'
          )}
        </p>
        {emailAttempted && (
          <div className="mt-2 bg-slate-950/90 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-300 break-all">
            <span className="text-slate-500">{t('Conta:', 'Account:')}</span>{' '}
            <span className="font-bold text-rose-300">{emailAttempted}</span>
          </div>
        )}
      </div>

      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-left flex items-start gap-2.5">
        <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex flex-col text-[11px] font-mono">
          <span className="text-amber-400 font-bold">
            {t('Regra de Desbloqueio:', 'Unlock Policy:')}
          </span>
          <span className="text-slate-400 leading-snug">
            {t(
              'Não há liberação por tempo. Apenas um usuário com perfil ADMIN pode realizar o destrave através do painel de governança.',
              'No auto-timeout unlock. Only a user with the ADMIN role can unlock this account via the governance panel.'
            )}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('Voltar à tela de identificação', 'Back to login screen')}</span>
      </button>
    </div>
  );
};
