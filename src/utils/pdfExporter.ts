import { jsPDF } from 'jspdf';
import { DbTestCaseSphere, DbExecution, DbTestCase, DbStepLog } from './sqliteEngine';
import { resolveResultsFolderFromExecution } from './robotResultsFolder';
import {
  getSeverityLevel,
  getCriticalityLevel,
  getStatusLabel,
  type Severity,
  type StatusLabel,
} from './testCaseClassification';

type RGB = [number, number, number];

const A4_OPTIONS = { orientation: 'p', unit: 'mm', format: 'a4' } as const;

/** Cross-version safe jsPDF instantiation (handles default/named export shapes). */
const instantiateDoc = (): jsPDF => {
  if (typeof jsPDF === 'function') return new jsPDF(A4_OPTIONS);
  const maybe = jsPDF as unknown as { jsPDF?: new (o: typeof A4_OPTIONS) => jsPDF };
  if (maybe && typeof maybe.jsPDF === 'function') return new maybe.jsPDF(A4_OPTIONS);
  return new (jsPDF as unknown as new (o: typeof A4_OPTIONS) => jsPDF)(A4_OPTIONS);
};

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Mirrors the on-screen duration formatting from the reports page. */
const formatDurationPdf = (seconds: number): string => {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes}m ${rem}s`;
};

/** Mirrors the on-screen human-readable timestamp from the reports page. */
const formatTimestampPdf = (raw: string, language: 'PT' | 'ENG'): string => {
  try {
    const [datePart, timePart] = raw.split(' ');
    if (!datePart) return raw;
    const [year, month, day] = datePart.split('-');
    const months = language === 'PT' ? MONTHS_PT : MONTHS_EN;
    const monthName = months[parseInt(month, 10) - 1] || month;
    const time = timePart || '';
    return language === 'PT'
      ? `${day} de ${monthName} de ${year} às ${time}`
      : `${monthName} ${day}, ${year} at ${time}`;
  } catch {
    return raw;
  }
};

/** Derives the run title from the Robot command (feature tag = feature name). */
const deriveTargetSpec = (command: string, t: (pt: string, en: string) => string): string => {
  if (command.includes('-i ')) {
    const tag = command.split('-i ')[1]?.split(' ')[0] || '';
    if (tag) return `Feature: ${tag}`;
  } else if (command.includes('--include ')) {
    const tag = command.split('--include ')[1]?.split(' ')[0] || '';
    if (tag) return `${t('Cenário Único', 'Single Scenario')}: ${tag}`;
  }
  return t('Suite Completa: cardmais.feature', 'Full Suite: cardmais.feature');
};

/** Carrega screenshot do disco (via API) como data URL para embed no jsPDF. */
const loadScreenshotDataUrl = async (resultsFolder: string, screenshotPath: string): Promise<string | null> => {
  const toDataUrl = async (params: URLSearchParams): Promise<string | null> => {
    try {
      const res = await fetch(`/api/terminal/screenshot?${params.toString()}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.size) return null;
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const relPath = screenshotPath.replace(/\\/g, '/');
  const withFolder = await toDataUrl(new URLSearchParams({ folder: resultsFolder, path: relPath }));
  if (withFolder) return withFolder;
  return toDataUrl(new URLSearchParams({ runId: resultsFolder, path: relPath }));
};

const imageFormatFromDataUrl = (dataUrl: string): 'PNG' | 'JPEG' =>
  dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';

interface EvidenceManifest {
  folder: string;
  browserScreenshots: string[];
  testReports: Record<string, string>;
  suiteReport?: string;
}

const LOGIN_USERS =
  /(standard_user|locked_out_user|problem_user|performance_glitch_user|error_user|visual_user)/;

const loadEvidenceManifest = async (resultsFolder: string): Promise<EvidenceManifest | null> => {
  try {
    const res = await fetch(`/api/terminal/evidence?folder=${encodeURIComponent(resultsFolder)}`);
    if (!res.ok) return null;
    return (await res.json()) as EvidenceManifest;
  } catch {
    return null;
  }
};

/** Resolve pasta física em results/ via API (valida no disco). */
const resolveResultsFolderForExport = async (exec: DbExecution): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
      executionId: exec.id,
      resultsPath: exec.results_path || '',
    });
    if (exec.results_folder?.trim()) params.set('resultsFolder', exec.results_folder.trim());
    const res = await fetch(`/api/terminal/resolve-folder?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { folder?: string };
      if (data.folder) return data.folder;
    }
  } catch {
    /* fallback local */
  }
  const local = resolveResultsFolderFromExecution(exec);
  return local || null;
};

const userFromTestName = (name: string): string | null => {
  const m = name.match(LOGIN_USERS);
  return m?.[1] ?? null;
};

/** Caminho provável da imagem do passo (sem listar a pasta no disco). */
const guessStepScreenshotPath = (st: DbStepLog, tc: DbTestCase): string | undefined => {
  const user = userFromTestName(tc.name);
  const text = st.text.toLowerCase();
  if (st.step_type === 'WHEN' && user) return `browser/screenshot/when-${user}.png`;
  if (text.includes('bloqueado') || tc.name.includes('locked_out'))
    return 'browser/screenshot/then-bloqueado.png';
  if (text.includes('produtos') || text.includes('area de produtos'))
    return 'browser/screenshot/then-produtos.png';
  if (text.includes('usuario autenticado') || text.includes('nome do usuario')) {
    if (user) return `browser/screenshot/then-usuario-${user}.png`;
  }
  return undefined;
};

/** Resolve caminho da imagem do passo (banco, disco ou heurística). */
const resolveStepScreenshotPath = (
  st: DbStepLog,
  tc: DbTestCase,
  manifest: EvidenceManifest | null,
): string | undefined => {
  if (st.screenshot_path) return st.screenshot_path;
  if (manifest?.browserScreenshots.length) {
    const shots = manifest.browserScreenshots;
    const user = userFromTestName(tc.name);
    const text = st.text.toLowerCase();

    if (st.step_type === 'WHEN' && user) {
      return shots.find((s) => s.includes(`when-${user}`));
    }
    if (text.includes('bloqueado') || tc.name.includes('locked_out')) {
      return shots.find((s) => s.includes('then-bloqueado'));
    }
    if (text.includes('produtos') || text.includes('area de produtos')) {
      return shots.find((s) => s.includes('then-produtos'));
    }
    if (text.includes('usuario autenticado') || text.includes('nome do usuario')) {
      if (user) return shots.find((s) => s.includes(`then-usuario-${user}`));
    }
  }
  return guessStepScreenshotPath(st, tc);
};

const resolveTestReportPath = (
  tc: DbTestCase,
  manifest: EvidenceManifest | null,
  testIndex?: number,
): string | undefined => {
  if (tc.report_screenshot_path) return tc.report_screenshot_path;
  if (tc.robot_test_id && manifest?.testReports[tc.robot_test_id]) {
    return manifest.testReports[tc.robot_test_id];
  }
  if (manifest?.testReports && testIndex !== undefined) {
    const keys = Object.keys(manifest.testReports).sort();
    if (manifest.testReports[keys[testIndex]]) return manifest.testReports[keys[testIndex]];
  }
  if (tc.robot_test_id) return `artifacts/robot-log-${tc.robot_test_id}.png`;
  if (testIndex !== undefined) return `artifacts/robot-log-s1-t${testIndex + 1}.png`;
  return undefined;
};

const probeImageSize = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => resolve({ width: 1366, height: 768 });
    img.src = dataUrl;
  });


const SEVERITY_COLORS: Record<Severity, { bg: RGB; fg: RGB }> = {
  Critical: { bg: [30, 58, 138], fg: [191, 219, 254] },
  High: { bg: [49, 46, 129], fg: [199, 210, 254] },
  Medium: { bg: [6, 78, 59], fg: [167, 243, 208] },
  Low: { bg: [12, 74, 110], fg: [186, 230, 253] },
};

const STATUS_COLORS: Record<StatusLabel, { bg: RGB; fg: RGB }> = {
  Passed: { bg: [6, 95, 70], fg: [167, 243, 208] },
  Failed: { bg: [127, 29, 29], fg: [254, 202, 202] },
  Skipped: { bg: [120, 53, 15], fg: [253, 230, 138] },
  Blocked: { bg: [124, 45, 18], fg: [254, 215, 170] },
  'Not Started': { bg: [30, 41, 59], fg: [148, 163, 184] },
};

const GHERKIN_KEYWORDS = /^(Dado|Dada|Given|Quando|When|Então|Entao|Then|E|And|Mas|But)\b/i;

/** Nome padrão do relatório com evidências + timestamp da execução. */
export const buildExecutionReportPdfFileName = (exec: DbExecution): string => {
  const raw = (exec.timestamp || '').trim() || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [datePart, timePart = '00-00-00'] = raw.split(/\s+/);
  const safeTime = timePart.replace(/:/g, '-');
  return `Relatorio_Execucao_com_evidencias_${datePart}_${safeTime}.pdf`;
};

/** Exclui keywords internas do Robot; mantém apenas passos BDD/Gherkin no PDF. */
const isBddGherkinStep = (st: DbStepLog): boolean => {
  const text = st.text.trim();
  if (!text || text.startsWith('...')) return false;
  const robotInternal =
    /^(New Browser|New Context|Close Browser|New Page|Fill Text|Click\b|Wait For Elements|Get Text|Get Url|Take Screenshot|Log\b|Should Be Equal|Get Cookie|\[Arguments\]|Capturar evidencia visual)/i;
  if (robotInternal.test(text)) return false;
  if (text.includes('${') && !/"[^"]*"/.test(text)) return false;
  return true;
};

const filterBddSteps = (caseSteps: DbStepLog[]): DbStepLog[] => caseSteps.filter(isBddGherkinStep);

/**
 * Dark-theme, screen-accurate PDF exporter for the TMS test-case management view
 * (the "Plano de Testes" produced from the PASTAS / FEATURES panel). Follows the
 * visual language of the execution-report PDF: deep dark canvas, orange accents,
 * KPI cards, severity/criticality pills and Gherkin step tracers.
 */
export const handleExportTestCasesToPDF = (
  testCases: DbTestCaseSphere[],
  folders: string[],
  statusByCaseId: { [caseId: string]: string } = {},
  language: 'PT' | 'ENG' = 'PT',
) => {
  try {
    const t = (pt: string, en: string) => (language === 'PT' ? pt : en);

    const doc = instantiateDoc();

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 10;
    const contentWidth = pageWidth - marginX * 2;
    let currentY = 15;

    const fillPageBackground = () => {
      doc.setFillColor(6, 8, 20); // #060814
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const drawHeaderFooter = () => {
      doc.setFillColor(255, 102, 0);
      doc.rect(0, 0, pageWidth, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 102, 0);
      doc.text('CENTRO TMS', marginX, 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('/', marginX + 22, 7.5);

      doc.setFillColor(16, 185, 129);
      doc.ellipse(marginX + 26, 7.2, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(241, 245, 249);
      doc.text(t('plano de testes', 'test plan'), marginX + 29, 7.5);

      const envW = 46;
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(pageWidth - marginX - envW, 4.5, envW, 4.2, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(t('Automação: Robot Framework', 'Automation: Robot Framework'), pageWidth - marginX - envW + 2, 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        t('CENTRO DE EXECUÇÃO QA TMS - PLANO DE TESTES OFICIAL', 'QA TMS EXECUTION CENTER - OFFICIAL TEST PLAN'),
        marginX,
        pageHeight - 8,
      );
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - marginX - 18, pageHeight - 8);
    };

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 15) {
        doc.addPage();
        fillPageBackground();
        drawHeaderFooter();
        currentY = 15;
      }
    };

    /** Renders wrapped text line-by-line, breaking pages as needed. */
    const addWrappedText = (
      text: string,
      x: number,
      maxWidth: number,
      fontSize: number,
      color: RGB,
      font: 'helvetica' | 'courier' = 'helvetica',
      style: 'normal' | 'bold' = 'normal',
      lineHeight = 4,
    ) => {
      doc.setFont(font, style);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text || '-', maxWidth) as string[];
      lines.forEach((line) => {
        checkPageBreak(lineHeight + 2);
        doc.text(line, x, currentY);
        currentY += lineHeight;
      });
    };

    const drawPill = (
      x: number,
      y: number,
      label: string,
      colors: { bg: RGB; fg: RGB },
    ): number => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      const w = doc.getTextWidth(label) + 5;
      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.roundedRect(x, y, w, 4.5, 1, 1, 'F');
      doc.setTextColor(colors.fg[0], colors.fg[1], colors.fg[2]);
      doc.text(label, x + 2.5, y + 3.1);
      return w;
    };

    // Reports-style visual language helpers (shared look with the execution report PDF).
    const STATUS_ICON: Record<StatusLabel, { color: RGB; glyph: 'check' | 'x' | 'dash' }> = {
      Passed: { color: [16, 185, 129], glyph: 'check' },
      Failed: { color: [244, 63, 94], glyph: 'x' },
      Skipped: { color: [245, 158, 11], glyph: 'dash' },
      Blocked: { color: [251, 146, 60], glyph: 'x' },
      'Not Started': { color: [100, 116, 139], glyph: 'dash' },
    };

    /** Draws a circular status indicator with a vector check / x / dash glyph. */
    const drawStatusIcon = (cx: number, cy: number, r: number, status: StatusLabel) => {
      const { color, glyph } = STATUS_ICON[status] || STATUS_ICON['Not Started'];
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setFillColor(2, 6, 16);
      doc.setLineWidth(0.4);
      doc.circle(cx, cy, r, 'FD');
      doc.setLineWidth(0.5);
      doc.setDrawColor(color[0], color[1], color[2]);
      if (glyph === 'check') {
        doc.line(cx - r * 0.45, cy + r * 0.05, cx - r * 0.05, cy + r * 0.45);
        doc.line(cx - r * 0.05, cy + r * 0.45, cx + r * 0.55, cy - r * 0.45);
      } else if (glyph === 'x') {
        doc.line(cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4);
        doc.line(cx - r * 0.4, cy + r * 0.4, cx + r * 0.4, cy - r * 0.4);
      } else {
        doc.line(cx - r * 0.45, cy, cx + r * 0.45, cy);
      }
    };

    /** Tinted keyword badge colors (mirrors the execution report step badges). */
    const keywordTint = (keyword: string): { bg: RGB; fg: RGB } => {
      const k = keyword.toUpperCase();
      if (k === 'DADO' || k === 'DADA' || k === 'GIVEN') return { bg: [12, 33, 61], fg: [56, 189, 248] };
      if (k === 'QUANDO' || k === 'WHEN') return { bg: [49, 34, 7], fg: [251, 191, 36] };
      if (k === 'ENTÃO' || k === 'ENTAO' || k === 'THEN') return { bg: [6, 46, 33], fg: [52, 211, 153] };
      return { bg: [30, 41, 59], fg: [148, 163, 184] };
    };

    // ---- Stats ----
    const statusCounts: Record<StatusLabel, number> = {
      Passed: 0,
      Failed: 0,
      Skipped: 0,
      Blocked: 0,
      'Not Started': 0,
    };
    testCases.forEach((tc) => {
      statusCounts[getStatusLabel(statusByCaseId[tc.id])] += 1;
    });

    // ---- Page 1 ----
    fillPageBackground();
    drawHeaderFooter();

    // Hero banner
    const heroH = 34;
    const heroY = currentY;
    doc.setFillColor(17, 24, 39);
    doc.roundedRect(marginX, heroY, contentWidth, heroH, 3, 3, 'F');

    doc.setFillColor(120, 53, 4);
    doc.roundedRect(marginX + 6, heroY + 6, 40, 4.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(254, 215, 170);
    doc.text(t('CENTRAL DE CASOS DE TESTE', 'TEST CASE CENTER'), marginX + 8, heroY + 9.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(t('PLANO DE TESTES QA TMS', 'QA TMS TEST PLAN'), marginX + 6, heroY + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    const generatedAt = new Date().toLocaleString(language === 'PT' ? 'pt-BR' : 'en-US');
    doc.text(`${t('Gerado em', 'Generated at')}: ${generatedAt}`, marginX + 6, heroY + 26);

    currentY += heroH + 6;

    // KPI cards
    const cardW = (contentWidth - 3 * 4) / 4;
    const cardH = 18;
    const gap = 4;
    const drawKpiCard = (index: number, title: string, value: string, accent: RGB) => {
      const x = marginX + index * (cardW + gap);
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(x, currentY, cardW, cardH, 2, 2, 'F');
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(x, currentY, 1.2, cardH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(title.toUpperCase(), x + 4, currentY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(value, x + 4, currentY + 13);
    };

    drawKpiCard(0, t('Total Casos', 'Total Cases'), testCases.length.toString(), [148, 163, 184]);
    drawKpiCard(1, t('Módulos/Features', 'Modules/Features'), folders.length.toString(), [249, 115, 22]);
    drawKpiCard(2, t('Aprovados', 'Passed'), statusCounts.Passed.toString(), [16, 185, 129]);
    drawKpiCard(3, t('Não Iniciados', 'Not Started'), statusCounts['Not Started'].toString(), [99, 102, 241]);

    currentY += cardH + 10;

    // Coverage by folder
    checkPageBreak(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(249, 115, 22);
    doc.text(t('COBERTURA POR FEATURE', 'COVERAGE BY FEATURE'), marginX, currentY);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY + 2.5, pageWidth - marginX, currentY + 2.5);
    currentY += 8;

    const sortedFolders = [...folders].sort((a, b) => a.localeCompare(b));
    sortedFolders.forEach((folder) => {
      const count = testCases.filter((tc) => tc.folder === folder).length;
      checkPageBreak(6);
      const shortName = folder.split('/').slice(-1)[0] || folder;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      const nameLines = doc.splitTextToSize(shortName, contentWidth - 20) as string[];
      doc.text(nameLines[0], marginX + 2, currentY);
      doc.setFont('courier', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`${count}`, pageWidth - marginX - 6, currentY);
      doc.setDrawColor(20, 27, 45);
      doc.setLineWidth(0.2);
      doc.line(marginX + 2, currentY + 1.5, pageWidth - marginX - 2, currentY + 1.5);
      currentY += 5.5;
    });

    currentY += 6;

    // Detailed test cases
    checkPageBreak(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(t('DETALHAMENTO DOS CASOS DE TESTE', 'TEST CASE DETAILS'), marginX, currentY);
    doc.setFillColor(255, 102, 0);
    doc.rect(marginX, currentY + 1.5, 30, 0.8, 'F');
    currentY += 8;

    if (testCases.length === 0) {
      addWrappedText(
        t('Nenhum caso de teste cadastrado.', 'No test cases registered.'),
        marginX,
        contentWidth,
        9,
        [148, 163, 184],
      );
    }

    const sortedCases = [...testCases].sort((a, b) => a.id.localeCompare(b.id));
    sortedCases.forEach((tc) => {
      const severity = getSeverityLevel(tc.title, tc.id);
      const criticality = getCriticalityLevel(severity, tc.id);
      const statusLabel = getStatusLabel(statusByCaseId[tc.id]);

      checkPageBreak(22);

      // ---- Case header card (reports-style row) ----
      const stripY = currentY;
      const stripH = 9;
      doc.setFillColor(2, 6, 16);
      doc.setDrawColor(20, 27, 45);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, stripY, contentWidth, stripH, 1.5, 1.5, 'FD');

      // Status icon
      drawStatusIcon(marginX + 5.5, stripY + stripH / 2, 2.2, statusLabel);

      // ID badge
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      const idW = doc.getTextWidth(tc.id) + 4;
      doc.setFillColor(15, 23, 42);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX + 9.5, stripY + 2.5, idW, 4, 0.8, 0.8, 'FD');
      doc.setTextColor(148, 163, 184);
      doc.text(tc.id, marginX + 11.5, stripY + 5.3);

      // "(test case)" tag
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(t('(caso de teste)', '(test case)'), marginX + 9.5 + idW + 2, stripY + 5.3);

      // Pills (right aligned): status, criticality, severity
      let pillX = pageWidth - marginX - 4;
      const statusW = (() => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        return doc.getTextWidth(statusLabel) + 5;
      })();
      pillX -= statusW;
      drawPill(pillX, stripY + 2.3, statusLabel, STATUS_COLORS[statusLabel]);

      const critLabel = `CRIT: ${criticality}`;
      doc.setFontSize(6);
      const critW = doc.getTextWidth(critLabel) + 5;
      pillX -= critW + 2;
      drawPill(pillX, stripY + 2.3, critLabel, SEVERITY_COLORS[criticality]);

      const sevLabel = `SEV: ${severity}`;
      const sevW = doc.getTextWidth(sevLabel) + 5;
      pillX -= sevW + 2;
      drawPill(pillX, stripY + 2.3, sevLabel, SEVERITY_COLORS[severity]);

      currentY += stripH + 4;

      // Title (bold, second line under the card)
      let displayTitle = tc.title;
      if (displayTitle.startsWith(tc.id)) {
        displayTitle = displayTitle.substring(tc.id.length).replace(/^[\s:-]+/, '').trim();
      }
      addWrappedText(displayTitle, marginX + 4, contentWidth - 8, 9, [226, 232, 240], 'helvetica', 'bold', 4.5);

      // Folder line
      addWrappedText(`${t('Pasta', 'Folder')}: ${tc.folder}`, marginX + 4, contentWidth - 8, 7, [100, 116, 139], 'helvetica', 'normal', 3.6);
      currentY += 2;

      // Preconditions
      if (tc.preconditions?.trim()) {
        addSectionLabel(t('Pré-condições (Variáveis)', 'Preconditions (Variables)'));
        addWrappedText(tc.preconditions.trim(), marginX + 4, contentWidth - 8, 7, [148, 163, 184], 'courier', 'normal', 3.6);
        currentY += 1;
      }

      // Gherkin steps (reports-style rows: orange accent + tinted badge + quoted text)
      if (tc.steps?.trim()) {
        addSectionLabel(t('Cenário / Passos Gherkin BDD', 'Scenario / Gherkin BDD Steps'));
        tc.steps
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .forEach((line) => {
            checkPageBreak(6.5);
            const stepY = currentY;
            const rowLeft = marginX + 8;
            const rowRight = pageWidth - marginX - 2;
            const rowW = rowRight - rowLeft;

            // Orange left accent (mirrors border-l-2 border-[#FF6600]/30)
            doc.setDrawColor(255, 102, 0);
            doc.setLineWidth(0.5);
            doc.line(marginX + 5, stepY - 3.2, marginX + 5, stepY + 1.6);

            doc.setFillColor(8, 11, 22);
            doc.setDrawColor(17, 24, 39);
            doc.setLineWidth(0.2);
            doc.roundedRect(rowLeft, stepY - 3.2, rowW, 5, 0.8, 0.8, 'FD');

            const match = line.match(GHERKIN_KEYWORDS);
            const keyword = match ? match[1] : '';
            const rest = match ? line.substring(keyword.length).trim() : line;
            let textX = rowLeft + 2;

            if (keyword) {
              const kw = keywordTint(keyword);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.5);
              const kwLabel = keyword.toUpperCase();
              const kwW = doc.getTextWidth(kwLabel) + 3.5;
              doc.setFillColor(kw.bg[0], kw.bg[1], kw.bg[2]);
              doc.roundedRect(rowLeft + 2, stepY - 2.5, kwW, 3.6, 0.6, 0.6, 'F');
              doc.setTextColor(kw.fg[0], kw.fg[1], kw.fg[2]);
              doc.text(kwLabel, rowLeft + 3.7, stepY);
              textX = rowLeft + 2 + kwW + 2;
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(203, 213, 225);
            const txtMaxW = rowRight - 2 - textX;
            const stepLine = (doc.splitTextToSize(`"${rest}"`, txtMaxW) as string[])[0] || '';
            doc.text(stepLine, textX, stepY);
            currentY += 6;
          });
        currentY += 1;
      }

      // Expected result
      if (tc.expected_result?.trim()) {
        addSectionLabel(t('Resultado Esperado', 'Expected Result'));
        addWrappedText(tc.expected_result.trim(), marginX + 4, contentWidth - 8, 7.5, [167, 243, 208], 'helvetica', 'normal', 4);
        currentY += 1;
      }

      // Observation
      if (tc.observation?.trim()) {
        addSectionLabel(t('Observação', 'Observation'));
        addWrappedText(tc.observation.trim(), marginX + 4, contentWidth - 8, 7.5, [148, 163, 184], 'helvetica', 'normal', 4);
        currentY += 1;
      }

      // Separator between cases
      checkPageBreak(6);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.3);
      doc.line(marginX, currentY + 1, pageWidth - marginX, currentY + 1);
      currentY += 6;
    });

    function addSectionLabel(label: string) {
      checkPageBreak(7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), marginX + 4, currentY);
      doc.setDrawColor(20, 27, 45);
      doc.setLineWidth(0.2);
      doc.line(marginX + 4, currentY + 1.2, pageWidth - marginX - 2, currentY + 1.2);
      currentY += 4.5;
    }

    const fileName = `Plano_de_Testes_QA_TMS_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error('PDF Exporter runtime exception:', err);
  }
};

/**
 * Dark-theme, screen-accurate PDF exporter for a single execution report,
 * mirroring the reports detail page: hero header (status badge + feature title +
 * Robot command), success-rate donut gauge, KPI cards (Total/Failed/Broken/
 * Passed/Skipped) and the grouped scenario/step tracer.
 */
export const handleExportExecutionReportToPDF = async (
  exec: DbExecution,
  testCases: DbTestCase[],
  steps: DbStepLog[],
  language: 'PT' | 'ENG' = 'PT',
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const t = (pt: string, en: string) => (language === 'PT' ? pt : en);
    const resultsFolder = await resolveResultsFolderForExport(exec);
    if (!resultsFolder) {
      return {
        ok: false,
        error: t(
          'Nenhuma pasta de evidências em results/ para esta execução. Use o Terminal Ao Vivo para rodar os testes Robot (login_tests) antes de exportar o PDF.',
          'No evidence folder in results/ for this run. Use the Live Terminal to run Robot tests (login_tests) before exporting the PDF.',
        ),
      };
    }
    const evidence = await loadEvidenceManifest(resultsFolder);
    const hasEvidenceOnDisk =
      (evidence?.browserScreenshots?.length ?? 0) > 0 ||
      Object.keys(evidence?.testReports ?? {}).length > 0 ||
      Boolean(evidence?.suiteReport);

    if (!hasEvidenceOnDisk) {
      return {
        ok: false,
        error: t(
          'Nenhuma evidência visual em results/ para esta execução. Execute os testes pelo Terminal Ao Vivo ou Executar Feature antes de exportar.',
          'No visual evidence in results/ for this run. Run tests via Live Terminal or Execute Feature before exporting.',
        ),
      };
    }

    const testCaseIndexById = new Map(testCases.map((tc, i) => [tc.id, i]));

    let embeddedImageCount = 0;
    const trackImageEmbed = () => {
      embeddedImageCount += 1;
    };

    const doc = instantiateDoc();

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 10;
    const contentWidth = pageWidth - marginX * 2;
    let currentY = 15;

    const fillPageBackground = () => {
      doc.setFillColor(6, 8, 20);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const drawHeaderFooter = () => {
      doc.setFillColor(255, 102, 0);
      doc.rect(0, 0, pageWidth, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 102, 0);
      doc.text('CENTRO TMS', marginX, 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('/', marginX + 22, 7.5);
      doc.setFillColor(16, 185, 129);
      doc.ellipse(marginX + 26, 7.2, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(241, 245, 249);
      doc.text(t('relatório de execução', 'execution report'), marginX + 29, 7.5);

      const envW = 40;
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(pageWidth - marginX - envW, 4.5, envW, 4.2, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Environment: ubuntu-latest', pageWidth - marginX - envW + 2, 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        t('CENTRO DE EXECUÇÃO QA TMS - RELATÓRIO DE EXECUÇÃO', 'QA TMS EXECUTION CENTER - EXECUTION REPORT'),
        marginX,
        pageHeight - 8,
      );
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - marginX - 18, pageHeight - 8);
    };

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 15) {
        doc.addPage();
        fillPageBackground();
        drawHeaderFooter();
        currentY = 15;
      }
    };

    const addWrappedText = (
      text: string,
      x: number,
      maxWidth: number,
      fontSize: number,
      color: RGB,
      font: 'helvetica' | 'courier' = 'helvetica',
      style: 'normal' | 'bold' = 'normal',
      lineHeight = 4,
    ) => {
      doc.setFont(font, style);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text || '-', maxWidth) as string[];
      lines.forEach((line) => {
        checkPageBreak(lineHeight + 2);
        doc.text(line, x, currentY);
        currentY += lineHeight;
      });
    };

    const drawPill = (x: number, y: number, label: string, colors: { bg: RGB; fg: RGB }, fontSize = 6): number => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(label) + 5;
      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.roundedRect(x, y, w, 4.5, 1, 1, 'F');
      doc.setTextColor(colors.fg[0], colors.fg[1], colors.fg[2]);
      doc.text(label, x + 2.5, y + 3.1);
      return w;
    };

    /** Strokes a ring gauge filled proportionally to `pct` (clockwise from top). */
    const drawDonutGauge = (cx: number, cy: number, r: number, pct: number) => {
      const segments = 240;
      doc.setLineWidth(3);
      doc.setDrawColor(30, 41, 59);
      doc.circle(cx, cy, r, 'S');

      // Multi-segment ring: green (passed) -> red (failed) -> amber (skipped),
      // mirroring the on-screen conic-gradient.
      const drawArc = (startFrac: number, endFrac: number, color: RGB) => {
        if (endFrac <= startFrac) return;
        doc.setDrawColor(color[0], color[1], color[2]);
        const s = Math.round(startFrac * segments);
        const e = Math.round(endFrac * segments);
        let prevX = cx + r * Math.cos(-Math.PI / 2 + (s / segments) * 2 * Math.PI);
        let prevY = cy + r * Math.sin(-Math.PI / 2 + (s / segments) * 2 * Math.PI);
        for (let i = s + 1; i <= e; i++) {
          const ang = -Math.PI / 2 + (i / segments) * 2 * Math.PI;
          const x = cx + r * Math.cos(ang);
          const y = cy + r * Math.sin(ang);
          doc.line(prevX, prevY, x, y);
          prevX = x;
          prevY = y;
        }
      };
      if (total > 0) {
        const pf = passed / total;
        const ff = failed / total;
        const sf = skipped / total;
        drawArc(0, pf, [16, 185, 129]);
        drawArc(pf, pf + ff, [239, 68, 68]);
        drawArc(pf + ff, pf + ff + sf, [245, 158, 11]);
      }

      doc.setFillColor(17, 24, 39);
      doc.circle(cx, cy, r - 2.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(241, 245, 249);
      doc.text(`${pct.toFixed(1)}%`, cx, cy + 0.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(t('SUCESSO', 'SUCCESS'), cx, cy + 4.6, { align: 'center' });
    };

    // ---- Stats ----
    const total = exec.total_tests;
    const passed = exec.passed;
    const failed = exec.failed;
    const skipped = Math.max(0, total - passed - failed);
    const broken = 0;
    const successPct = total > 0 ? (passed / total) * 100 : 0;
    const isFail = exec.status === 'FAIL';
    const targetSpec = deriveTargetSpec(exec.command, t);

    fillPageBackground();
    drawHeaderFooter();

    // ---- Hero banner ----
    const heroH = 50;
    const heroY = currentY;
    doc.setFillColor(17, 24, 39);
    doc.roundedRect(marginX, heroY, contentWidth, heroH, 3, 3, 'F');

    drawPill(
      marginX + 6,
      heroY + 6,
      isFail ? t('EXECUÇÃO CRÍTICA FALHADA', 'CRITICAL FAILED RUN') : t('100% VERIFICADO APROVADO', '100% VERIFIED PASS'),
      isFail ? { bg: [80, 7, 20], fg: [254, 202, 202] } : { bg: [6, 60, 46], fg: [167, 243, 208] },
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(targetSpec.toUpperCase(), contentWidth - 56) as string[];
    doc.text(titleLines[0] || '', marginX + 6, heroY + 19.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(formatTimestampPdf(exec.timestamp, language), marginX + 6, heroY + 26);

    const cmdBoxW = contentWidth - 60;
    const cmdBoxY = heroY + 30;
    doc.setFillColor(2, 6, 16);
    doc.roundedRect(marginX + 6, cmdBoxY, cmdBoxW, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 102, 0);
    doc.text(t('Comando Robot:', 'Robot Command:'), marginX + 9, cmdBoxY + 4.5);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const cmdLines = doc.splitTextToSize(exec.command, cmdBoxW - 6) as string[];
    cmdLines.slice(0, 2).forEach((line, i) => doc.text(line, marginX + 9, cmdBoxY + 8.5 + i * 3.4));

    // Donut gauge (right side of hero)
    drawDonutGauge(pageWidth - marginX - 22, heroY + 22, 16, successPct);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      t('PROPORÇÃO DE CASOS', 'PROPORTION OF CASES'),
      pageWidth - marginX - 22,
      heroY + 44,
      { align: 'center' },
    );

    currentY = heroY + heroH + 8;

    // ---- KPI cards (Total / Failed / Broken / Passed / Skipped) ----
    const kpis: { title: string; value: number; accent: RGB }[] = [
      { title: t('Total de Testes', 'Total Tests'), value: total, accent: [148, 163, 184] },
      { title: 'Failed', value: failed, accent: [244, 63, 94] },
      { title: 'Broken', value: broken, accent: [245, 158, 11] },
      { title: 'Passed', value: passed, accent: [16, 185, 129] },
      { title: 'Skipped', value: skipped, accent: [99, 102, 241] },
    ];
    const gap = 4;
    const cardW = (contentWidth - gap * 4) / 5;
    const cardH = 18;
    kpis.forEach((kpi, i) => {
      const x = marginX + i * (cardW + gap);
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(x, currentY, cardW, cardH, 2, 2, 'F');
      doc.setFillColor(kpi.accent[0], kpi.accent[1], kpi.accent[2]);
      doc.rect(x, currentY, 1.2, cardH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text(kpi.title.toUpperCase(), x + 4, currentY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`${kpi.value}`, x + 4, currentY + 13);
    });

    currentY += cardH + 10;

    // ---- Scenario results (mirrors the reports detail "Gherkin Workspace") ----
    type RunStatus = 'PASS' | 'FAIL' | 'SKIP';
    const STATUS_ICON_COLOR: Record<RunStatus, RGB> = {
      PASS: [16, 185, 129],
      FAIL: [244, 63, 94],
      SKIP: [245, 158, 11],
    };
    const STEP_KEYWORD_COLOR: Record<string, { bg: RGB; fg: RGB }> = {
      GIVEN: { bg: [12, 33, 61], fg: [56, 189, 248] },
      WHEN: { bg: [49, 34, 7], fg: [251, 191, 36] },
      THEN: { bg: [6, 46, 33], fg: [52, 211, 153] },
      AND: { bg: [30, 41, 59], fg: [148, 163, 184] },
    };

    /** Draws a circular status indicator with a vector check / x / dash glyph. */
    const drawStatusIcon = (cx: number, cy: number, r: number, status: RunStatus) => {
      const color = STATUS_ICON_COLOR[status] || STATUS_ICON_COLOR.SKIP;
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setFillColor(2, 6, 16);
      doc.setLineWidth(0.4);
      doc.circle(cx, cy, r, 'FD');
      doc.setLineWidth(0.5);
      doc.setDrawColor(color[0], color[1], color[2]);
      if (status === 'PASS') {
        doc.line(cx - r * 0.45, cy + r * 0.05, cx - r * 0.05, cy + r * 0.45);
        doc.line(cx - r * 0.05, cy + r * 0.45, cx + r * 0.55, cy - r * 0.45);
      } else if (status === 'FAIL') {
        doc.line(cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4);
        doc.line(cx - r * 0.4, cy + r * 0.4, cx + r * 0.4, cy - r * 0.4);
      } else {
        doc.line(cx - r * 0.45, cy, cx + r * 0.45, cy);
      }
    };

    /** Draws the segmented pass/fail/skip proportion bar with a track. */
    const drawSegBar = (x: number, y: number, w: number, h: number) => {
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
      let cx = x;
      const seg = (count: number, color: RGB) => {
        if (count > 0 && total > 0) {
          const sw = (count / total) * w;
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(cx, y, sw, h, 'F');
          cx += sw;
        }
      };
      seg(passed, [16, 185, 129]);
      seg(failed, [244, 63, 94]);
      seg(skipped, [245, 158, 11]);
    };

    /** Draws a small colored count chip (count + drawn mark) and returns its width. */
    const drawCountChip = (x: number, y: number, count: number, status: RunStatus): number => {
      const palette: Record<RunStatus, { bg: RGB; fg: RGB }> = {
        PASS: { bg: [6, 46, 33], fg: [52, 211, 153] },
        FAIL: { bg: [60, 12, 20], fg: [251, 113, 133] },
        SKIP: { bg: [49, 34, 7], fg: [251, 191, 36] },
      };
      const c = palette[status];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      const label = `${count}`;
      const w = doc.getTextWidth(label) + 5.5;
      doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
      doc.roundedRect(x, y, w, 4, 0.8, 0.8, 'F');
      doc.setTextColor(c.fg[0], c.fg[1], c.fg[2]);
      doc.text(label, x + 2, y + 2.8);
      const mx = x + 2 + doc.getTextWidth(label) + 1.6;
      const my = y + 2;
      doc.setDrawColor(c.fg[0], c.fg[1], c.fg[2]);
      doc.setLineWidth(0.4);
      if (status === 'PASS') {
        doc.line(mx - 0.8, my + 0.1, mx - 0.2, my + 0.7);
        doc.line(mx - 0.2, my + 0.7, mx + 0.9, my - 0.7);
      } else if (status === 'FAIL') {
        doc.line(mx - 0.7, my - 0.7, mx + 0.7, my + 0.7);
        doc.line(mx - 0.7, my + 0.7, mx + 0.7, my - 0.7);
      } else {
        doc.line(mx - 0.8, my, mx + 0.8, my);
      }
      return w;
    };

    // Card title: "Sintaxe Workspace Gherkin: cardmais.feature"
    checkPageBreak(14);
    doc.setFillColor(255, 102, 0);
    doc.roundedRect(marginX, currentY - 2.8, 3, 3, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${t('SINTAXE WORKSPACE GHERKIN:', 'GHERKIN WORKSPACE SYNTAX:')} cardmais.feature`, marginX + 5, currentY);
    currentY += 6;

    // Environment header row (with segmented proportion bar)
    checkPageBreak(11);
    const envY = currentY;
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, envY, contentWidth, 8, 1.5, 1.5, 'FD');
    doc.setFillColor(148, 163, 184);
    doc.triangle(marginX + 3, envY + 3, marginX + 6, envY + 3, marginX + 4.5, envY + 5, 'F');
    doc.setFillColor(255, 101, 0);
    doc.roundedRect(marginX + 8, envY + 2.7, 3, 2.6, 0.4, 0.4, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text('Environment: "ubuntu-latest"', marginX + 13, envY + 5.2);
    const barW = 24;
    const barX = pageWidth - marginX - 4 - barW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const testesLabel = `${total} ${t('testes', 'tests')}`;
    doc.text(testesLabel, barX - 2 - doc.getTextWidth(testesLabel), envY + 5.2);
    drawSegBar(barX, envY + 3, barW, 2.5);
    currentY = envY + 8 + 4;

    if (testCases.length === 0) {
      addWrappedText(
        t('Nenhum caso de teste vinculado a esta execução.', 'No test cases linked to this execution.'),
        marginX + 2,
        contentWidth - 4,
        9,
        [148, 163, 184],
      );
    }

    const categoriesMap: Record<string, DbTestCase[]> = {};
    testCases.forEach((tc) => {
      const cat = tc.category || t('Sem Categoria', 'Uncategorized');
      (categoriesMap[cat] ||= []).push(tc);
    });

    for (const category of Object.keys(categoriesMap)) {
      const list = categoriesMap[category];
      const catPass = list.filter((c) => c.status === 'PASS').length;
      const catFail = list.filter((c) => c.status === 'FAIL').length;
      const catSkip = list.filter((c) => c.status === 'SKIP').length;

      // Category header strip: [name] + N cenários + colored count chips
      checkPageBreak(11);
      const catY = currentY;
      doc.setFillColor(17, 24, 39);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX + 2, catY, contentWidth - 4, 7, 1.5, 1.5, 'FD');
      doc.setFillColor(100, 116, 139);
      doc.triangle(marginX + 5, catY + 2.7, marginX + 7.5, catY + 2.7, marginX + 6.25, catY + 4.4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 102, 0);
      doc.text(`[${category}]`, marginX + 9, catY + 4.6);

      let chipX = pageWidth - marginX - 6;
      const chips: [RunStatus, number][] = [['SKIP', catSkip], ['FAIL', catFail], ['PASS', catPass]];
      chips.forEach(([st, cnt]) => {
        if (cnt > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          const w = doc.getTextWidth(`${cnt}`) + 5.5;
          chipX -= w;
          drawCountChip(chipX, catY + 1.4, cnt, st);
          chipX -= 2;
        }
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      const cenLabel = `${list.length} ${t('cenários', 'scenarios')}`;
      chipX -= 2 + doc.getTextWidth(cenLabel);
      doc.text(cenLabel, chipX, catY + 4.6);
      currentY = catY + 7 + 3;

      for (const tc of list) {
        checkPageBreak(17);

        // Case row: status icon + id badge + (BDD scenario) + name + duration + STEPS chip
        const rowY = currentY;
        const rowH = 11;
        doc.setFillColor(2, 6, 16);
        doc.setDrawColor(20, 27, 45);
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX + 2, rowY, contentWidth - 4, rowH, 1.5, 1.5, 'FD');

        drawStatusIcon(marginX + 7, rowY + rowH / 2, 2.2, tc.status);

        doc.setFont('courier', 'bold');
        doc.setFontSize(6.5);
        const idW = doc.getTextWidth(tc.id) + 4;
        doc.setFillColor(15, 23, 42);
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX + 11, rowY + 2.1, idW, 4, 0.8, 0.8, 'FD');
        doc.setTextColor(148, 163, 184);
        doc.text(tc.id, marginX + 13, rowY + 4.9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text('(BDD scenario)', marginX + 11 + idW + 2, rowY + 4.9);

        // Right: STEPS chip + duration
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        const passosLabel = t('FECHAR PASSOS', 'CLOSE STEPS');
        const pcW = doc.getTextWidth(passosLabel) + 5;
        const pcX = pageWidth - marginX - 6 - pcW;
        doc.setFillColor(15, 23, 42);
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.3);
        doc.roundedRect(pcX, rowY + 2, pcW, 4.4, 0.8, 0.8, 'FD');
        doc.setTextColor(148, 163, 184);
        doc.text(passosLabel, pcX + 2, rowY + 4.9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        const durLabel = formatDurationPdf(tc.duration_s);
        doc.text(durLabel, pcX - 2 - doc.getTextWidth(durLabel), rowY + 4.9);

        // Name (bold, second line)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(226, 232, 240);
        const nameMaxW = contentWidth - 4 - 11 - 8;
        const nameLine = (doc.splitTextToSize(tc.name, nameMaxW) as string[])[0] || '';
        doc.text(nameLine, marginX + 11, rowY + 8.8);
        currentY += rowH + 6;

        const caseSteps = filterBddSteps(steps.filter((s) => s.test_case_id === tc.id));
        if (caseSteps.length === 0) {
          checkPageBreak(6);
          doc.setDrawColor(255, 102, 0);
          doc.setLineWidth(0.5);
          doc.line(marginX + 10, currentY - 2.6, marginX + 10, currentY + 1.4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(100, 116, 139);
          doc.text(
            t("Nenhum passo de Gherkin encontrado na tabela SQLite 'steps'.", "No Gherkin steps found in SQL 'steps' table."),
            marginX + 13,
            currentY,
          );
          currentY += 5;
        } else {
          for (const st of caseSteps) {
            checkPageBreak(6.5);
            const stepY = currentY;
            const rowLeft = marginX + 13;
            const rowRight = pageWidth - marginX - 4;
            const rowW = rowRight - rowLeft;

            // Orange left accent (mirrors border-l-2 border-[#FF6600]/30)
            doc.setDrawColor(255, 102, 0);
            doc.setLineWidth(0.5);
            doc.line(marginX + 10, stepY - 3.2, marginX + 10, stepY + 1.6);

            doc.setFillColor(8, 11, 22);
            doc.setDrawColor(17, 24, 39);
            doc.setLineWidth(0.2);
            doc.roundedRect(rowLeft, stepY - 3.2, rowW, 5, 0.8, 0.8, 'FD');

            drawStatusIcon(rowLeft + 3, stepY - 0.6, 1.4, st.status);

            const kw = STEP_KEYWORD_COLOR[st.step_type] || STEP_KEYWORD_COLOR.AND;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            const kwLabel = st.step_type.toUpperCase();
            const kwW = doc.getTextWidth(kwLabel) + 3.5;
            doc.setFillColor(kw.bg[0], kw.bg[1], kw.bg[2]);
            doc.roundedRect(rowLeft + 5.5, stepY - 2.5, kwW, 3.6, 0.6, 0.6, 'F');
            doc.setTextColor(kw.fg[0], kw.fg[1], kw.fg[2]);
            doc.text(kwLabel, rowLeft + 7.2, stepY);

            // Right timing/status value
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            const val = st.status === 'SKIP' ? 'SKIP' : st.status === 'FAIL' ? 'FAIL' : '65ms';
            const valW = doc.getTextWidth(val);
            doc.text(val, rowRight - 2 - valW, stepY);

            // Quoted step text
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(203, 213, 225);
            const txtX = rowLeft + 5.5 + kwW + 2;
            const txtMaxW = rowRight - 2 - valW - 2 - txtX;
            const stepLine = (doc.splitTextToSize(`"${st.text}"`, txtMaxW) as string[])[0] || '';
            doc.text(stepLine, txtX, stepY);
            currentY += 6;
          }
          currentY += 1;
        }

        // ---- Evidências visuais (passos + report Robot por cenário) ----
        const testReportPath = resolveTestReportPath(tc, evidence, testCaseIndexById.get(tc.id));

        type LoadedStepEvidence = { st: DbStepLog; dataUrl: string; imgFormat: 'PNG' | 'JPEG' };
        const loadedStepEvidence: LoadedStepEvidence[] = [];
        for (const st of caseSteps) {
          const shotPath = resolveStepScreenshotPath(st, tc, evidence);
          if (!shotPath) continue;
          const dataUrl = await loadScreenshotDataUrl(resultsFolder, shotPath);
          if (!dataUrl) continue;
          loadedStepEvidence.push({ st, dataUrl, imgFormat: imageFormatFromDataUrl(dataUrl) });
        }

        let reportDataUrl: string | null = null;
        let reportFormat: 'PNG' | 'JPEG' = 'PNG';
        let reportNatW = 1366;
        let reportNatH = 768;
        if (testReportPath) {
          const url = await loadScreenshotDataUrl(resultsFolder, testReportPath);
          if (url) {
            reportDataUrl = url;
            reportFormat = imageFormatFromDataUrl(url);
            const dims = await probeImageSize(url);
            reportNatW = dims.width;
            reportNatH = dims.height;
          }
        }

        if (loadedStepEvidence.length === 0 && !reportDataUrl) {
          // sem evidências neste cenário
        } else {
          const sectionX = marginX + 4;
          const sectionW = contentWidth - 8;
          const headerH = 16;
          const tilePad = 4;
          const tileW = sectionW - 12;
          const blockGap = 4;

          const measureStepTile = async (item: LoadedStepEvidence) => {
            const { width: natW, height: natH } = await probeImageSize(item.dataUrl);
            const maxImgH = 52;
            const scale = Math.min((tileW - tilePad * 2) / natW, maxImgH / natH, 1);
            return {
              imgW: natW * scale,
              imgH: natH * scale,
              tileH: natH * scale + 16,
            };
          };

          const stepTiles = await Promise.all(
            loadedStepEvidence.map(async (item) => ({
              item,
              ...(await measureStepTile(item)),
            })),
          );

          let reportCardH = 0;
          let reportImgW = 0;
          let reportImgH = 0;
          if (reportDataUrl) {
            const maxImgH = 72;
            const scale = Math.min((tileW - 8) / reportNatW, maxImgH / reportNatH, 1);
            reportImgW = reportNatW * scale;
            reportImgH = reportNatH * scale;
            reportCardH = reportImgH + 18;
          }

          const firstBlockH = stepTiles[0]?.tileH ?? reportCardH;
          checkPageBreak(headerH + blockGap + firstBlockH + blockGap);

          doc.setFillColor(10, 14, 28);
          doc.setDrawColor(255, 102, 0);
          doc.setLineWidth(0.4);
          doc.roundedRect(sectionX, currentY, sectionW, headerH, 2.5, 2.5, 'FD');
          doc.setFillColor(255, 102, 0);
          doc.roundedRect(sectionX, currentY, 2, headerH, 2.5, 0, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(255, 102, 0);
          doc.text(t('EVIDÊNCIAS DO CENÁRIO', 'SCENARIO EVIDENCE'), sectionX + 6, currentY + 5.5);

          doc.setFont('courier', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text(tc.id, sectionX + 6, currentY + 10.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(226, 232, 240);
          const scenTitle = (doc.splitTextToSize(tc.name, sectionW - 50) as string[])[0] || tc.name;
          doc.text(scenTitle, sectionX + 6 + doc.getTextWidth(tc.id) + 4, currentY + 10.5);

          doc.setFont('courier', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(71, 85, 105);
          doc.text(
            `results/${resultsFolder}`,
            sectionX + sectionW - 4 - doc.getTextWidth(`results/${resultsFolder}`),
            currentY + 5.5,
          );

          drawStatusIcon(pageWidth - marginX - 10, currentY + 8, 2, tc.status);
          currentY += headerH + blockGap;

          // Coluna única — um card abaixo do outro; quebra de página reinicia no topo (currentY = 15)
          for (const { item, imgW, imgH, tileH } of stepTiles) {
            const { st, dataUrl, imgFormat } = item;
            checkPageBreak(tileH + blockGap);
            const tileY = currentY;
            const tileX = sectionX + 6;

            doc.setFillColor(6, 9, 20);
            doc.setDrawColor(30, 41, 59);
            doc.setLineWidth(0.25);
            doc.roundedRect(tileX, tileY, tileW, tileH, 2, 2, 'FD');

            const kwEv = STEP_KEYWORD_COLOR[st.step_type] || STEP_KEYWORD_COLOR.AND;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            const evKw = st.step_type.toUpperCase();
            const evKwW = doc.getTextWidth(evKw) + 3.5;
            doc.setFillColor(kwEv.bg[0], kwEv.bg[1], kwEv.bg[2]);
            doc.roundedRect(tileX + tilePad, tileY + 3, evKwW, 3.8, 0.6, 0.6, 'F');
            doc.setTextColor(kwEv.fg[0], kwEv.fg[1], kwEv.fg[2]);
            doc.text(evKw, tileX + tilePad + 1.5, tileY + 5.6);

            drawStatusIcon(tileX + tileW - tilePad - 2, tileY + 5.2, 1.2, st.status);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(148, 163, 184);
            const cap = (doc.splitTextToSize(st.text, tileW - tilePad * 2) as string[])[0] || st.text;
            doc.text(cap, tileX + tilePad, tileY + 9.5);

            const imgX = tileX + (tileW - imgW) / 2;
            const imgY = tileY + 11;
            doc.setDrawColor(255, 102, 0);
            doc.setLineWidth(0.3);
            doc.roundedRect(imgX - 0.4, imgY - 0.4, imgW + 0.8, imgH + 0.8, 0.6, 0.6, 'S');
            doc.addImage(dataUrl, imgFormat, imgX, imgY, imgW, imgH, undefined, 'FAST');
            trackImageEmbed();
            currentY = tileY + tileH + blockGap;
          }

          // Report Robot — trecho do log.html deste cenário
          if (reportDataUrl) {
            checkPageBreak(reportCardH + blockGap);
            const cardX = sectionX + 6;
            const cardW = tileW;
            const cardY = currentY;

            doc.setFillColor(8, 15, 30);
            doc.setDrawColor(56, 189, 248);
            doc.setLineWidth(0.35);
            doc.roundedRect(cardX, cardY, cardW, reportCardH, 2, 2, 'FD');
            doc.setFillColor(56, 189, 248);
            doc.roundedRect(cardX, cardY, 1.2, reportCardH, 2, 2, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(56, 189, 248);
            doc.text(
              t('ROBOT FRAMEWORK — LOG DO CENÁRIO', 'ROBOT FRAMEWORK — SCENARIO LOG'),
              cardX + 4,
              cardY + 5,
            );
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text(
              t(`Referência: ${tc.id} · ${tc.name}`, `Reference: ${tc.id} · ${tc.name}`),
              cardX + 4,
              cardY + 9,
            );

            const imgX = cardX + (cardW - reportImgW) / 2;
            const imgY = cardY + 11;
            doc.setDrawColor(56, 189, 248);
            doc.setLineWidth(0.35);
            doc.roundedRect(imgX - 0.5, imgY - 0.5, reportImgW + 1, reportImgH + 1, 0.8, 0.8, 'S');
            doc.addImage(reportDataUrl, reportFormat, imgX, imgY, reportImgW, reportImgH, undefined, 'FAST');
            trackImageEmbed();
            currentY = cardY + reportCardH + blockGap;
          }
        }

        // Breathing room between consecutive test cases
        currentY += 4;
      }

      currentY += 3;
    }

    // ---- Report Robot Framework (suíte completa) ----
    const suiteReportPath =
      exec.report_screenshot_path ?? evidence?.suiteReport ?? 'artifacts/robot-report.png';
    const suiteReportUrl = await loadScreenshotDataUrl(resultsFolder, suiteReportPath);
    if (suiteReportUrl) {
      const suiteFormat = imageFormatFromDataUrl(suiteReportUrl);
      const sx = marginX + 2;
      const sw = contentWidth - 4;
      const hdrH = 10;
      const { width: natW, height: natH } = await probeImageSize(suiteReportUrl);
      const maxH = 110;
      const scale = Math.min((sw - 6) / natW, maxH / natH, 1);
      const imgW = natW * scale;
      const imgH = natH * scale;
      const blockH = hdrH + 3 + imgH + 10;
      checkPageBreak(blockH);

      doc.setFillColor(8, 12, 24);
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.4);
      doc.roundedRect(sx, currentY, sw, hdrH, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(16, 185, 129);
      doc.text(
        t('RELATÓRIO ROBOT FRAMEWORK — SUÍTE COMPLETA', 'ROBOT FRAMEWORK REPORT — FULL SUITE'),
        sx + 4,
        currentY + 6.5,
      );
      const imgBlockY = currentY + hdrH + 3;

      doc.setFillColor(4, 8, 18);
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.35);
      doc.roundedRect(sx, imgBlockY, sw, imgH + 4, 2, 2, 'FD');
      const imgX = sx + (sw - imgW) / 2;
      doc.addImage(suiteReportUrl, suiteFormat, imgX, imgBlockY + 2, imgW, imgH, undefined, 'FAST');
      trackImageEmbed();
      doc.setFont('courier', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${resultsFolder}/report.html`, sx + 4, imgBlockY + imgH + 3);
      currentY = imgBlockY + imgH + 10;
    }

    if (embeddedImageCount === 0) {
      return {
        ok: false,
        error: t(
          'Não foi possível incorporar screenshots no PDF. Verifique se a pasta results/ está acessível e execute os testes novamente.',
          'Could not embed screenshots in the PDF. Check that results/ is accessible and re-run the tests.',
        ),
      };
    }

    const fileName = buildExecutionReportPdfFileName(exec);
    doc.save(fileName);
    return { ok: true };
  } catch (err) {
    console.error('Execution report PDF exception:', err);
    return {
      ok: false,
      error: language === 'PT' ? 'Falha ao gerar o PDF.' : 'Failed to generate PDF.',
    };
  }
};
