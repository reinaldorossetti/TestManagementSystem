/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ExecutionReports Component - Implements the interactive Allure 3 Dashboard replica.
 * When clicking "Detalhar", transitions into a dedicated standalone QA Report view
 * styled in the project's slate & orange theme, rendering Gherkin/BDD test trees,
 * metrics, and relational SQL records.
 */

import React, { useState } from 'react';
import { DbExecution, VirtualDatabase, DbTestCase, DbStepLog } from '../utils/sqliteEngine';
import { createTranslator } from '../utils/i18n';
import { 
  Calendar, 
  Clock, 
  Check, 
  Search, 
  LayoutGrid, 
  List, 
  Trash2, 
  Eye, 
  Award, 
  AlertCircle, 
  Activity, 
  Bug, 
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  PlayCircle,
  FolderTree,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  RotateCcw,
  Settings,
  Globe,
  Terminal,
  Copy,
  Info
} from 'lucide-react';

interface ExecutionReportsProps {
  sqliteDb: VirtualDatabase;
  onClearHistory?: () => void;
  onRunFeature?: () => void;
  language?: 'PT' | 'ENG';
  onChangeLanguage?: (lang: 'PT' | 'ENG') => void;
}

export function ExecutionReports({ sqliteDb, onClearHistory, onRunFeature, language = 'PT', onChangeLanguage }: ExecutionReportsProps) {
  const t = createTranslator(language);

  // General states
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  
  // Outstanding Allure 3 sub-page tracking state
  const [detailedExecId, setDetailedExecId] = useState<string | null>(null);

  // Allure 3 Internal Tab state
  const [activeSubTab, setActiveSubTab] = useState<'results' | 'categories' | 'metadata' | 'history'>('results');
  // Allure 3 Filter states inside the active report
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [testStatusFilter, setTestStatusFilter] = useState<'TOTAL' | 'PASSED' | 'FAILED' | 'SKIPPED'>('TOTAL');
  const [sortBy, setSortBy] = useState<'earliest' | 'duration' | 'name'>('earliest');

  // Collapsible accordion states inside Allure 3 Dashboard
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedTestCases, setExpandedTestCases] = useState<Record<string, boolean>>({});
  
  // Toast notifications or clipboard copy indicators
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Helper: Format duration with proper time-units
  const formatDuration = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = Math.round(seconds % 60);
    return `${minutes}m ${remainingSecs}s`;
  };

  // Helper: Format nice human dates based on language
  const formatTimestamp = (raw: string) => {
    try {
      const parts = raw.split(' ');
      if (parts.length < 2) return raw;
      const [datePart, timePart] = parts;
      const [year, month, day] = datePart.split('-');
      
      const monthNamesPT = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthNamesEN = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthNames = language === 'PT' ? monthNamesPT : monthNamesEN;
      
      const monthIndex = parseInt(month, 10) - 1;
      const cleanMonth = monthNames[monthIndex] || month;
      
      return language === 'PT' 
        ? `${day} de ${cleanMonth} de ${year} às ${timePart}`
        : `${cleanMonth} ${day}, ${year} at ${timePart}`;
    } catch (e) {
      return raw;
    }
  };

  // Filter root executions based on search and status
  const filteredExecutions = sqliteDb.executions.filter(exec => {
    const matchesSearch = 
      exec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.results_path.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'ALL' || 
      exec.status === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  const totalRuns = sqliteDb.executions.length;

  // Handler to toggle accordion group collapse
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Handler to toggle test case steps collapse
  const toggleTestCaseSteps = (testCaseId: string) => {
    setExpandedTestCases(prev => ({
      ...prev,
      [testCaseId]: !prev[testCaseId]
    }));
  };

  // Copy to clipboard simulation helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Render the Standalone Allure 3 Dashboard sub-page
  if (detailedExecId) {
    const exec = sqliteDb.executions.find(e => e.id === detailedExecId);
    
    // Fallback if execution is deleted
    if (!exec) {
      return (
        <div className="p-8 text-center text-slate-400 font-mono text-sm bg-slate-900 border border-slate-800 rounded-xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="font-bold text-slate-200">{t("Relatório não encontrado", "Report not found")}</p>
          <p className="text-xs text-slate-500 mt-1">{t("Este registro foi removido ou reiniciado do SQLite local.", "This record was removed or restarted from local SQLite.")}</p>
          <button 
            onClick={() => setDetailedExecId(null)}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition-all"
          >
            {t("Voltar ao Histórico", "Back to History")}
          </button>
        </div>
      );
    }

    // Get linked test cases & steps
    const linkedTestCases = sqliteDb.test_cases.filter(tc => tc.execution_id === detailedExecId);
    
    // Parse target name/command for header
    let targetSpec = t('Suite Completa: cardmais.feature', 'Full Suite: cardmais.feature');
    if (exec.command.includes('-i ')) {
      const tagPart = exec.command.split('-i ')[1]?.split(' ')[0] || '';
      if (tagPart) targetSpec = `Feature: ${tagPart}`;
    } else if (exec.command.includes('--include ')) {
      const tagPart = exec.command.split('--include ')[1]?.split(' ')[0] || '';
      if (tagPart) targetSpec = `${t('Cenário Único', 'Single Scenario')}: @${tagPart}`;
    }

    const totalTests = exec.total_tests;
    const passedTestsCount = exec.passed;
    const failedTestsCount = exec.failed;
    const skippedTestsCount = Math.max(0, totalTests - passedTestsCount - failedTestsCount);

    const successPct = totalTests > 0 ? (passedTestsCount / totalTests) * 100 : 0;
    const failedPct = totalTests > 0 ? (failedTestsCount / totalTests) * 100 : 0;
    const skippedPct = totalTests > 0 ? (skippedTestsCount / totalTests) * 100 : 0;

    // conic gradient coloring reflecting Allure style
    // Passed (Green: #10B981), Failed (Red: #EF4444), Skipped/Broken (Amber: #F59E0B)
    const conicBackgroundStyle = {
      background: `conic-gradient(
        #10B981 0% ${successPct}%,
        #EF4444 ${successPct}% ${successPct + failedPct}%,
        #F59E0B ${successPct + failedPct}% 100%
      )`
    };

    // Filter test cases inside Allure 3 dashboard based on search & active status block tab
    const filteredCases = linkedTestCases.filter(tc => {
      const matchesSearch = tc.name.toLowerCase().includes(testSearchTerm.toLowerCase()) || 
                            tc.id.toLowerCase().includes(testSearchTerm.toLowerCase());
      
      if (testStatusFilter === 'PASSED') return matchesSearch && tc.status === 'PASS';
      if (testStatusFilter === 'FAILED') return matchesSearch && tc.status === 'FAIL';
      if (testStatusFilter === 'SKIPPED') return matchesSearch && tc.status === 'SKIP';
      return matchesSearch;
    });

    // Sort test cases
    const sortedCases = [...filteredCases].sort((a, b) => {
      if (sortBy === 'duration') return b.duration_s - a.duration_s;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.id.localeCompare(b.id); // Default / earliest numeric order
    });

    // Grouping by category
    const categoriesMap: Record<string, DbTestCase[]> = {};
    sortedCases.forEach(tc => {
      const cat = tc.category || t('Geral', 'General');
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = [];
      }
      categoriesMap[cat].push(tc);
    });

    const uniqueCategories = Object.keys(categoriesMap);

    return (
      <div className="flex-1 flex flex-col min-h-0 text-left bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden select-none shadow-2xl animate-fadeIn">
        
        {/* ALLURE INTERACTIVE MAIN NAVBAR */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          {/* Breadcrumbs matching Allure Header style */}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="text-[#FF6600] font-bold uppercase hover:underline cursor-pointer" onClick={() => setDetailedExecId(null)}>
              {t("Centro TMS", "TMS Center")}
            </span>
            <span className="text-slate-650">/</span>
            <span className="bg-slate-950 border border-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              report #{exec.id}
            </span>
          </div>

          {/* Settings & Tool Controls bar */}
          <div className="flex flex-wrap items-center gap-3.5 text-xs font-mono">
            {/* CI Environment Badge Dropdown simulation */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-350 shrink-0">
              <span className="text-[10px] text-slate-500 font-bold">Environment:</span>
              <span className="font-bold text-slate-100">ubuntu-latest</span>
              <span className="text-slate-600">▾</span>
            </div>

            {/* Language Selection */}
            <button 
              type="button"
              onClick={() => onChangeLanguage?.(language === 'PT' ? 'ENG' : 'PT')}
              className="flex items-center gap-1.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 px-2.5 py-1 rounded-lg text-sky-400 transition-all cursor-pointer font-bold shadow-sm"
              title={t("Alterar idioma", "Change language")}
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-[10px] text-slate-350 font-bold block uppercase">{language === 'PT' ? 'PT 🇧🇷' : 'EN 🇺🇸'}</span>
            </button>

            {/* Settings Button */}
            <button className="p-1 px-2 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-[#FF6600] transition-colors" title="Settings Config">
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* VOLTAR BUTTON */}
            <button 
              onClick={() => setDetailedExecId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-105 hover:text-[#FF6600] border border-slate-700 rounded-lg transition-all font-sans font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Sair do Detalhes", "Exit Details")}
            </button>
          </div>

        </div>

        {/* DETAILS SCROLL BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-950/30 scrollbar-thin">
          
          {/* CORE GRAPHICAL ALLURE SUMMARY CARD */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
            {/* Title Block */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start items-center gap-2 mb-1.5">
                {exec.status === 'FAIL' ? (
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black rounded uppercase">
                    CRITICAL FAILED RUN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded uppercase">
                    100% VERIFIED PASS
                  </span>
                )}
              </div>
              
              <h1 className="font-extrabold text-2xl text-white tracking-tight uppercase">
                {targetSpec}
              </h1>

              <p className="text-xs text-slate-400 mt-2 flex items-center justify-center md:justify-start gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-[#FF6600]" />
                {formatTimestamp(exec.timestamp)}
              </p>
              
              <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 max-w-xl font-mono text-[10.5px] text-slate-500 select-all cursor-text text-left">
                <span className="text-[#FF6600] font-bold">{t("Comando Robot:", "Robot Command:")}</span> <span className="text-slate-350">{exec.command}</span>
              </div>
            </div>

            {/* Giant Success Rate Donut matching the provided image */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-36 h-36 rounded-full flex items-center justify-center relative p-3 shadow-lg border border-slate-800 hover:scale-105 transition-transform" style={conicBackgroundStyle}>
                <div className="absolute inset-2 bg-slate-900 rounded-full flex flex-col items-center justify-center select-none font-mono">
                  <span className="text-3xl font-black text-slate-100 tracking-tighter">
                    {successPct.toFixed(1)}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block mt-0.5">
                    {t("SUCESSO", "SUCCESS")}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-sans text-slate-500 text-center font-bold">
                {t("PROPORÇÃO DE CASOS DE TESTE", "PROPORTION OF TEST CASES")}
              </span>
            </div>
          </div>

          {/* SUB-TABS NAVIGATION (RESULTS, CATEGORIES, XML, HISTORY) */}
          <div className="border-b border-slate-800 flex flex-wrap gap-2 text-xs font-mono">
            <button 
              onClick={() => setActiveSubTab('results')}
              className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'results' ? 'border-[#FF6600] text-[#FF6600] font-black' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t("Resultados de Sucesso", "Successful Results")} ({totalTests})
            </button>
            <button 
              onClick={() => setActiveSubTab('categories')}
              className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'categories' ? 'border-[#FF6600] text-[#FF6600] font-black' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              {t("Categorias Ativas", "Active Categories")} ({uniqueCategories.length})
            </button>
            <button 
              onClick={() => setActiveSubTab('metadata')}
              className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'metadata' ? 'border-[#FF6600] text-[#FF6600] font-black' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              {t("Metadados CI / XML", "CI Metadata / XML")}
            </button>
            <button 
              onClick={() => setActiveSubTab('history')}
              className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'history' ? 'border-[#FF6600] text-[#FF6600] font-black' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              {t("Histórico Relacional Run", "Relational Run History")}
            </button>
          </div>

          {/* MAIN RESULTS SUB-TAB CONTENT */}
          {activeSubTab === 'results' && (
            <div className="space-y-6">
              
              {/* METRICS BANNER STRIP */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                
                {/* Total Column */}
                <div className="flex items-center gap-4 text-left border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 md:pr-8">
                  <div className="font-mono">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">{t("Total de Testes", "Total Tests")}</span>
                    <span className="text-3xl font-black text-slate-100">{totalTests}</span>
                  </div>
                  <div className="flex h-10 items-center justify-center bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-400 font-mono text-[10px]">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF6600] mr-1.5 animate-pulse" />
                    {t("Novos em Tela:", "New on Screen:")} <span className="text-[#FF6600] font-extrabold ml-1">+{totalTests}</span>
                  </div>
                </div>

                {/* Grid of Results Badges inside Metrics Banner */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                  {/* Failed */}
                  <div className="bg-slate-950/50 p-2.5 border-l-4 border-rose-500 rounded-r-lg text-left">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Failed</span>
                    <span className={`text-lg font-black ${failedTestsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{failedTestsCount}</span>
                  </div>

                  {/* Broken (Simulated as Skip) */}
                  <div className="bg-slate-950/50 p-2.5 border-l-4 border-[#F59E0B] rounded-r-lg text-left">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Broken</span>
                    <span className="text-lg font-black text-slate-400">0</span>
                  </div>

                  {/* Passed */}
                  <div className="bg-slate-950/50 p-2.5 border-l-4 border-emerald-500 rounded-r-lg text-left">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Passed</span>
                    <span className={`text-lg font-black ${passedTestsCount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{passedTestsCount}</span>
                  </div>

                  {/* Skipped */}
                  <div className="bg-slate-950/50 p-2.5 border-l-4 border-indigo-500 rounded-r-lg text-left">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Skipped</span>
                    <span className={`text-lg font-black ${skippedTestsCount > 0 ? 'text-[#FF6600]' : 'text-slate-400'}`}>{skippedTestsCount}</span>
                  </div>
                </div>

              </div>

              {/* INTERACTIVE FILTERS ROW */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                
                {/* Search Bar inside report */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder={t("Filtrar cenários por título, id...", "Filter scenarios by title, id...")}
                    value={testSearchTerm}
                    onChange={(e) => setTestSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6600]"
                  />
                  {testSearchTerm && (
                    <button 
                      onClick={() => setTestSearchTerm('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
                    >
                      {t("Limpar", "Clear")}
                    </button>
                  )}
                </div>

                {/* Sub-Filters Pill Controls */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {/* Total pill */}
                  <button 
                    onClick={() => setTestStatusFilter('TOTAL')}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${testStatusFilter === 'TOTAL' ? 'bg-slate-805 border-slate-700 text-white font-black' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                  >
                    Total {totalTests}
                  </button>

                  {/* Failed pill */}
                  <button 
                    onClick={() => setTestStatusFilter('FAILED')}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${testStatusFilter === 'FAILED' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-black' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                  >
                    Failed {failedTestsCount}
                  </button>

                  {/* Passed pill */}
                  <button 
                    onClick={() => setTestStatusFilter('PASSED')}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${testStatusFilter === 'PASSED' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-black' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                  >
                    Passed {passedTestsCount}
                  </button>

                  {/* Skipped pill */}
                  <button 
                    onClick={() => setTestStatusFilter('SKIPPED')}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${testStatusFilter === 'SKIPPED' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-black' : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:text-white'}`}
                  >
                    Skipped {skippedTestsCount}
                  </button>

                  <span className="text-slate-800 font-bold mx-1">|</span>

                  {/* Sort Selection */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-450 font-sans">
                    <span className="font-mono text-slate-500">{t("Classificar por:", "Sort by:")}</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'earliest' | 'duration' | 'name')}
                      className="bg-slate-950 text-slate-200 border border-slate-850 rounded px-2 py-1 font-mono text-[11px] focus:outline-none focus:border-[#FF6600]"
                    >
                      <option value="earliest">{t("Nativo (Id)", "Native (Id)")}</option>
                      <option value="duration">{t("Duração de Run", "Run Duration")}</option>
                      <option value="name">{t("Alfabético", "Alphabetical")}</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* THE MULTI-COLLAPSIBLE TEST TREE */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-5">
                <div className="flex items-center gap-2 mb-4 font-mono select-none">
                  <FolderTree className="text-[#FF6600] w-4 h-4" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-350">
                    {t("Sintaxe Workspace Gherkin:", "Gherkin Workspace Syntax:")} <span className="text-slate-450 font-bold">cardmais.feature</span>
                  </span>
                </div>

                {filteredCases.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-lg">
                    <Info className="w-5 h-5 mx-auto text-slate-650 mb-1.5" />
                    {t("Sem resultados para os filtros selecionados", "No results for the selected filters")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Collapsible Root Folder: Environment "ubuntu-latest" */}
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                      
                      {/* Folder header */}
                      <div 
                        onClick={() => toggleGroup('root')}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900 transition-all font-mono select-none"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-205">
                          {expandedGroups['root'] !== false ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <FolderTree className="w-4 h-4 text-[#FF6500]" />
                          <span>Environment: "ubuntu-latest"</span>
                        </div>

                        {/* Segmented status bar in the folder row */}
                        <div className="flex items-center gap-4 text-xs font-mono text-right shrink-0">
                          <span className="text-[10px] text-slate-500">{filteredCases.length} {t("testes", "tests")}</span>
                          <div className="flex h-2.5 rounded-full overflow-hidden w-24 bg-slate-850">
                            {passedTestsCount > 0 && (
                              <div style={{ width: `${(passedTestsCount / totalTests) * 100}%` }} className="bg-emerald-500 h-full" title="Passed" />
                            )}
                            {failedTestsCount > 0 && (
                              <div style={{ width: `${(failedTestsCount / totalTests) * 100}%` }} className="bg-rose-500 h-full" title="Failed" />
                            )}
                            {skippedTestsCount > 0 && (
                              <div style={{ width: `${(skippedTestsCount / totalTests) * 100}%` }} className="bg-amber-500 h-full" title="Skipped" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Folder Children (The grouped categories of test cases) */}
                      {expandedGroups['root'] !== false && (
                        <div className="p-4 border-t border-slate-850 space-y-4 bg-slate-950/30 text-left">
                          
                          {uniqueCategories.map(categoryName => {
                            const casesInCategory = categoriesMap[categoryName];
                            const isGroupOpen = expandedGroups[categoryName] !== false; // defaulted to open
                            
                            const catPass = casesInCategory.filter(c => c.status === 'PASS').length;
                            const catFail = casesInCategory.filter(c => c.status === 'FAIL').length;
                            const catSkip = casesInCategory.filter(c => c.status === 'SKIP').length;
                            const catTotal = casesInCategory.length;

                            return (
                              <div key={categoryName} className="border border-slate-850 rounded-lg overflow-hidden bg-slate-900 text-left">
                                
                                {/* Inner folder title header */}
                                <div 
                                  onClick={() => toggleGroup(categoryName)}
                                  className="flex items-center justify-between p-3 cursor-pointer bg-slate-900/80 hover:bg-slate-800/60 transition-colors font-mono font-bold select-none text-[11px]"
                                >
                                  <div className="flex items-center gap-2 text-slate-300">
                                    {isGroupOpen ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <span className="text-[#FF6600] font-black tracking-wider">[{categoryName}]</span>
                                  </div>

                                  {/* Right segment summary of Category tests */}
                                  <div className="flex items-center gap-3 font-semibold text-[10.5px]">
                                    <span className="text-slate-550">{catTotal} {t("cenários", "scenarios")}</span>
                                    {/* Segmented status dots */}
                                    <div className="flex gap-2 text-[10px] items-center">
                                      {catPass > 0 && <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-bold" title="Passed">{catPass} ✔</span>}
                                      {catFail > 0 && <span className="text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded font-bold" title="Failed">{catFail} ✖</span>}
                                      {catSkip > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded font-bold" title="Skipped">{catSkip} ⤼</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* List of Test cases inside this category */}
                                {isGroupOpen && (
                                  <div className="divide-y divide-slate-850 bg-slate-950/40 text-left text-xs font-mono">
                                    {casesInCategory.map(tc => {
                                      const isStepsExpanded = expandedTestCases[tc.id];
                                      
                                      // Get step logs for this test case
                                      const stepsForCase = sqliteDb.steps.filter(st => st.test_case_id === tc.id);

                                      return (
                                        <div key={tc.id} className="p-3 hover:bg-slate-900/30 transition-colors">
                                          
                                          {/* Main case info row */}
                                          <div className="flex items-center justify-between gap-4">
                                            
                                            <div 
                                              onClick={() => toggleTestCaseSteps(tc.id)}
                                              className="flex-1 flex items-center gap-2.5 cursor-pointer text-left"
                                            >
                                              {/* Checkbox icon representation */}
                                              {tc.status === 'PASS' && (
                                                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                  ✔
                                                </span>
                                              )}
                                              {tc.status === 'FAIL' && (
                                                <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 animate-pulse">
                                                  ✖
                                                </span>
                                              )}
                                              {tc.status === 'SKIP' && (
                                                <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                  ⤼
                                                </span>
                                              )}

                                              {/* Test title */}
                                              <div className="flex flex-col text-left">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[9.5px] bg-slate-900 border border-slate-800 text-slate-500 py-0.2 px-1.5 rounded uppercase">
                                                    {tc.id}
                                                  </span>
                                                  <span className="text-[10px] text-slate-600 block">
                                                    (BDD scenario)
                                                  </span>
                                                </div>
                                                <h4 className="font-bold text-slate-201 mt-1 leading-normal text-[11.5px]">
                                                  {tc.name}
                                                </h4>
                                              </div>
                                            </div>

                                            {/* Expand and duration on the right */}
                                            <div className="flex items-center gap-3 shrink-0 select-none">
                                              <span className="text-[10.5px] text-slate-500">
                                                {formatDuration(tc.duration_s)}
                                              </span>
                                              <button 
                                                onClick={() => toggleTestCaseSteps(tc.id)}
                                                className={`p-1 bg-slate-900 hover:bg-slate-850 hover:border-slate-750 border border-slate-800 rounded transition-all flex items-center gap-1 text-[9.5px] font-bold uppercase ${isStepsExpanded ? 'text-[#FF6600]' : 'text-slate-450'}`}
                                              >
                                                {isStepsExpanded ? t('FECHAR PASSOS', 'CLOSE STEPS') : t('VER PASSOS', 'VIEW STEPS')}
                                                {isStepsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#FF6600]" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                              </button>
                                            </div>

                                          </div>

                                          {/* ACCORDION EXPANSION OF GHERKIN / BDD STEP LOGS */}
                                          {isStepsExpanded && (
                                            <div className="mt-3 ml-7 pl-4.5 border-l-2 border-[#FF6600]/30 space-y-2.5 pt-2 pb-1 animate-slideDown text-left text-xs font-mono">
                                              
                                              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1 border-b border-slate-900 pb-1">
                                                Test Step Execution Tracer (Virtual SQLite Logs)
                                              </div>

                                              {stepsForCase.length === 0 ? (
                                                <div className="text-slate-550 text-[10.5px] py-1">
                                                  {t("Nenhum passo de Gherkin encontrado na tabela SQLite 'steps'.", "No Gherkin steps found in SQL 'steps' table.")}
                                                </div>
                                              ) : (
                                                stepsForCase.map((step, sIdx) => {
                                                  // Keyword color mapping
                                                  let keyBadgeClass = 'text-sky-400 bg-sky-500/10'; // Given
                                                  if (step.step_type === 'WHEN') keyBadgeClass = 'text-amber-400 bg-amber-500/10';
                                                  if (step.step_type === 'THEN') keyBadgeClass = 'text-emerald-400 bg-emerald-500/10';
                                                  if (step.step_type === 'AND') keyBadgeClass = 'text-slate-400 bg-slate-800';

                                                  return (
                                                    <div 
                                                      key={step.id || `step-${sIdx}`} 
                                                      className="flex items-center justify-between gap-4 p-1.5 bg-slate-950/40 rounded border border-slate-900/60 hover:bg-slate-950/80 transition-colors text-left"
                                                    >
                                                      <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                                                        {/* Step checklist circle indicator */}
                                                        {step.status === 'PASS' && (
                                                          <span className="text-emerald-400 font-black mr-0.5" title="Passado">✔</span>
                                                        )}
                                                        {step.status === 'FAIL' && (
                                                          <span className="text-rose-400 font-black mr-0.5" title="Falhado">✖</span>
                                                        )}
                                                        {step.status === 'SKIP' && (
                                                          <span className="text-amber-400 font-black mr-0.5" title="Pulado">⤼</span>
                                                        )}

                                                        <span className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase tracking-wider shrink-0 mt-0.5 ${keyBadgeClass}`}>
                                                          {step.step_type}
                                                        </span>
                                                        
                                                        <span className="text-slate-205 text-left font-serif max-w-lg">
                                                          "{step.text}"
                                                        </span>
                                                      </div>

                                                      {/* Simulated step timing */}
                                                      <span className="text-[10px] text-slate-510 font-bold">
                                                        {step.status === 'SKIP' ? 'SKIP' : step.status === 'FAIL' ? 'FAIL' : '65ms'}
                                                      </span>
                                                    </div>
                                                  );
                                                })
                                              )}

                                            </div>
                                          )}

                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                              </div>
                            );
                          })}

                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* CATEGORIES SUB-TAB CONTENT */}
          {activeSubTab === 'categories' && (
            <div className="bg-slate-900 border border-slate-805 rounded-xl p-6 space-y-6">
              <div className="text-left select-none">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                  {t("Resumo Geral de Categorias e Casos de Teste do Robot Framework Gherkin", "General Summary of Robot Framework Gherkin Categories and Test Cases")}
                </h3>
                <p className="text-xs text-slate-450 font-mono mt-1 leading-normal">
                  {t("Gráficos e porcentagens dinâmicas para verificação rápida de regressão.", "Dynamic charts and percentages for quick regression verification.")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uniqueCategories.map(cat => {
                  const items = categoriesMap[cat];
                  const total = items.length;
                  const passed = items.filter(i => i.status === 'PASS').length;
                  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

                  return (
                    <div key={cat} className="bg-slate-950 p-5 border border-slate-805 rounded-xl flex flex-col justify-between gap-4 text-left font-mono text-xs">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-[#FF6600] uppercase">[{cat}]</span>
                          <span className="font-bold text-slate-350">{passed} / {total} PASS</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-203">Duração agregada: {formatDuration(items.reduce((acc, i) => acc + i.duration_s, 0))}</h4>
                      </div>

                      {/* Percentage gauge segment */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>{t("ÍNDICE DE SUCESSO", "SUCCESS RATE")}</span>
                          <span>{score}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                          <div style={{ width: `${score}%` }} className={`h-full ${score === 100 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* METADADOS/XML CI SUB-TAB CONTENT (Technical XML report viewing inside Allure Portal) */}
          {activeSubTab === 'metadata' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              
              <div className="text-left">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                  {t("Diretório %ROBOT_HOME%/results/ Relatório Físico XML", "Directory %ROBOT_HOME%/results/ Physical XML Report")}
                </h3>
                <p className="text-xs text-slate-450 font-mono mt-1 leading-normal">
                  {t("Representações de integração para webhook DevOps e logs de depuração.", "Integration representations for DevOps webhook and debugging logs.")}
                </p>
              </div>

              {/* Path and Actions Bar */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 font-mono text-xs">
                <div className="text-left">
                  <span className="text-[10px] text-[#FF6600] font-bold block uppercase mb-0.5">results_path em SQLite:</span>
                  <span className="text-slate-300 font-bold select-text break-all">{exec.results_path}</span>
                </div>
                <button 
                  onClick={() => handleCopy(exec.results_path)}
                  className="px-3.5 py-1.8 bg-slate-900 hover:bg-slate-800 text-xs font-bold font-sans border border-slate-750 text-slate-105 hover:text-white rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Copy className="w-4.5 h-4.5 text-slate-450" />
                  {copiedPath === exec.results_path ? t('Copiado!', 'Copied!') : t('Copiar Caminho', 'Copy Path')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Simulated output.xml block */}
                <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-amber-400 uppercase font-black">🤖 Generated output.xml</span>
                    <span className="text-slate-500 font-semibold">1.2 KB</span>
                  </div>
                  
                  <pre className="bg-slate-900 border border-slate-850 p-4 rounded-lg text-[10px] text-slate-500 max-h-56 overflow-y-auto overflow-x-hidden text-left font-mono scrollbar-thin select-text">
                    {`<?xml version="1.0" encoding="UTF-8"?>
<robot generator="Robot 6.1" schemaversion="4" generated="20260617 10:57:58">
  <suite id="S1" name="TMS BDD" source="/features/tms.feature">
    <test id="S1-T1" name="${linkedTestCases[0]?.name || 'Cenário BDD'}">
      <status status="${exec.status}" starttime="20260617 10:57:58" endtime="20260617 10:58:00"/>
    </test>
  </suite>
</robot>`}
                  </pre>
                </div>

                {/* Simulated report.html / log.html block */}
                <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl flex flex-col gap-3 text-left font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#FF6600] uppercase font-black animate-pulse">📰 Artefato: log.html</span>
                    <span className="text-slate-550 font-bold">{t("PRODUÇÃO PRONTA", "PRODUCTION READY")}</span>
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed font-sans">
                    {t("Você pode injetar este XML diretamente no painel Allure do Jenkins/GitLab CI ou baixar os relatórios de QA compactados.", "You can inject this XML directly into the Jenkins/GitLab CI Allure panel or download zipped QA reports.")}
                  </p>

                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg font-mono text-[10.5px] text-slate-500 break-all select-text">
                    <span className="text-emerald-400"># Log output directory localizer:</span> <br/>
                    %ROBOT_HOME%/results/output_logs_idx_{exec.id}.log
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* HISTÓRICO RELACIONAL SUB-TAB CONTENT */}
          {activeSubTab === 'history' && (
            <div className="bg-slate-900 border border-[#FF6600]/15 rounded-xl p-6 space-y-6">
              
              <div className="text-left">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-205 flex items-center gap-1.5">
                  <Terminal className="text-[#FF6600] w-4.5 h-4.5" />
                  {t("Logs de Persistência das Tabelas SQLite do Sandbox", "Sandbox SQLite Tables Persistence Logs")}
                </h3>
                <p className="text-xs text-slate-450 font-mono mt-1 leading-normal">
                  {t("Estas são as tuplas exatas armazenadas dinamicamente no seu navegador relacionadas a esta Run", "These are the exact tuples dynamically stored in your browser related to this Run")} #{exec.id}.
                </p>
              </div>

              {/* Live Tuples Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs text-left">
                
                {/* Executions row */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-[#FF6600] text-[10.5px] uppercase block mb-1">Tabela: executions</h5>
                    <div className="text-[10px] text-slate-500 mb-2">{t("1 tupla filtrada por id", "1 tuple filtered by id")}</div>
                    <div className="space-y-1 text-slate-350 text-[10.5px]">
                      <div>id: <span className="text-slate-100">"{exec.id}"</span></div>
                      <div>status: <span className={exec.status === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>"{exec.status}"</span></div>
                      <div>total_tests: <span className="text-slate-100">{exec.total_tests}</span></div>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-550 border-t border-slate-850 pt-2.5 mt-4">
                    PRIMARY KEY: id
                  </div>
                </div>

                {/* test_cases rows */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-[#FF6600] text-[10.5px] uppercase block mb-1">Tabela: test_cases</h5>
                    <div className="text-[10px] text-slate-500 mb-2">{linkedTestCases.length} {t("tuplas associadas", "associated tuples")}</div>
                    <div className="space-y-1 text-slate-350 text-[10.5px] max-h-40 overflow-y-auto pr-1">
                      {linkedTestCases.map((tc, idx) => (
                        <div key={idx} className="border-b border-slate-900 pb-1 mb-1">
                          <div>id: <span className="text-slate-205">"{tc.id}"</span></div>
                          <div className="truncate">name: <span className="text-slate-400 font-sans">"{tc.name}"</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-550 border-t border-slate-850 pt-2.5 mt-4">
                    FOREIGN KEY: execution_id
                  </div>
                </div>

                {/* steps rows */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-[#FF6600] text-[10.5px] uppercase block mb-1">Tabela: steps</h5>
                    {/* Gather cumulative count */}
                    <div className="text-[10px] text-slate-500 mb-2">
                      {linkedTestCases.reduce((acc, cc) => acc + sqliteDb.steps.filter(st => st.test_case_id === cc.id).length, 0)} {t("sub-logs vinculados", "linked sub-logs")}
                    </div>
                    <div className="space-y-1 text-slate-350 text-[10.5px] max-h-40 overflow-y-auto pr-1">
                      {linkedTestCases.flatMap(cc => sqliteDb.steps.filter(st => st.test_case_id === cc.id)).slice(0, 10).map((st, idx) => (
                        <div key={idx} className="border-b border-slate-910 pb-0.5 mb-0.5 truncate text-[10px]">
                          <span className="text-sky-400 font-bold">[{st.step_type}]</span> {st.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-550 border-t border-slate-850 pt-2.5 mt-4">
                    FOREIGN KEY: test_case_id
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* ALLURE INTERACTIVE FOOTER */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-3.5 flex justify-between items-center text-[10px] font-mono text-slate-500 select-none">
          <span>TMS Live Environment</span>
          <span>SQLite Virtual DB (Relational Engine Active)</span>
        </div>

      </div>
    );
  }

  // ELSE RENDER THE CORE HISTORY LIST PAGE (Cards / Table Mode)
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-6 animate-fadeIn">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        
        {/* Search and Filters */}
        <div className="flex flex-1 flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder={t("Buscar por ID, comando, tags...", "Search by ID, command, tags...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-1.5 pl-10 pr-4 text-xs text-slate-205 placeholder-slate-500 text-left focus:outline-none focus:border-[#FF6600]/50"
            />
          </div>

          <div className="flex bg-slate-950 border border-slate-804 rounded-lg p-1 text-xs font-mono">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded transition-all ${statusFilter === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              {t("Todos", "All")} ({totalRuns})
            </button>
            <button 
              onClick={() => setStatusFilter('PASS')}
              className={`px-3 py-1 rounded transition-all ${statusFilter === 'PASS' ? 'bg-emerald-500/20 text-emerald-405 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              PASS ({sqliteDb.executions.filter(e => e.status === 'PASS').length})
            </button>
            <button 
              onClick={() => setStatusFilter('FAIL')}
              className={`px-3 py-1 rounded transition-all ${statusFilter === 'FAIL' ? 'bg-rose-500/20 text-rose-405 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              FAIL ({sqliteDb.executions.filter(e => e.status === 'FAIL').length})
            </button>
          </div>
        </div>

        {/* View Mode & Actions Toggle */}
        <div className="flex gap-2.5 items-center shrink-0 font-mono">
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded transition-all ${viewMode === 'cards' ? 'bg-slate-800 text-[#FF6600]' : 'text-slate-400 hover:text-white'}`}
              title={t("Visualizar Cartões (Estilo Allure)", "View Cards (Allure Style)")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-slate-800 text-[#FF6600]' : 'text-slate-400 hover:text-white'}`}
              title={t("Visualizar Tabela de Registros", "View Records Table")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {onClearHistory && sqliteDb.executions.length > 3 && (
            <button 
              onClick={onClearHistory}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold text-slate-400 hover:text-rose-450 border border-slate-820 hover:border-rose-900 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("Limpar Histórico", "Clear History")}
            </button>
          )}
        </div>

      </div>

      {filteredExecutions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono text-center py-20 bg-slate-900 border border-slate-800 rounded-xl">
          <Activity className="w-12 h-12 text-[#FF6600]/30 animate-pulse mb-3" />
          <p className="text-sm font-bold text-slate-300">{t("Nenhum relatório encontrado", "No reports found")}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-normal">
            {t("Não foram encontradas execuções que correspondam à sua busca. Execute novos testes no console para ver o relatório gerado.", "No executions matching your search were found. Run new tests in the console to see the generated report.")}
          </p>
          {onRunFeature && (
            <button
              onClick={onRunFeature}
              className="mt-4 px-4 py-2 bg-[#FF6600] hover:bg-[#E05300] text-xs font-bold text-white rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-[#FF6600]/15"
            >
              <PlayCircle className="w-4 h-4" />
              {t("Executar Feature Completa Agora", "Run Full Feature Now")}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* CARDS MODE (ALLURE STYLE) */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
              {filteredExecutions.map((exec) => {
                // Compute parameters
                const total = exec.total_tests;
                const passed = exec.passed;
                const failed = exec.failed;
                const skipped = Math.max(0, total - passed - failed);
                const successPctValue = total > 0 ? Math.round((passed / total) * 100) : 0;

                // Simple conic background rate representation
                const cardConicStyle = {
                  background: `conic-gradient(
                    #10B981 0% ${successPctValue}%,
                    #EF4444 ${successPctValue}% ${successPctValue + (total > 0 ? (failed / total) * 100 : 0)}%,
                    #F59E0B 100%
                  )`
                };

                // Parse tag name or command title for card title
                let runName = t('Suite Completa: cardmais', 'Full Suite: cardmais');
                if (exec.command.includes('-i ')) {
                  const tagPart = exec.command.split('-i ')[1]?.split(' ')[0] || '';
                  if (tagPart) {
                    runName = `Feature: ${tagPart}`;
                  }
                } else if (exec.command.includes('--include ')) {
                  const tagPart = exec.command.split('--include ')[1]?.split(' ')[0] || '';
                  if (tagPart) {
                    runName = `${t('Cenário Único', 'Single Scenario')}: @${tagPart}`;
                  }
                }

                const isFailed = exec.status === 'FAIL';

                return (
                  <div 
                    key={exec.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-md hover:border-[#FF6600]/30 transition-all flex flex-col justify-between min-h-[240px] group relative text-left"
                  >
                    {/* Top Tag & Action View Details */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] text-[#FF6600] font-mono tracking-wider font-extrabold uppercase">
                          {exec.id} • ROBOT FRAMEWORK SESSION
                        </span>
                        <h3 className="font-extrabold text-base text-slate-100 uppercase tracking-tight mt-1 line-clamp-1">
                          {runName}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-1 text-left">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatTimestamp(exec.timestamp)}
                        </p>
                      </div>

                      <button 
                        onClick={() => setDetailedExecId(exec.id)}
                        className="p-2 bg-slate-950 hover:bg-[#FF6600] hover:text-white hover:border-[#FF6600] border border-slate-800 rounded-lg text-slate-350 transition-all text-[11px] font-mono font-bold flex items-center gap-1 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t("Detalhar", "View Details")}
                      </button>
                    </div>

                    {/* Badge status / duration */}
                    <div className="my-3.5 flex flex-wrap gap-2.5 items-center">
                      {isFailed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-405 border border-rose-500/20 uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-550" />
                          failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          passed
                        </span>
                      )}
                      <span className="text-xs text-slate-350 font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {t("em", "in")} {formatDuration(exec.duration_s)}
                      </span>
                    </div>

                    {/* Lower Metrics Content Row */}
                    <div className="flex items-center justify-between gap-6 pt-4 border-t border-slate-800/80">
                      
                      {/* Metric lines with small custom color indicators */}
                      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs font-mono">
                        {/* Total */}
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-3 bg-slate-500 inline-block rounded-sm" />
                            <span className="text-sm font-black text-slate-200">{total}</span>
                          </div>
                        </div>

                        {/* Failed */}
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Failed</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-3 bg-[#EF4444] inline-block rounded-sm" />
                            <span className={`text-sm font-black ${failed > 0 ? 'text-rose-405' : 'text-slate-400'}`}>{failed}</span>
                          </div>
                        </div>

                        {/* Broken/Skipped */}
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Skipped</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-3 bg-[#F59E0B] inline-block rounded-sm" />
                            <span className={`text-sm font-black ${skipped > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{skipped}</span>
                          </div>
                        </div>

                        {/* Passed */}
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Passed</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-3 bg-[#10B981] inline-block rounded-sm" />
                            <span className={`text-sm font-black ${passed > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{passed}</span>
                          </div>
                        </div>
                      </div>

                      {/* Donut percentage progress wheel */}
                      <div className="relative w-18 h-18 shrink-0 flex items-center justify-center bg-slate-950 rounded-full p-2 border border-slate-800" style={cardConicStyle}>
                        <div className="absolute inset-1.5 bg-slate-900 rounded-full flex flex-col items-center justify-center font-mono select-none">
                          <span className="text-xs font-black text-slate-100 leading-tight">
                            {successPctValue}%
                          </span>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE MODE */}
          {viewMode === 'table' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold select-none">
                      <th className="p-4 uppercase tracking-wider text-[10px] w-28 text-left">ID Run</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-left">{t("Alvo / Filtro", "Target / Filter")}</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-left w-48">{t("Início", "Start Time")}</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-center w-24">{t("Duração", "Duration")}</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-center w-28">Status</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-center w-40">{t("Métricas", "Metrics")}</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-center w-24">{t("Ações", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExecutions.map((exec) => {
                      const total = exec.total_tests;
                      const passed = exec.passed;
                      const failed = exec.failed;
                      const skipped = Math.max(0, total - passed - failed);
                      const isFailed = exec.status === 'FAIL';

                      let targetSpecValue = t('Suite Completa', 'Full Suite');
                      if (exec.command.includes('-i ')) {
                        targetSpecValue = `@${exec.command.split('-i ')[1]?.split(' ')[0] || ''}`;
                      } else if (exec.command.includes('--include ')) {
                        targetSpecValue = `@${exec.command.split('--include ')[1]?.split(' ')[0] || ''}`;
                      }

                      return (
                        <tr key={exec.id} className="border-b border-slate-800/60 hover:bg-slate-950/40 transition-colors">
                          <td className="p-4 text-slate-350 font-bold text-left">{exec.id}</td>
                          <td className="p-4 text-left">
                            <span className="text-[#FF6600] font-bold">{targetSpecValue}</span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-sm" title={exec.command}>
                              {exec.command}
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 font-medium text-left">
                            {exec.timestamp}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-300">
                            {formatDuration(exec.duration_s)}
                          </td>
                          <td className="p-4 text-center">
                            {isFailed ? (
                              <span className="inline-flex px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black text-[10px]">
                                FAIL
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[10px]">
                                PASS
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex gap-2 justify-center text-[10.5px] items-center">
                              <span className="text-emerald-450 font-bold" title="Passados">{passed} ✔</span>
                              <span className="text-slate-650 font-normal">/</span>
                              <span className="text-rose-455 font-bold" title="Falhados">{failed} ✖</span>
                              {skipped > 0 && (
                                <>
                                  <span className="text-slate-650 font-normal">/</span>
                                  <span className="text-amber-400 font-bold" title="Skipped">{skipped} ⤼</span>
                                </>
                              )}
                              <span className="text-slate-500">({total} total)</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setDetailedExecId(exec.id)}
                              className="text-xs text-[#FF6600] hover:text-white bg-slate-950 hover:bg-[#FF6600] py-1 px-3 border.5 border-[#FF6600]/40 rounded hover:border-[#FF6600] font-bold transition-all"
                            >
                              {t("Ver", "View")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
