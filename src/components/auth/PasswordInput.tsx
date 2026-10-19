'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  id?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  id = 'password-input',
  value,
  onChange,
  placeholder = '••••••••••••••••',
  className = '',
  disabled,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      {label && (
        <label
          htmlFor={id}
          className="text-slate-300 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-between"
        >
          <span>{label}</span>
          {error && <span className="text-rose-400 font-normal lowercase">{error}</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 text-slate-500 pointer-events-none">
          <Lock className="w-4 h-4" />
        </div>

        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="current-password"
          className={`w-full bg-slate-950 border rounded-xl pl-10 pr-11 py-3 text-xs text-slate-100 placeholder:text-slate-600 font-sans transition-all duration-200 outline-none ${
            error
              ? 'border-rose-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
              : 'border-slate-800 hover:border-slate-700 focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600]/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
          disabled={disabled}
          aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
          aria-pressed={showPassword}
          className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-200 focus:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-800/60"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-[#FF6600]" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
