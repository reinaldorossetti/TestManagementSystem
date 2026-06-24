/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Check, 
  CheckCircle,
  ChevronRight, 
  Building, 
  MapPin, 
  Lock, 
  ShieldAlert,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { createTranslator } from '../utils/i18n';

interface TMSDeviceProps {
  currentScreen: 'login' | 'association' | 'onboarding_intro' | 'onboarding_details' | 'confirmation_dados';
  onNavigate: (screen: 'login' | 'association' | 'onboarding_intro' | 'onboarding_details' | 'confirmation_dados') => void;
  userRole: 'representante_legal' | 'funcionario';
  onChangeUserRole: (role: 'representante_legal' | 'funcionario') => void;
  // Feedback simulator hooks
  passwordValue: string;
  onChangePassword: (val: string) => void;
  associationType: 'separated' | 'linked' | null;
  onChangeAssociationType: (type: 'separated' | 'linked' | null) => void;
  cepValue: string;
  onChangeCep: (val: string) => void;
  municipioValue: string;
  estadoValue: string;
  onChangeAddress: (fields: { municipio: string; estado: string }) => void;
  simulationStatusMessage: string | null;
  testPassedState: boolean | null;
  onResetEmulator: () => void;
  language?: 'PT' | 'ENG';
}

export default function TMSDevice({
  currentScreen,
  onNavigate,
  userRole,
  onChangeUserRole,
  passwordValue,
  onChangePassword,
  associationType,
  onChangeAssociationType,
  cepValue,
  onChangeCep,
  municipioValue,
  estadoValue,
  onChangeAddress,
  simulationStatusMessage,
  testPassedState,
  onResetEmulator,
  language = 'PT'
}: TMSDeviceProps) {
  const t = createTranslator(language);

  const [showPassword, setShowPassword] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Synchronize toast messages with simulation statuses
  useEffect(() => {
    if (simulationStatusMessage && testPassedState === false) {
      setErrorToast(simulationStatusMessage);
    } else {
      setErrorToast(null);
    }
  }, [simulationStatusMessage, testPassedState]);

  // Clean password helper
  const handlePassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // SCENARIO_22: Limits alphanumeric password input to max 20 characters and alerts user
    if (val.length > 20) {
      setErrorToast(t("Comprimento máximo de 20 caracteres atingido.", "Maximum length of 20 characters reached."));
      onChangePassword(val.slice(0, 20));
    } else {
      onChangePassword(val);
    }
  };

  // Click handler for Selectors
  const selectOption = (opt: 'separated' | 'linked') => {
    onChangeAssociationType(opt);
  };

  // Go forward logic
  const handleContinue = () => {
    setErrorToast(null);

    if (currentScreen === 'login') {
      if (!passwordValue) {
        setErrorToast(t("O botão continuar fica inativo se a senha estiver em branco.", "The continue button remains inactive if the password is blank."));
        return;
      }
      // SCENARIO_21: Reject alphanumeric passcode shorter than 6 characters
      if (passwordValue.length < 6 || passwordValue === 'abc12') {
        setErrorToast(t("Sua senha deve ter no mínimo 6 caracteres alfanuméricos.", "Your password must have at least 6 alphanumeric characters."));
        return;
      }
      // SCENARIO_22: Handle boundary limit max-character error trigger representation
      if (passwordValue === 'abcd1234efgh5678ijkl9') {
        setErrorToast(t("Comprimento máximo de 20 caracteres atingido.", "Maximum length of 20 characters reached."));
        return;
      }

      if (passwordValue === '123456') {
        onNavigate('association');
      } else if (passwordValue === '999999') {
        setErrorToast(t("Senha incorreta. Tente novamente.", "Incorrect password. Try again."));
      } else if (passwordValue === '000000') {
        setErrorToast(t("Acesso bloqueado temporariamente por excesso de tentativas. Clique em Esqueceu sua senha para recuperar.", "Access temporarily blocked due to excessive attempts. Click Forgot password to recover."));
      } else {
        // Any other pass triggers sample wrong pass error
        setErrorToast(t("Senha incorreta. Código amortizado - insira 123456.", "Incorrect password. Mock code - enter 123456."));
      }
    } else if (currentScreen === 'association') {
      if (!associationType) {
        setErrorToast(t("Selecione uma das opções acima para continuar.", "Select one of the options above to continue."));
        return;
      }
      // Permission check scenario
      if (associationType === 'separated' && userRole === 'funcionario') {
        setErrorToast(t("Permissão Negada: É necessário perfil de Representante Legal para criar estabelecimentos com liquidação independente.", "Permission Denied: Legal Representative profile is required to create establishments with independent settlement."));
        return;
      }
      onNavigate('confirmation_dados');
    } else if (currentScreen === 'confirmation_dados') {
      // SCENARIO_24: Geopolitical minimum size restriction validation
      if (estadoValue && estadoValue.trim().length === 1) {
        setErrorToast(t("Erro de preenchimento: O campo Estado deve conter exatamente 2 caracteres UF (ex: SP).", "Fill error: The State field must contain exactly 2 UF characters (e.g. SP)."));
        return;
      }
      if (municipioValue && municipioValue.trim().length === 1) {
        setErrorToast(t("Erro de preenchimento: O campo Município deve conter ao menos 2 caracteres.", "Fill error: The Municipality field must contain at least 2 characters."));
        return;
      }

      // SCENARIO_22: If CEP is modified to trigger simulated offline API state
      if (cepValue && cepValue !== '87720-170' && cepValue !== '87720170') {
        setErrorToast(t("Serviço de CEP indisponível no momento. Preencha manualmente os campos adicionais.", "CEP service currently unavailable. Manually fill in the additional fields."));
        return;
      }

      if (!cepValue || !municipioValue || !estadoValue) {
        setErrorToast(t("Inconsistência cadastral: Município/Estado estão inválidos ou ausentes na Receita.", "Registration inconsistency: City/State are invalid or missing from Corporate Registry."));
        return;
      }

      // Successful process
      alert(t("Sucesso! Cadastro da Padaria Santa Marcelina concluído e associado.", "Success! Registration of Padaria Santa Marcelina completed and associated."));
      onNavigate('login');
      onResetEmulator();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div id="cardmais_device_container" className="w-[360px] h-[740px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col overflow-hidden select-none">
      
      {/* Top notch speaker & camera */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-around px-4">
        <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
        <div className="w-2.5 h-2.5 bg-slate-800 rounded-full"></div>
      </div>

      {/* Screen area background */}
      <div className="flex-1 bg-neutral-50 rounded-[30px] overflow-hidden flex flex-col relative text-slate-800 text-sm">
        
        {/* Device Status bar */}
        <div className="h-8 bg-neutral-50 flex justify-between items-end px-5 pb-1 select-none z-10 text-[11px] font-medium text-slate-500">
          <span>12:30</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-amber-500 text-white rounded px-1 scale-90 font-bold uppercase tracking-wider">
              {userRole === 'representante_legal' ? t("Rep. Legal", "Legal Rep.") : t("Funcionário", "Employee")}
            </span>
            <div className="w-3.5 h-2 bg-slate-400 rounded-xs relative">
              <div className="absolute -right-0.5 top-0.5 w-0.5 h-1 bg-slate-400"></div>
            </div>
          </div>
        </div>

        {/* Top Header navbar of TMS */}
        <header className="h-14 bg-white border-b border-neutral-100 flex items-center px-4 justify-between z-10 shrink-0">
          <button 
            id="device-back-button"
            onClick={() => {
              setErrorToast(null);
              if (currentScreen === 'association') onNavigate('login');
              else if (currentScreen === 'onboarding_intro') onNavigate('association');
              else if (currentScreen === 'onboarding_details') onNavigate('onboarding_intro');
              else if (currentScreen === 'confirmation_dados') onNavigate('association');
            }}
            disabled={currentScreen === 'login'}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
              currentScreen === 'login' 
                ? 'opacity-20 cursor-not-allowed' 
                : 'hover:bg-neutral-100 active:scale-95 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="font-extrabold text-lg text-[#FF6600] tracking-tight">
            card<span className="text-slate-800 font-semibold font-sans">mais</span>
          </div>
          
          <div className="w-9 h-9"></div> {/* Balancing Spacer */}
        </header>

        {/* Dynamic simulator screens */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col bg-neutral-50">
          
          {/* SCREEN 1: LOGIN PASS */}
          {currentScreen === 'login' && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h1 id="screen-login-title" className="text-xl font-bold text-slate-900 text-center mb-2 mt-2 leading-tight">
                  {t("Digite sua senha de acesso", "Enter your access password")}
                </h1>
                <p className="text-center text-xs text-slate-500 leading-relaxed px-2 mb-6">
                  {t("A senha de acesso sempre é requisitada para acessar a sua conta no aplicativo. Ela também é necessária para realizar configurações de segurança;", "The access password is always requested to access your account in the app. It is also required to perform security settings;")}
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    {t("Senha", "Password")}
                  </label>
                  <div className="relative">
                    <input 
                      id="input-password-field"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordValue}
                      onChange={handlePassChange}
                      placeholder="• • • • • •"
                      className="w-full bg-white border border-neutral-300 rounded-lg py-2.5 pl-3 pr-10 text-slate-800 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-[#FF6600] focus:border-[#FF6600] transition-colors"
                    />
                    <button 
                      id="toggle-reveal-password-btn"
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 active:scale-90 transition-all"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button 
                  id="btn-login-continuar"
                  onClick={handleContinue}
                  disabled={!passwordValue}
                  className={`w-full py-3 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all ${
                    passwordValue 
                      ? 'bg-[#FF6600] text-white hover:bg-orange-600 active:scale-[0.98]' 
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {t("Continuar", "Continue")}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setErrorToast(t("Siga o fluxo digitando uma senha padrão '123456' para simulação.", "Follow the flow by entering a default password '123456' for simulation."));
                  }}
                  className="w-full text-center text-xs font-semibold text-[#FF6600] mt-4 hover:underline"
                >
                  {t("Esqueceu sua senha?", "Forgot your password?")}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: ASSOCIATION OPTIONS CHOICE */}
          {currentScreen === 'association' && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight mb-2">
                  {t("Escolha como quer associar seu novo cadastro", "Choose how to associate your new registration")}
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {t("Veja como cada opção impacta a gestão, os controles e a conta bancária de liquidação do novo estabelecimento.", "See how each option impacts the management, controls, and settlement bank account of the new establishment.")}
                </p>

                {/* Interactive Radio list */}
                <div className="flex flex-col gap-3">
                  {/* OPTION 1: CLIENTE SEPARADO */}
                  <div 
                    onClick={() => selectOption('separated')}
                    id="card-cliente-separado"
                    className={`border rounded-xl p-3 cursor-pointer transition-all ${
                      associationType === 'separated' 
                        ? 'border-2 border-[#FF6600] bg-orange-50/40 shadow-sm' 
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 h-5">
                      <h3 className="font-bold text-slate-900 text-xs">{t("Cliente Separado", "Separate Customer")}</h3>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        associationType === 'separated' ? 'border-[#FF6600] bg-[#FF6600]' : 'border-neutral-300 bg-white'
                      }`}>
                        {associationType === 'separated' && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal mb-2.5">
                      {t("Indicado quando o novo estabelecimento precisa ter gestão própria e independente do cliente atual.", "Recommended when the new establishment needs its own and independent management from the current customer.")}
                    </p>
                    
                    <ul className="text-[10px] text-slate-700 flex flex-col gap-1">
                      <li className="flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-[#FF6600] shrink-0" />
                        {t("Cadastro independente", "Independent registration")}
                      </li>
                      <li className="flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-[#FF6600] shrink-0" />
                        {t("Controles separados", "Separate controls")}
                      </li>
                      <li className="flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-[#FF6600] shrink-0" />
                        {t("Conta bancária própria", "Own bank account")}
                      </li>
                    </ul>
                  </div>

                  {/* OPTION 2: CLIENTE VINCULADO */}
                  <div 
                    onClick={() => selectOption('linked')}
                    id="card-cliente-vinculado"
                    className={`border rounded-xl p-3 cursor-pointer transition-all ${
                      associationType === 'linked' 
                        ? 'border-2 border-[#FF6600] bg-orange-50/40 shadow-sm' 
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 h-5">
                      <h3 className="font-bold text-slate-900 text-xs">{t("Cliente Vinculado", "Linked Customer")}</h3>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        associationType === 'linked' ? 'border-[#FF6600] bg-[#FF6600]' : 'border-neutral-300 bg-white'
                      }`}>
                        {associationType === 'linked' && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal mb-2.5">
                      {t("Indicado quando o novo estabelecimento deve fazer parte do cliente atual, centralizando a operação.", "Recommended when the new establishment should be part of the current customer, centralizing operation.")}
                    </p>
                    
                    <ul className="text-[10px] text-slate-700 flex flex-col gap-1">
                      <li className="flex items-center gap-1.5 font-medium">
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 bg-neutral-100 shrink-0 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#FF6600]" />
                        </div>
                        {t("Vinculado ao cliente atual", "Linked to current customer")}
                      </li>
                      <li className="flex items-center gap-1.5 font-medium">
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 bg-neutral-100 shrink-0 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#FF6600]" />
                        </div>
                        {t("Gestão em uma única conta", "Management in a single account")}
                      </li>
                      <li className="flex items-center gap-1.5 font-medium">
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 bg-neutral-100 shrink-0 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[#FF6600]" />
                        </div>
                        {t("Visão consolidada", "Consolidated view")}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Entenda a diferença trigger */}
                <button 
                  onClick={() => onNavigate('onboarding_intro')}
                  className="flex items-center justify-center gap-1 text-xs text-[#FF6600] hover:underline mx-auto mt-4 font-semibold"
                >
                  {t("Entenda a diferença", "Understand the difference")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 pt-2 border-t border-neutral-100">
                <button 
                  onClick={handleContinue}
                  className={`w-full py-2.5 rounded-lg font-semibold text-xs transition-all tracking-wider uppercase mb-2 ${
                    associationType 
                      ? 'bg-[#FF6600] text-white hover:bg-orange-600 active:scale-[0.98]' 
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {t("Continuar", "Continue")}
                </button>
                <button 
                  onClick={() => {
                    setErrorToast(t("Deseja fechar a criação? Em ambiente de produção, retorna ao painel.", "Do you want to close creation? In production, returns to panel."));
                    setTimeout(() => {
                      onNavigate('login');
                      onResetEmulator();
                    }, 1200);
                  }}
                  className="w-full py-2 bg-transparent text-slate-500 font-semibold text-xs tracking-wider uppercase rounded-lg hover:bg-neutral-150 active:scale-95 transition-all text-center"
                >
                  {t("Cancelar", "Cancel")}
                </button>
              </div>
            </div>
          )}
                         {/* SCREEN 3: ONBOARDING MAPS INTRO (Slide 1/2) */}
          {currentScreen === 'onboarding_intro' && (
            <div className="flex-1 flex flex-col justify-between items-center text-center">
              <div className="w-full">
                {/* Visual Map Illustration */}
                <div className="w-full h-36 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 relative mb-4">
                  <div className="absolute w-24 h-24 bg-white rounded-lg shadow-sm border border-neutral-100 flex items-center justify-center">
                    <Building className="w-10 h-10 text-orange-200" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-12">
                    <MapPin className="w-12 h-12 text-[#FF6600] drop-shadow-md animate-bounce" />
                  </div>
                  {/* Small decorative clouds or trees represent simplicity */}
                  <div className="absolute bottom-3 left-4 w-6 h-6 bg-green-200 rounded-full opacity-60"></div>
                  <div className="absolute bottom-5 right-6 w-8 h-8 bg-green-200 rounded-full opacity-60"></div>
                </div>

                <h1 className="text-lg font-bold text-slate-900 leading-tight mb-3">
                  {t("Entenda a diferença", "Understand the difference")}
                </h1>

                <div className="text-left flex flex-col gap-3 px-1 text-xs text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#FF6600] font-sans text-base mt-2 shrink-0">📌</span>
                    <p className="leading-relaxed">
                      <strong>{t("Cadastrar novo cliente ➜", "Register new customer ➜")}</strong> {t("Saldo da carteira digital exclusivo para o CNPJ sendo cadastrado de modo independente.", "Digital wallet balance exclusive to the CNPJ being registered independently.")}
                    </p>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <span className="text-[#FF6600] font-sans text-base mt-2 shrink-0">📌</span>
                    <p className="leading-relaxed">
                      <strong>{t("Escolher cliente existente ➜", "Choose existing customer ➜")}</strong> {t("O CNPJ sendo cadastrado irá compartilhar o saldo da carteira atualmente ativa na matriz.", "The CNPJ being registered will share the balance of the wallet currently active in headquarters.")}
                    </p>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <span className="text-[#FF6600] font-sans text-base mt-2 shrink-0">➡️</span>
                    <p className="leading-relaxed font-semibold text-slate-900">
                      {t("Na próxima tela, explicamos melhor essa diferença para te ajudar a escolher a melhor opção!", "On the next screen, we explain this difference better to help you choose the best option!")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full">
                {/* Carousel status indicator */}
                <div className="flex justify-center gap-1.5 mb-5 mt-4">
                  <div className="w-6 h-1 w-8 bg-[#FF6600] rounded-full"></div>
                  <div className="w-2 h-1 bg-slate-300 rounded-full"></div>
                </div>

                <button 
                  onClick={() => onNavigate('onboarding_details')}
                  className="w-full bg-[#FF6600] text-white py-3 rounded-xl font-bold hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-1 text-xs uppercase"
                >
                  {t("Próximo", "Next")} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: ONBOARDING DETAIL BULLETS (Slide 2/2) */}
          {currentScreen === 'onboarding_details' && (
            <div className="flex-1 flex flex-col justify-between text-left">
              <div className="overflow-y-auto">
                <h1 className="text-lg font-bold text-slate-900 leading-tight mb-3 text-center">
                  {t("Entenda a diferença", "Understand the difference")}
                </h1>

                {/* Sticky note style content */}
                <div className="flex flex-col gap-4 text-[11px] text-slate-600">
                  
                  {/* Category 1 */}
                  <div className="bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                    <span className="font-bold text-[#FF6600] uppercase tracking-wide block mb-1">
                      📌 {t("Cadastrar novo cliente", "Register new customer")}
                    </span>
                    <ul className="list-disc list-inside flex flex-col gap-0.5 leading-normal pl-1">
                      <li>{t("Saldo exclusivo para este CNPJ de filial.", "Exclusive balance for this branch CNPJ.")}</li>
                      <li>{t("Garantias de separação de finanças total.", "Guarantees of total separation of finances.")}</li>
                      <li>{t("Controle e relatório de gerenciamento individualizado eficaz.", "Effective individualized management report and control.")}</li>
                      <li>{t("O saldo inicial inicia-se zerado (R$ 0,00).", "The initial balance starts at zero ($ 0.00).")}</li>
                    </ul>
                  </div>

                  {/* Category 2 */}
                  <div className="bg-neutral-100 p-2.5 rounded-lg border border-neutral-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      📌 {t("Escolher cliente existente", "Choose existing customer")}
                    </span>
                    <ul className="list-disc list-inside flex flex-col gap-0.5 leading-normal pl-1">
                      <li>{t("O saldo será compartilhado na conta centralizada ativa.", "The balance will be shared in the active centralized account.")}</li>
                      <li>{t("Todas as entradas/saídas operacionais de liquidação afetam o mesmo saldo comum.", "All operational inflow/outflow affects the same common balance.")}</li>
                      <li>{t("Faturamento e reconciliação em lote estruturado.", "Billing and reconciliation in structured batch.")}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="w-full mt-4">
                {/* Carousel status indicator */}
                <div className="flex justify-center gap-1.5 mb-4">
                  <div className="w-2 h-1 bg-slate-300 rounded-full"></div>
                  <div className="w-6 h-1 w-8 bg-[#FF6600] rounded-full"></div>
                </div>

                <button 
                  onClick={() => onNavigate('association')}
                  className="w-full bg-[#FF6600] text-white py-3 rounded-xl font-bold hover:bg-orange-600 active:scale-95 transition-all text-xs tracking-wider uppercase text-center"
                >
                  {t("Entendi", "Got it")}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: DATA CONFIRMATION REVIEW */}
          {currentScreen === 'confirmation_dados' && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-center text-xs text-slate-400 font-medium tracking-wide">
                  {t("Confira os dados da sua loja", "Check your store details")}
                </p>
                <h1 className="text-lg font-bold text-slate-900 text-center mb-1 leading-tight">
                  Padaria Santa Marcelina
                </h1>
                <p className="text-center text-xs font-mono text-slate-500 mb-4 bg-slate-100 rounded py-1 max-w-[200px] mx-auto">
                  12.345.678/0001-23
                </p>

                <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-col gap-2.5 text-xs">
                  
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("CEP", "Postal Code (CEP)")}</span>
                    <input 
                      type="text" 
                      value={cepValue}
                      onChange={(e) => onChangeCep(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-slate-800 font-mono focus:outline-none focus:border-[#FF6600]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("Logradouro", "Street Address")}</span>
                      <p className="font-semibold text-slate-800 text-[11px] truncate py-0.5">{t("Rua São João", "Sao Joao Street")}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("Número", "Number")}</span>
                      <p className="font-semibold text-slate-800 text-[11px] py-0.5">234</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("Complemento", "Complement")}</span>
                      <p className="font-semibold text-slate-800 text-[11px] py-0.5">{t("Casa", "House")}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("Bairro", "Neighborhood")}</span>
                      <p className="font-semibold text-slate-800 text-[11px] truncate py-0.5 font-sans">{t("Jordão", "Jordan")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-neutral-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("Município", "City")}</span>
                      <input 
                        type="text" 
                        value={municipioValue}
                        onChange={(e) => onChangeAddress({ municipio: e.target.value, estado: estadoValue })}
                        className="w-full bg-neutral-100 border border-neutral-200 rounded px-2 py-0.5 text-slate-800 text-[11px] font-semibold"
                        placeholder={t("Em Branco", "Blank")}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t("Estado", "State")}</span>
                      <input 
                        type="text" 
                        value={estadoValue}
                        onChange={(e) => onChangeAddress({ municipio: municipioValue, estado: e.target.value })}
                        className="w-full bg-neutral-100 border border-neutral-200 rounded px-2 py-0.5 text-slate-800 text-[11px] font-semibold font-mono"
                        placeholder="--"
                      />
                    </div>
                  </div>

                  <div className="mt-1 pt-1.5 border-t border-neutral-100 flex items-center justify-between text-slate-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("Faturamento", "Billing")}</span>
                    <span className="text-[10px] font-bold text-[#FF6600] uppercase">{t("Faturamento Informado", "Reported Billing")}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 shrink-0">
                <button 
                  onClick={handleContinue}
                  className="w-full bg-[#FF6600] text-white py-2.5 rounded-lg font-bold hover:bg-orange-600 active:scale-95 transition-all tracking-wider uppercase text-xs text-center"
                >
                  {t("Continuar", "Continue")}
                </button>
                <button 
                  onClick={() => onNavigate('association')}
                  className="w-full text-center text-slate-500 font-semibold text-xs tracking-wider uppercase mt-3 py-1 hover:underline"
                >
                  {t("Cancelar", "Cancel")}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic simulator bottom error block (Toast replacement style) */}
        {errorToast && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-50 border-l-4 border-red-500 p-2.5 rounded-md shadow-md animate-slide-up z-50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-[10px] text-red-700 leading-tight">
              {errorToast}
            </div>
          </div>
        )}

        {/* Successful status green overlay */}
        {testPassedState && (
          <div className="absolute top-22 left-6 right-6 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-lg shadow-lg animate-fade-in z-50 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-emerald-800 leading-none mb-1">{t("Simulação Passou!", "Simulation Passed!")}</p>
              <p className="text-[10px] text-emerald-700 leading-tight">{t("Os critérios de assertividade (Then) do Gherkin foram atendidos.", "The Gherkin assertion criteria (Then) have been met.")}</p>
            </div>
          </div>
        )}

        {/* Screen Bottom Navigation Bar indicator */}
        <div className="h-6 bg-white flex items-center justify-center select-none shrink-0 border-t border-neutral-100">
          <div className="w-24 h-1 bg-slate-300 rounded-full"></div>
        </div>

      </div>

      {/* External role changer inside simulator frame background for visibility */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1 pt-1 border-t border-slate-800 select-none">
        
        <div className="flex items-center gap-1">
          <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">{t("Cargo:", "Role:")}</span>
          <select 
            id="emulator-role-selector"
            value={userRole}
            onChange={(e) => onChangeUserRole(e.target.value as 'representante_legal' | 'funcionario')}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 font-bold focus:outline-none text-[10px] cursor-pointer"
          >
            <option value="representante_legal">{t("Representante Legal", "Legal Representative")}</option>
            <option value="funcionario">{t("Funcionário (Restrito)", "Employee (Restricted)")}</option>
          </select>
        </div>

        <button 
          onClick={() => {
            onResetEmulator();
            setErrorToast(null);
          }}
          className="flex items-center gap-1 text-[10px] font-bold text-[#FF6600] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-755 transition-colors"
          title={t("Resetar emulador para o estado limpo inicial", "Reset emulator to initial clean state")}
        >
          <RotateCcw className="w-3 h-3" /> {t("Resetar", "Reset")}
        </button>
      </div>

    </div>
  );
}
