'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cpu, UserPlus, Mail, User as UserIcon, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '@/src/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/src/components/auth/PasswordStrengthMeter';
import { RoleSelector } from '@/src/components/auth/RoleSelector';
import type { UserRole } from '@/src/server/validation/authSchemas';

export default function RegisterPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'PT' | 'ENG'>('PT');
  const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('tester');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage(t('As senhas digitadas não coincidem.', 'Passwords do not match.'));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.data) {
        setSuccessMessage(
          t(
            'Cadastro realizado com sucesso! Redirecionando para o login...',
            'Registration successful! Redirecting to sign in...'
          )
        );
        setTimeout(() => {
          router.push('/login');
        }, 1800);
      } else {
        setErrorMessage(
          data.error || t('Falha ao registrar usuário.', 'Failed to register user.')
        );
      }
    } catch {
      setErrorMessage(
        t('Erro de conexão ao submeter o formulário.', 'Connection error submitting form.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 font-sans">
      {/* Top Bar */}
      <div className="w-full max-w-xl flex items-center justify-between py-2">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#FF6600]" />
          <span>{t('Voltar para o Login', 'Back to Sign In')}</span>
        </Link>

        <button
          type="button"
          onClick={() => setLanguage((l) => (l === 'PT' ? 'ENG' : 'PT'))}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>{language === 'PT' ? 'PT 🇧🇷' : 'EN 🇺🇸'}</span>
        </button>
      </div>

      {/* Card Central */}
      <div className="w-full max-w-xl my-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-2xl text-[#FF6600]">
              <Cpu className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                {t('Cadastro de Usuário QA', 'QA User Registration')}
              </h1>
              <p className="font-mono text-xs text-slate-400 mt-1">
                {t(
                  'Crie seu perfil profissional no Centro de Execução TMS com senha forte.',
                  'Create your professional profile on TMS Execution Center with strong password.'
                )}
              </p>
            </div>
          </div>

          {/* Mensagens de Sucesso ou Erro */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-300 font-mono text-xs flex items-center gap-2 animate-fade-in">
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nome Completo */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="register-name"
                className="text-slate-300 font-mono text-[11px] font-bold uppercase tracking-wider"
              >
                {t('Nome Completo:', 'Full Name:')}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Carlos Silva"
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600]/30 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 font-sans outline-none transition-all"
                />
              </div>
            </div>

            {/* E-mail Corporativo */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="register-email"
                className="text-slate-300 font-mono text-[11px] font-bold uppercase tracking-wider"
              >
                {t('E-mail Corporativo:', 'Corporate Email:')}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos.silva@empresa.com"
                  autoComplete="email"
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600]/30 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 font-sans outline-none transition-all"
                />
              </div>
            </div>

            {/* Seletor de Perfil (RBAC) */}
            <RoleSelector
              selectedRole={role}
              onChangeRole={setRole}
              language={language}
              disabled={isLoading}
            />

            {/* Senha de Acesso */}
            <div className="flex flex-col gap-2">
              <PasswordInput
                id="register-password"
                label={t('Senha Forte (mínimo 12 caracteres):', 'Strong Password (min 12 chars):')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: Segura@QA2026#Valida"
                required
              />

              {/* Medidor Dinâmico de Força */}
              <PasswordStrengthMeter
                password={password}
                name={name}
                email={email}
                language={language}
              />
            </div>

            {/* Confirmação de Senha */}
            <PasswordInput
              id="register-confirm-password"
              label={t('Confirmar Senha:', 'Confirm Password:')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••••••"
              required
            />

            {/* Botão de Registro */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF6600] hover:bg-[#e05500] text-white py-3 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6600]/20 hover:shadow-[#FF6600]/35 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isLoading
                  ? t('Criando Cadastro...', 'Creating Account...')
                  : t('Concluir Cadastro', 'Complete Registration')}
              </span>
            </button>
          </form>

          {/* Rodapé com link para login */}
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs font-sans text-slate-400">
            <span>{t('Já possui uma conta ativa?', 'Already have an active account?')}</span>{' '}
            <Link
              href="/login"
              className="text-[#FF6600] hover:underline font-bold transition-colors"
            >
              {t('Fazer Login', 'Sign In')}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Informativo */}
      <div className="text-center font-mono text-[10px] text-slate-500 py-2">
        <span>TMS Execution Center v2.1.0 • Padrão de Senhas Fortes NIST SP 800-63B</span>
      </div>
    </div>
  );
}
