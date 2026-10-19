'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle, XCircle } from 'lucide-react';
import {
  FORBIDDEN_PASSWORD_CHARS,
  ALLOWED_SPECIAL_CHARS_REGEX,
} from '@/src/server/validation/authSchemas';

interface PasswordStrengthMeterProps {
  password: string;
  name?: string;
  email?: string;
  language?: 'PT' | 'ENG';
}

interface RequirementItem {
  id: string;
  label: string;
  met: boolean;
  isNegative?: boolean; // Se for negativo (ex: contém espaço ou caractere proibido)
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  name = '',
  email = '',
  language = 'PT',
}) => {
  const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

  const analysis = useMemo(() => {
    const hasMinLength = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = ALLOWED_SPECIAL_CHARS_REGEX.test(password);

    // Verificações negativas (riscos)
    const hasSpaces = /\s/.test(password);
    const forbiddenCharsFound = FORBIDDEN_PASSWORD_CHARS.filter((c) => password.includes(c));
    const hasForbiddenChars = forbiddenCharsFound.length > 0;

    // Dados pessoais
    const emailPrefix = email.split('@')[0]?.toLowerCase() ?? '';
    const nameParts = name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    const passLower = password.toLowerCase();
    const hasPersonalData =
      (emailPrefix.length >= 3 && passLower.includes(emailPrefix)) ||
      nameParts.some((part) => passLower.includes(part));

    // Cálculo da pontuação positiva
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUpper) score += 1;
    if (hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    // Se tiver violação de segurança (espaços, caracteres proibidos ou dados pessoais), zera ou rebaixa
    if (hasSpaces || hasForbiddenChars || hasPersonalData) {
      score = Math.min(score, 1);
    }

    // Porcentagem e classificação
    const percentage = Math.min(100, Math.round((score / 5) * 100));

    let label = t('Fraca', 'Weak');
    let colorClass = 'bg-rose-500';
    let textColorClass = 'text-rose-400';

    if (score >= 5 && !hasSpaces && !hasForbiddenChars && !hasPersonalData) {
      label = t('Excelente / Senha Forte', 'Strong / Excellent');
      colorClass = 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
      textColorClass = 'text-emerald-400';
    } else if (score >= 4) {
      label = t('Boa', 'Good');
      colorClass = 'bg-sky-500';
      textColorClass = 'text-sky-400';
    } else if (score >= 2) {
      label = t('Regular', 'Fair');
      colorClass = 'bg-amber-500';
      textColorClass = 'text-amber-400';
    }

    const requirements: RequirementItem[] = [
      {
        id: 'length',
        label: t('Mínimo de 12 caracteres (recomendado NIST)', 'Minimum 12 characters (NIST standard)'),
        met: hasMinLength,
      },
      {
        id: 'upper',
        label: t('Ao menos 1 letra maiúscula (A-Z)', 'At least 1 uppercase letter (A-Z)'),
        met: hasUpper,
      },
      {
        id: 'lower',
        label: t('Ao menos 1 letra minúscula (a-z)', 'At least 1 lowercase letter (a-z)'),
        met: hasLower,
      },
      {
        id: 'number',
        label: t('Ao menos 1 número (0-9)', 'At least 1 digit (0-9)'),
        met: hasNumber,
      },
      {
        id: 'special',
        label: t(
          'Ao menos 1 caractere especial (!@#$%^&*()_+-=[]{}|;:,.<>?)',
          'At least 1 special char (!@#$%^&*()_+-=[]{}|;:,.<>?)'
        ),
        met: hasSpecial,
      },
    ];

    return {
      score,
      percentage,
      label,
      colorClass,
      textColorClass,
      hasSpaces,
      hasForbiddenChars,
      forbiddenCharsFound,
      hasPersonalData,
      requirements,
      isValid: score === 5 && !hasSpaces && !hasForbiddenChars && !hasPersonalData,
    };
  }, [password, name, email, language]);

  if (!password) {
    return (
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left">
        <p className="text-[11px] font-mono text-slate-400">
          {t(
            'Requisito: Defina uma senha forte com no mínimo 12 caracteres contendo letras, números e símbolos.',
            'Requirement: Set a strong password with at least 12 characters containing letters, digits, and symbols.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 text-left animate-fade-in">
      {/* Barra de Progresso e Classificação */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold">
          <span className="text-slate-400 uppercase tracking-wider">{t('Força da Senha:', 'Password Strength:')}</span>
          <span className={`${analysis.textColorClass} font-extrabold uppercase`}>{analysis.label}</span>
        </div>

        <div className="w-full h-2 bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${analysis.colorClass}`}
            style={{ width: `${Math.max(8, analysis.percentage)}%` }}
          />
        </div>
      </div>

      {/* Alertas de Violações Negativas Críticas */}
      {analysis.hasSpaces && (
        <div className="flex items-center gap-1.5 p-2 bg-rose-950/50 border border-rose-500/40 rounded-lg text-rose-300 text-[11px] font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{t('Proibido conter espaços ou quebras de linha.', 'Spaces or line breaks are forbidden.')}</span>
        </div>
      )}

      {analysis.hasForbiddenChars && (
        <div className="flex items-center gap-1.5 p-2 bg-rose-950/50 border border-rose-500/40 rounded-lg text-rose-300 text-[11px] font-mono">
          <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>
            {t(
              `Caracteres proibidos identificados: ${analysis.forbiddenCharsFound.join(' ')} (aspas, igual, crase e acento agudo são proibidos).`,
              `Forbidden characters found: ${analysis.forbiddenCharsFound.join(' ')} (quotes, equal, backtick, and acute accents are prohibited).`
            )}
          </span>
        </div>
      )}

      {analysis.hasPersonalData && (
        <div className="flex items-center gap-1.5 p-2 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 text-[11px] font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{t('A senha não pode conter seu nome ou e-mail.', 'Password cannot contain your name or email.')}</span>
        </div>
      )}

      {/* Checklist dos 5 Requisitos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
        {analysis.requirements.map((req) => (
          <div key={req.id} className="flex items-center gap-1.5 text-[10.5px] font-mono">
            {req.met ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}
            <span className={req.met ? 'text-slate-200 font-medium' : 'text-slate-500'}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
