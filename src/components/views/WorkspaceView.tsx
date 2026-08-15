/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FileCode, 
  Upload, 
  Edit, 
  Database, 
  Sliders, 
  Settings, 
  Play, 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  Code
} from 'lucide-react';
import type { ParsedFeature, ParsedScenario } from '../../utils/featureLoader';
import type { ExecutionTagOption, RobotProjectOption } from '../../utils/robotTagLoader';

interface WorkspaceViewProps {
  gherkinContent: string;
  parsedFeature: ParsedFeature;
  scenarioStatuses: Record<string, string>;
  isEditingGherkin: boolean;
  gherkinTempText: string;
  setGherkinTempText: (val: string) => void;
  setIsEditingGherkin: (val: boolean) => void;
  handleSaveGherkin: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  isDraggingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleSaveCurrentWorkspaceAsCases: () => void;
  
  // CLI arguments
  projectFolders: string[];
  projectOptions: RobotProjectOption[];
  selectedProjectFolder: string | null;
  handleSelectProject: (folder: string) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  tagsForSelectedProject: ExecutionTagOption[];
  refreshExecutionTagsFromRobotSample: () => Promise<void>;
  setIsTagModalOpen: (open: boolean) => void;
  argsFile: string;
  setArgsFile: (val: string) => void;
  getCompiledCommand: () => string;
  
  // Execution actions
  handleRunFeatureReal: (tagOverride?: string) => void;
  isExecutingFeature: boolean;
  selectedScenarioId: string | null;
  setSelectedScenarioId: (id: string | null) => void;
  t: (pt: string, en: string) => string;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  gherkinContent,
  parsedFeature,
  scenarioStatuses,
  isEditingGherkin,
  gherkinTempText,
  setGherkinTempText,
  setIsEditingGherkin,
  handleSaveGherkin,
  handleFileChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  isDraggingFile,
  fileInputRef,
  handleSaveCurrentWorkspaceAsCases,
  projectOptions,
  selectedProjectFolder,
  handleSelectProject,
  filterTag,
  setFilterTag,
  tagsForSelectedProject,
  refreshExecutionTagsFromRobotSample,
  setIsTagModalOpen,
  argsFile,
  setArgsFile,
  getCompiledCommand,
  handleRunFeatureReal,
  isExecutingFeature,
  selectedScenarioId,
  setSelectedScenarioId,
  t,
}) => {
  const [workspaceTab, setWorkspaceTab] = React.useState<'scenarios' | 'raw'>('scenarios');

  return (
    <div className="w-full lg:w-[420px] bg-slate-900 border-r border-slate-800 flex flex-col p-5 overflow-y-auto shrink-0 gap-5">
      
      {/* CLI execution configuration */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3" data-testid="terminal-robot-arguments-panel">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
          <Sliders className="w-4 h-4 text-[#FF6600]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
            {t("Argumentos do Robot Framework", "Robot Framework Arguments")}
          </h3>
        </div>
        
        <div className="flex flex-col gap-2 text-xs">
          {projectOptions.length > 0 && (
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1">
                {t("Selecionar Projeto (test_projects/):", "Select Project (test_projects/):")}
              </label>
              <select
                value={selectedProjectFolder ?? ''}
                onChange={(e) => handleSelectProject(e.target.value)}
                data-testid="terminal-project-select"
                className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-slate-200"
              >
                {projectOptions.map((project) => (
                  <option key={project.folder} value={project.folder}>{project.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-slate-400 font-mono text-[10px]">
                {t("Tag de Execução (-i / --include):", "Execution Tag (-i / --include):")}
              </label>
              <button
                type="button"
                onClick={() => {
                  void refreshExecutionTagsFromRobotSample().then(() => setIsTagModalOpen(true));
                }}
                data-testid="terminal-configure-tag-button"
                className="text-[10px] text-[#FF6600] border border-[#FF6600]/30 hover:border-[#FF6600]/60 hover:bg-[#FF6600]/10 px-2 py-0.5 rounded flex items-center gap-1 font-mono transition-all font-bold"
              >
                <Settings className="w-3.5 h-3.5" />
                {t("Configurar tag", "Configure tag")}
              </button>
            </div>
            <select 
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              data-testid="terminal-execution-tag-select"
              className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-slate-200"
            >
              {tagsForSelectedProject.map(tag => (
                <option key={tag.value} value={tag.value}>{tag.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-mono text-[10px] mb-1">
              {t("Arquivo de Configuração (-A):", "Configuration File (-A):")}
            </label>
            <input 
              type="text" 
              value={argsFile}
              onChange={(e) => setArgsFile(e.target.value)}
              data-testid="terminal-args-file-input"
              className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-slate-200"
            />
          </div>

          {/* Live Preview Command */}
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-slate-400" data-testid="terminal-compiled-command">
            <span className="text-[#FF6600] block uppercase tracking-wider font-extrabold text-[9px] mb-1">
              {t("Comando Final Compilado:", "Final Compiled Command:")}
            </span>
            <span className="break-all">{getCompiledCommand()}</span>
          </div>
        </div>
      </div>

      {/* Gherkin Workspace */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="terminal-workspace-panel"
        className={`bg-slate-950/80 border rounded-xl p-4 flex-1 flex flex-col gap-3 min-h-[350px] relative transition-all duration-200 ${
          isDraggingFile ? 'border-[#FF6600] bg-slate-900/60 shadow-lg shadow-[#FF6600]/10' : 'border-slate-800'
        }`}
      >
        <input 
          type="file" 
          id="terminal-file-input"
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".feature,.txt,.robot" 
          data-testid="terminal-file-input"
          className="hidden" 
        />

        {isDraggingFile && (
          <div className="absolute inset-0 bg-slate-950/90 border-2 border-dashed border-[#FF6600] rounded-xl flex flex-col items-center justify-center gap-2.5 z-30 p-6 pointer-events-none animate-fade-in">
            <Upload className="w-12 h-12 text-[#FF6600] animate-bounce" />
            <p className="text-sm font-extrabold text-slate-100 tracking-tight uppercase">Solte o Arquivo de Teste aqui</p>
            <p className="text-[11px] text-slate-400 font-mono">Suporta formatos .feature, .robot ou .txt</p>
          </div>
        )}

        <div className="flex justify-between items-center pb-2 border-b border-[#1e293b] relative z-10 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
              {t("Workspace .feature", "Workspace .feature")}
            </h3>
          </div>
          
          {!isEditingGherkin ? (
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                data-testid="terminal-import-file-button"
                className="text-[10px] bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-[#1e293b] hover:border-slate-700 text-slate-300 transition-all font-mono flex items-center gap-1 font-bold"
                title={t("Selecione um arquivo Gherkin/Robot do seu computador", "Select Gherkin/Robot file from your computer")}
              >
                <Upload className="w-3.5 h-3.5 text-[#FF6600]" />
                {t("Importar File", "Import File")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setGherkinTempText(gherkinContent);
                  setIsEditingGherkin(true);
                }}
                data-testid="terminal-edit-gherkin-button"
                className="text-[10px] bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300 transition-all font-mono flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5 text-sky-400" />
                {t("Editar Gherkin", "Edit Gherkin")}
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentWorkspaceAsCases}
                data-testid="terminal-store-tests-button"
                className="text-[10px] bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-amber-800/60 hover:border-amber-700 text-amber-400 transition-all font-mono flex items-center gap-1 font-bold"
                title={t("Armazenar todos os cenários individuais como casos de teste no TMS", "Store all individual scenarios as test cases in TMS")}
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                {t("Armazenar Testes", "Store Tests")}
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleSaveGherkin}
                data-testid="terminal-save-gherkin-button"
                className="text-[10px] bg-emerald-950 hover:bg-emerald-900 px-2.5 py-1 rounded border border-emerald-800 text-emerald-400 font-bold transition-all"
              >
                {t("Salvar", "Save")}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingGherkin(false)}
                data-testid="terminal-cancel-gherkin-button"
                className="text-[10px] bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-400 transition-all"
              >
                {t("Cancelar", "Cancel")}
              </button>
            </div>
          )}
        </div>

        {/* View Mode Toggle Tabs */}
        {!isEditingGherkin && (
          <div className="flex border-b border-[#1e293b] text-[10px] font-mono gap-1 pb-1.5">
            <button
              type="button"
              onClick={() => setWorkspaceTab('scenarios')}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                workspaceTab === 'scenarios'
                  ? 'bg-[#FF6600]/15 text-[#FF6600] border border-[#FF6600]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(`Cenários (${parsedFeature.scenarios.length})`, `Scenarios (${parsedFeature.scenarios.length})`)}
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('raw')}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                workspaceTab === 'raw'
                  ? 'bg-[#FF6600]/15 text-[#FF6600] border border-[#FF6600]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t("Código Fonte", "Raw Source")}
            </button>
          </div>
        )}

        {isEditingGherkin ? (
          <textarea
            value={gherkinTempText}
            onChange={(e) => setGherkinTempText(e.target.value)}
            data-testid="terminal-gherkin-editor"
            className="w-full flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-[#FF6600] resize-none leading-relaxed"
          />
        ) : workspaceTab === 'scenarios' ? (
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-thin">
            {/* Header info matching screenshot */}
            <div className="flex flex-col gap-1 text-xs font-mono pb-1 border-b border-[#1e293b]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                {t("ESPECIFICAÇÃO DO NEGÓCIO", "BUSINESS SPECIFICATION")}
              </span>
              <h3 className="text-sm font-extrabold text-slate-100">
                {parsedFeature.title}
              </h3>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                {t(`CENÁRIOS MAPEADOS PELO PARSER (${parsedFeature.scenarios.length})`, `SCENARIOS MAPPED BY PARSER (${parsedFeature.scenarios.length})`)}
              </span>
            </div>

            {/* Scenario Cards */}
            {parsedFeature.scenarios.map((sc) => {
              const status = scenarioStatuses[sc.id] || 'Not executed';
              const primaryTag = sc.tags[0] ? sc.tags[0].replace(/^@/, '') : sc.id;
              const isSelected = selectedScenarioId === sc.id;

              let statusText = 'NÃO INICIADO';
              if (status === 'PASS' || status === 'Passed') statusText = 'PASS';
              else if (status === 'FAIL' || status === 'Failed') statusText = 'FAIL';
              else if (status === 'SKIP' || status === 'Skipped') statusText = 'SKIP';

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(selectedScenarioId === sc.id ? null : sc.id)}
                  data-testid={`terminal-scenario-card-${sc.id}`}
                  className={`bg-slate-900 border rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer ${
                    isSelected ? 'border-[#FF6600] ring-1 ring-[#FF6600]/30 shadow-lg shadow-[#FF6600]/5' : 'border-[#1e293b] hover:border-slate-700'
                  }`}
                >
                  {/* Top card metadata row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#FF6600] font-mono text-xs font-bold">
                      {sc.id}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {primaryTag && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700/60 font-bold">
                          {primaryTag}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700/60 capitalize">
                        {sc.type}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase border border-slate-700/60">
                        {statusText}
                      </span>
                    </div>
                  </div>

                  {/* Scenario Title */}
                  <h4 className="font-bold text-xs text-slate-100 leading-snug">
                    {sc.title}
                  </h4>

                  {/* Expanded BDD Content: Documentation box & Steps list (rendered only when card is clicked/selected) */}
                  {isSelected && (
                    <>
                      {sc.documentation && (
                        <div className="bg-slate-950/90 border border-[#1e293b] rounded-lg p-3 my-1 flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6600]">
                            DOCUMENTAÇÃO
                          </span>
                          <p className="text-slate-300 italic text-xs leading-relaxed font-sans">
                            {sc.documentation}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5 font-mono text-xs my-1 text-slate-300">
                        {sc.steps.map((st, sIdx) => {
                          const keyword = st.rawType || (
                            st.type === 'GIVEN' ? 'Given' :
                            st.type === 'WHEN' ? 'When' :
                            st.type === 'THEN' ? 'Then' : 'And'
                          );

                          return (
                            <div key={sIdx} className="flex items-start gap-1.5">
                              <span className="font-bold text-[#FF6600] shrink-0 font-mono">
                                {keyword}
                              </span>
                              <span className="text-slate-300 font-medium leading-relaxed">
                                {st.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Footer row with tag and EXECUÇÃO button */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1e293b] mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span>Tag:</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-[#1e293b] font-bold">
                        {primaryTag}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunFeatureReal(primaryTag);
                      }}
                      data-testid={`workspace-run-scenario-${sc.id}`}
                      className="bg-[#FF6600] hover:bg-[#e05500] text-white px-3.5 py-1.5 rounded-lg text-xs font-black font-mono transition-all flex items-center gap-1.5 shadow-md shadow-[#FF6600]/20 uppercase tracking-wider"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      EXECUÇÃO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 bg-slate-900 border border-[#1e293b] rounded-lg p-3 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap select-text scrollbar-thin">
            {gherkinContent}
          </div>
        )}

        {/* Automatic Validation Footer */}
        {!isEditingGherkin && (
          <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-[#1e293b] text-slate-400">
            <span>{t("Validação Automática", "Automated Validation")}</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {t("Sintaxe Gherkin Válida", "Valid Gherkin Syntax")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
