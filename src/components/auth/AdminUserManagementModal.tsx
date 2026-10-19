'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  X,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Users,
} from 'lucide-react';
import type { User } from '@/generated/prisma/client';

type SafeUser = Omit<User, 'passwordHash'>;

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'PT' | 'ENG';
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
  language = 'PT',
}) => {
  const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.data) {
        setUsers(data.data);
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || t('Falha ao carregar usuários.', 'Failed to load users.'),
        });
      }
    } catch {
      setActionFeedback({
        type: 'error',
        message: t('Erro de rede ao buscar usuários.', 'Network error while fetching users.'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, fetchUsers, onClose]);

  const handleUnlock = async (userId: string, email: string) => {
    setUnlockingId(userId);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unlock`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: t(
            `Conta de ${email} desbloqueada com sucesso! As tentativas foram zeradas.`,
            `Account ${email} successfully unlocked! Failed attempts reset to 0.`
          ),
        });
        await fetchUsers();
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || t('Falha ao desbloquear conta.', 'Failed to unlock account.'),
        });
      }
    } catch {
      setActionFeedback({
        type: 'error',
        message: t('Erro de conexão com o servidor.', 'Server connection error.'),
      });
    } finally {
      setUnlockingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sans font-extrabold text-base text-white flex items-center gap-2">
                {t('Painel de Gestão e Governança de Usuários', 'User Governance & Management Panel')}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300">
                  ADMIN ONLY
                </span>
              </h2>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                {t(
                  'Desbloqueio exclusivo de contas travadas por 3 tentativas e controle de papéis RBAC.',
                  'Exclusive unlock of accounts locked after 3 failures and RBAC role oversight.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              title={t('Recarregar lista de usuários', 'Reload user list')}
              className="p-2 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`px-5 py-3 text-xs font-mono flex items-center gap-2 border-b ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder={t('Filtrar por nome, e-mail ou perfil...', 'Filter by name, email or role...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#FF6600]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Users className="w-4 h-4 text-[#FF6600]" />
            <span>
              {t('Total:', 'Total:')} <strong className="text-white">{filteredUsers.length}</strong>
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              {isLoading
                ? t('Carregando usuários do sistema...', 'Loading system users...')
                : t('Nenhum usuário localizado.', 'No users found.')}
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-2.5 px-3">{t('Usuário / Analista', 'User / Analyst')}</th>
                    <th className="py-2.5 px-3">{t('Perfil (RBAC)', 'Role (RBAC)')}</th>
                    <th className="py-2.5 px-3">{t('Status', 'Status')}</th>
                    <th className="py-2.5 px-3 text-center">{t('Tentativas Falhas', 'Failed Attempts')}</th>
                    <th className="py-2.5 px-3 text-right">{t('Ação de Governança', 'Governance Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredUsers.map((u) => {
                    const isBlocked = u.status === 'BLOCKED' || u.failedAttempts >= 3;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-850/40 transition-colors ${
                          isBlocked ? 'bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-xs">{u.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">{u.email}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border ${
                              u.role === 'admin'
                                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                                : u.role === 'analyst'
                                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/60 text-rose-300 font-mono text-[9.5px] font-extrabold animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              {t('BLOQUEADO (3/3)', 'BLOCKED (3/3)')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[9.5px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {t('ATIVO', 'ACTIVE')}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-xs ${
                              u.failedAttempts >= 3
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : u.failedAttempts > 0
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : 'text-slate-500'
                            }`}
                          >
                            {u.failedAttempts} / 3
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isBlocked ? (
                            <button
                              type="button"
                              onClick={() => handleUnlock(u.id, u.email)}
                              disabled={unlockingId === u.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 hover:border-emerald-400 py-1.5 px-3 rounded-lg font-mono text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50 disabled:opacity-50"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>
                                {unlockingId === u.id
                                  ? t('Desbloqueando...', 'Unlocking...')
                                  : t('Desbloquear Conta', 'Unlock Account')}
                              </span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">
                              {t('Regular', 'Normal')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{t('Regra de Ouro: Desbloqueio somente com perfil Admin.', 'Golden Rule: Unlock strictly with Admin role.')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer transition-all"
          >
            {t('Fechar', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
