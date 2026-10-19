'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cpu, LogIn, Mail, Globe, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PasswordInput } from '@/src/components/auth/PasswordInput';
import { LockedAccountNotice } from '@/src/components/auth/LockedAccountNotice';

export default function LoginPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'PT' | 'ENG'>('PT');
  const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de erro e controle de bloqueio
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLocked) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (res.ok && data.data?.user) {
        // Redireciona com sucesso para o Terminal TMS
        router.push('/terminal');
        return;
      }

      // Trata erros e tentativas
      if (res.status === 423) {
        // 423 Locked
        setIsLocked(true);
        setAttemptsCount(3);
        setErrorMessage(data.error);
      } else if (res.status === 401) {
        const remaining = data.details?.attemptsLeft;
        const count = typeof remaining === 'number' ? 3 - remaining : attemptsCount + 1;
        setAttemptsCount(count);

        if (count >= 3) {
          setIsLocked(true);
        }
        setErrorMessage(data.error || t('Credenciais inválidas.', 'Invalid credentials.'));
      } else {
        setErrorMessage(data.error || t('Falha ao autenticar. Tente novamente.', 'Authentication failed.'));
      }
    } catch {
      setErrorMessage(t('Erro de rede ou conexão com o servidor.', 'Network or server connection error.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 font-sans">
      {/* Top Bar com Botão Voltar e Idioma */}
      <div className="w-full max-w-md flex items-center justify-between py-2">
        <Link
          href="/terminal"
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#FF6600]" />
          <span>{t('Voltar ao Centro QA', 'Back to QA Center')}</span>
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
      <div className="w-full max-w-md my-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
          {/* Logo Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-[#FF6600]/10 border border-[#FF6600]/30 rounded-2xl text-[#FF6600]">
              <Cpu className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                TMS - QA Execution Center
              </h1>
              <p className="font-mono text-xs text-slate-400 mt-1">
                {t(
                  'Acesso Seguro de Analistas e Operadores de QA',
                  'Secure Access for QA Analysts & Operators'
                )}
              </p>
            </div>
          </div>

          {/* Exibição se a conta estiver travada (3 tentativas) */}
          {isLocked ? (
            <LockedAccountNotice
              emailAttempted={email}
              language={language}
              onReset={() => {
                setIsLocked(false);
                setAttemptsCount(0);
                setPassword('');
                setErrorMessage(null);
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Alerta de Tentativas / Erro */}
              {errorMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                    attemptsCount >= 2
                      ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                      : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">{errorMessage}</span>
                    {attemptsCount > 0 && attemptsCount < 3 && (
                      <span className="text-[10px] text-amber-400/90 font-sans">
                        {t(
                          `Tentativas incorretas: ${attemptsCount} de 3. Na 3ª falha a conta será bloqueada.`,
                          `Failed attempts: ${attemptsCount} of 3. On the 3rd failure the account will be locked.`
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Campo E-mail */}
              <div className="flex flex-col gap-1.5 text-left">
                <label
                  htmlFor="email-input"
                  className="text-slate-300 font-mono text-[11px] font-bold uppercase tracking-wider"
                >
                  {t('E-mail Corporativo:', 'Corporate Email:')}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analista.qa@empresa.com"
                    autoComplete="email"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600]/30 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 font-sans outline-none transition-all"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <PasswordInput
                id="login-password"
                label={t('Senha de Acesso:', 'Access Password:')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                required
              />

              {/* Opções de Lembrar Acesso */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-[#FF6600] focus:ring-[#FF6600]/30"
                  />
                  <span>{t('Lembrar acesso', 'Remember me')}</span>
                </label>

                <span
                  title={t('Entre em contato com um administrador para redefinição', 'Contact an admin for reset')}
                  className="text-slate-500 hover:text-slate-300 cursor-help"
                >
                  {t('Esqueceu a senha?', 'Forgot password?')}
                </span>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#FF6600] hover:bg-[#e05500] text-white py-3 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6600]/20 hover:shadow-[#FF6600]/35 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4 fill-current" />
                <span>
                  {isLoading
                    ? t('Verificando Credenciais...', 'Authenticating...')
                    : t('Entrar no Sistema', 'Sign In')}
                </span>
              </button>
            </form>
          )}

          {/* Rodapé do Card com Link para Cadastro */}
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs font-sans text-slate-400">
            <span>{t('Novo no Centro de Execução TMS?', 'New to TMS Execution Center?')}</span>{' '}
            <Link
              href="/register"
              className="text-[#FF6600] hover:underline font-bold transition-colors"
            >
              {t('Cadastrar novo analista', 'Register new analyst')}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Informativo */}
      <div className="text-center font-mono text-[10px] text-slate-500 py-2">
        <span>TMS Execution Center v2.1.0 • Protegido por OWASP Top 10 & NIST SP 800-63B</span>
      </div>
    </div>
  );
}
