'use client';

import React, { useState } from 'react';
import {
  BROWSER_SUGGESTIONS_BY_PLATFORM,
  TEST_RUN_ENVIRONMENTS,
  TEST_RUN_MODES,
  TEST_RUN_PLATFORMS,
  TEST_RUN_SUITE_TYPES,
  createTestRunSchema,
  resolveTestRunName,
  type CreateTestRunInput,
  type TestRunEnvironment,
  type TestRunMode,
  type TestRunPlatform,
  type TestRunSuiteType,
} from '@/src/server/validation/testRunSchemas';
import type { CatalogProjectSummary } from '@/src/server/repositories/testRunRepository';

export interface TestRunFormProps {
  projects: CatalogProjectSummary[];
  initialProjectId?: string;
  featureLabel?: string;
  onSubmit: (data: CreateTestRunInput) => Promise<void> | void;
  onCancel?: () => void;
  t?: (pt: string, en: string) => string;
}

const defaultTranslator = (pt: string, _en: string): string => pt;

export const TestRunForm: React.FC<TestRunFormProps> = ({
  projects,
  initialProjectId,
  featureLabel = 'Login',
  onSubmit,
  onCancel,
  t = defaultTranslator,
}) => {
  const [projectId, setProjectId] = useState<string>(
    initialProjectId ?? projects[0]?.id ?? 'PROJ-DEFAULT',
  );

  React.useEffect(() => {
    if (projects.length > 0 && !projects.some((p) => p.id === projectId)) {
      setProjectId(initialProjectId ?? projects[0].id);
    }
  }, [projects, projectId, initialProjectId]);
  // AC-PLT-05: Platform starts empty even if the project has a platform configured
  const [platform, setPlatform] = useState<string>('');
  const [environment, setEnvironment] = useState<TestRunEnvironment>('Homologação');
  const [browserOrDevice, setBrowserOrDevice] = useState<string>('');
  const [milestone, setMilestone] = useState<string>('');
  const [suiteType, setSuiteType] = useState<TestRunSuiteType>('Regressão');
  const [mode, setMode] = useState<TestRunMode>('Manual');
  const [appVersion, setAppVersion] = useState<string>('');
  const [plannedStartAt, setPlannedStartAt] = useState<string>('');

  const [name, setName] = useState<string>('');
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const updateSuggestedNameIfAuto = (next: {
    milestone?: string;
    browserOrDevice?: string;
    platform?: string;
    suiteType?: string;
  }) => {
    const nextName = resolveTestRunName({
      currentName: name,
      isManuallyEdited: isNameManuallyEdited,
      milestone: next.milestone !== undefined ? next.milestone : milestone,
      browserOrDevice:
        next.browserOrDevice !== undefined ? next.browserOrDevice : browserOrDevice,
      platform: next.platform !== undefined ? next.platform : platform,
      suiteType: next.suiteType !== undefined ? next.suiteType : suiteType,
      featureLabel,
    });
    if (!isNameManuallyEdited) {
      setName(nextName);
    }
  };

  const handleProjectChange = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    // AC-PLT-05: Never auto-fill platform from project.platform
  };

  const handlePlatformChange = (nextPlatform: string) => {
    setPlatform(nextPlatform);
    updateSuggestedNameIfAuto({ platform: nextPlatform });
  };

  const handleBrowserChange = (nextBrowser: string) => {
    setBrowserOrDevice(nextBrowser);
    updateSuggestedNameIfAuto({ browserOrDevice: nextBrowser });
  };

  const handleMilestoneChange = (nextMilestone: string) => {
    setMilestone(nextMilestone);
    updateSuggestedNameIfAuto({ milestone: nextMilestone });
  };

  const handleSuiteTypeChange = (nextSuiteType: TestRunSuiteType) => {
    setSuiteType(nextSuiteType);
    updateSuggestedNameIfAuto({ suiteType: nextSuiteType });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setIsNameManuallyEdited(val.trim().length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const candidate = {
      name: name.trim(),
      projectId: projectId.trim(),
      appVersion: appVersion.trim(),
      platform: platform as TestRunPlatform,
      environment,
      browserOrDevice: browserOrDevice.trim() || undefined,
      milestone: milestone.trim(),
      suiteType,
      mode,
      plannedStartAt: plannedStartAt.trim() || undefined,
    };

    const parsed = createTestRunSchema.safeParse(candidate);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError(parsed.error.issues[0]?.message ?? t('Verifique os campos obrigatórios.', 'Check required fields.'));
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(parsed.data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePlatformSuggestions =
    platform === 'Web' || platform === 'Mobile' || platform === 'Desktop'
      ? BROWSER_SUGGESTIONS_BY_PLATFORM[platform]
      : [];

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="test-run-form"
      noValidate
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 text-slate-100"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-extrabold text-white tracking-tight">
            {t('Novo Test Run', 'New Test Run')}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {t(
              'Configure versão, plataforma, ambiente, browser e milestone do ciclo',
              'Configure version, platform, environment, browser, and milestone for the cycle',
            )}
          </p>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          data-testid="test-run-form-error"
          className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Projeto */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="test-run-project" className="text-xs font-mono font-bold text-slate-300">
            {t('Projeto *', 'Project *')}
          </label>
          <select
            id="test-run-project"
            data-testid="test-run-project-select"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {fieldErrors.projectId && (
            <span className="text-[11px] text-rose-400 font-mono">{fieldErrors.projectId}</span>
          )}
        </div>

        {/* Versão da aplicação */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="test-run-version" className="text-xs font-mono font-bold text-slate-300">
            {t('Versão da Aplicação *', 'Application Version *')}
          </label>
          <input
            id="test-run-version"
            data-testid="test-run-version-input"
            type="text"
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            placeholder="2.5.0 ou 2.5.0+build.1842"
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono outline-none"
          />
          {fieldErrors.appVersion && (
            <span
              data-testid="test-run-error-appVersion"
              className="text-[11px] text-rose-400 font-mono"
            >
              {fieldErrors.appVersion}
            </span>
          )}
        </div>

        {/* Plataforma */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="test-run-platform" className="text-xs font-mono font-bold text-slate-300">
            {t('Plataforma *', 'Platform *')}
          </label>
          <select
            id="test-run-platform"
            data-testid="test-run-platform-select"
            value={platform}
            onChange={(e) => handlePlatformChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          >
            <option value="">{t('Selecione a plataforma...', 'Select platform...')}</option>
            {TEST_RUN_PLATFORMS.map((plt) => (
              <option key={plt} value={plt}>
                {plt}
              </option>
            ))}
          </select>
          {fieldErrors.platform && (
            <span
              data-testid="test-run-error-platform"
              className="text-[11px] text-rose-400 font-mono"
            >
              {fieldErrors.platform}
            </span>
          )}
        </div>

        {/* Ambiente */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="test-run-environment"
            className="text-xs font-mono font-bold text-slate-300"
          >
            {t('Ambiente *', 'Environment *')}
          </label>
          <select
            id="test-run-environment"
            data-testid="test-run-environment-select"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as TestRunEnvironment)}
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          >
            {TEST_RUN_ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </div>

        {/* Browser ou dispositivo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="test-run-browser" className="text-xs font-mono font-bold text-slate-300">
            {t('Browser ou Dispositivo', 'Browser or Device')}{' '}
            {(platform === 'Web' || platform === 'Mobile') && '*'}
          </label>
          <input
            id="test-run-browser"
            data-testid="test-run-browser-input"
            type="text"
            maxLength={60}
            value={browserOrDevice}
            onChange={(e) => handleBrowserChange(e.target.value)}
            placeholder={
              platform === 'Desktop'
                ? t('Opcional (ex.: Windows 11, macOS)', 'Optional (e.g., Windows 11, macOS)')
                : t('Ex.: Chrome, Firefox, Safari, Pixel 8', 'E.g.: Chrome, Firefox, Safari, Pixel 8')
            }
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          />
          {activePlatformSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activePlatformSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  data-testid={`browser-suggestion-${suggestion}`}
                  onClick={() => handleBrowserChange(suggestion)}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500 text-[10px] font-mono text-slate-300 cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {fieldErrors.browserOrDevice && (
            <span
              data-testid="test-run-error-browserOrDevice"
              className="text-[11px] text-rose-400 font-mono"
            >
              {fieldErrors.browserOrDevice}
            </span>
          )}
        </div>

        {/* Milestone */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="test-run-milestone" className="text-xs font-mono font-bold text-slate-300">
            {t('Milestone *', 'Milestone *')}
          </label>
          <input
            id="test-run-milestone"
            data-testid="test-run-milestone-input"
            type="text"
            value={milestone}
            onChange={(e) => handleMilestoneChange(e.target.value)}
            placeholder="Sprint 24 ou Release 2.5"
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          />
          {fieldErrors.milestone && (
            <span
              data-testid="test-run-error-milestone"
              className="text-[11px] text-rose-400 font-mono"
            >
              {fieldErrors.milestone}
            </span>
          )}
        </div>

        {/* Tipo de suíte */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="test-run-suite-type"
            className="text-xs font-mono font-bold text-slate-300"
          >
            {t('Tipo de Suíte *', 'Suite Type *')}
          </label>
          <select
            id="test-run-suite-type"
            data-testid="test-run-suite-type-select"
            value={suiteType}
            onChange={(e) => handleSuiteTypeChange(e.target.value as TestRunSuiteType)}
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          >
            {TEST_RUN_SUITE_TYPES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Modo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="test-run-mode" className="text-xs font-mono font-bold text-slate-300">
            {t('Modo do Ciclo *', 'Cycle Mode *')}
          </label>
          <select
            id="test-run-mode"
            data-testid="test-run-mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as TestRunMode)}
            className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
          >
            {TEST_RUN_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nome do Run */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="test-run-name" className="text-xs font-mono font-bold text-slate-300">
          {t('Nome do Test Run *', 'Test Run Name *')}
        </label>
        <input
          id="test-run-name"
          data-testid="test-run-name-input"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Sprint 24 - Chrome - Regressão Login"
          className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
        />
        {fieldErrors.name && (
          <span data-testid="test-run-error-name" className="text-[11px] text-rose-400 font-mono">
            {fieldErrors.name}
          </span>
        )}
      </div>

      {/* Início Planejado */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="test-run-planned-start"
          className="text-xs font-mono font-bold text-slate-300"
        >
          {t('Início Planejado (opcional)', 'Planned Start (optional)')}
        </label>
        <input
          id="test-run-planned-start"
          data-testid="test-run-planned-start-input"
          type="date"
          value={plannedStartAt}
          onChange={(e) => setPlannedStartAt(e.target.value)}
          className="bg-slate-950 border border-slate-800 hover:border-sky-500 focus:border-[#FF6600] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none max-w-xs"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
        {onCancel && (
          <button
            type="button"
            data-testid="cancel-test-run-btn"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-mono font-bold text-slate-300 cursor-pointer"
          >
            {t('Cancelar', 'Cancel')}
          </button>
        )}
        <button
          type="submit"
          data-testid="test-run-submit-btn"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] border border-slate-800 hover:border-sky-500 text-xs font-mono font-black text-white uppercase tracking-wider cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? t('Salvando...', 'Saving...') : t('Criar Test Run', 'Create Test Run')}
        </button>
      </div>
    </form>
  );
};

