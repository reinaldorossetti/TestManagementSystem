'use client';

import React from 'react';
import { Shield, FileCheck, CheckCircle2 } from 'lucide-react';
import type { UserRole } from '@/src/server/validation/authSchemas';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  language?: 'PT' | 'ENG';
  disabled?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onChangeRole,
  language = 'PT',
  disabled = false,
}) => {
  const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

  const roles = [
    {
      id: 'tester' as UserRole,
      title: t('Tester (Operador)', 'Tester (Operator)'),
      badge: 'TESTER',
      badgeClass: 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300',
      description: t(
        'Execução de testes automatizados no Terminal TMS e anexo de evidências de QA.',
        'Execute automated Robot tests in Terminal and attach QA evidences.'
      ),
      icon: CheckCircle2,
    },
    {
      id: 'analyst' as UserRole,
      title: t('Analyst (Analista QA)', 'Analyst (QA Analyst)'),
      badge: 'ANALYST',
      badgeClass: 'bg-sky-950/60 border-sky-500/50 text-sky-300',
      description: t(
        'Criação de casos de teste, documentação de critérios de aceite e relatórios executivos.',
        'Create test cases, document acceptance criteria, and export reports.'
      ),
      icon: FileCheck,
    },
    {
      id: 'admin' as UserRole,
      title: t('Admin (Administrador)', 'Admin (Administrator)'),
      badge: 'ADMIN',
      badgeClass: 'bg-purple-950/60 border-purple-500/50 text-purple-300',
      description: t(
        'Governança geral, desbloqueio exclusivo de contas travadas por 3 falhas e auditoria.',
        'Full governance, unlock accounts blocked by 3 failures, and audit logs.'
      ),
      icon: Shield,
    },
  ];

  return (
    <div className="flex flex-col gap-2 w-full text-left">
      <label className="text-slate-300 font-mono text-[11px] font-bold uppercase tracking-wider">
        {t('Selecione seu Perfil de Acesso (RBAC):', 'Select your Access Role (RBAC):')}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {roles.map((r) => {
          const isSelected = selectedRole === r.id;
          const Icon = r.icon;

          return (
            <button
              type="button"
              key={r.id}
              disabled={disabled}
              onClick={() => onChangeRole(r.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-slate-900 border-[#FF6600] shadow-md shadow-[#FF6600]/10 ring-1 ring-[#FF6600]/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold ${r.badgeClass}`}
                >
                  {r.badge}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    isSelected ? 'text-[#FF6600]' : 'text-slate-500'
                  }`}
                />
              </div>

              <div>
                <h4 className="font-sans font-bold text-xs text-white">
                  {r.title}
                </h4>
                <p className="font-sans text-[10px] text-slate-400 mt-1 leading-snug">
                  {r.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
