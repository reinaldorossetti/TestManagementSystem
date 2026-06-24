import { jsPDF } from 'jspdf';
import { DbTestCaseSphere } from './sqliteEngine';
import {
  getSeverityLevel,
  getCriticalityLevel,
  getStatusLabel,
  type Severity,
  type StatusLabel,
} from './testCaseClassification';

type RGB = [number, number, number];

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

const keywordBadgeColors = (keyword: string): { bg: RGB; fg: RGB } => {
  const k = keyword.toUpperCase();
  if (k === 'DADO' || k === 'DADA' || k === 'GIVEN') return { bg: [30, 64, 175], fg: [147, 197, 253] };
  if (k === 'QUANDO' || k === 'WHEN') return { bg: [146, 64, 14], fg: [254, 240, 138] };
  if (k === 'ENTÃO' || k === 'ENTAO' || k === 'THEN') return { bg: [6, 95, 70], fg: [167, 243, 208] };
  return { bg: [51, 65, 85], fg: [226, 232, 240] }; // E / And / Mas / But
};

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

    let doc: jsPDF;
    const options = { orientation: 'p', unit: 'mm', format: 'a4' } as const;
    if (typeof jsPDF === 'function') {
      doc = new jsPDF(options);
    } else if (jsPDF && typeof (jsPDF as unknown as { jsPDF?: unknown }).jsPDF === 'function') {
      const Constructor = (jsPDF as unknown as { jsPDF: new (o: typeof options) => jsPDF }).jsPDF;
      doc = new Constructor(options);
    } else {
      doc = new (jsPDF as unknown as new (o: typeof options) => jsPDF)(options);
    }

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

      checkPageBreak(20);

      // Case header strip
      const stripY = currentY;
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(marginX, stripY, contentWidth, 8.5, 1.5, 1.5, 'F');
      doc.setFillColor(255, 102, 0);
      doc.rect(marginX, stripY, 1.2, 8.5, 'F');

      // ID badge
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(tc.id, marginX + 4, stripY + 5.6);

      // Pills (right aligned): status, criticality, severity
      let pillX = pageWidth - marginX - 4;
      const statusW = (() => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        return doc.getTextWidth(statusLabel) + 5;
      })();
      pillX -= statusW;
      drawPill(pillX, stripY + 2.2, statusLabel, STATUS_COLORS[statusLabel]);

      const critLabel = `CRIT: ${criticality}`;
      doc.setFontSize(6);
      const critW = doc.getTextWidth(critLabel) + 5;
      pillX -= critW + 2;
      drawPill(pillX, stripY + 2.2, critLabel, SEVERITY_COLORS[criticality]);

      const sevLabel = `SEV: ${severity}`;
      const sevW = doc.getTextWidth(sevLabel) + 5;
      pillX -= sevW + 2;
      drawPill(pillX, stripY + 2.2, sevLabel, SEVERITY_COLORS[severity]);

      currentY += 11;

      // Title
      let displayTitle = tc.title;
      if (displayTitle.startsWith(tc.id)) {
        displayTitle = displayTitle.substring(tc.id.length).replace(/^[\s:-]+/, '').trim();
      }
      addWrappedText(displayTitle, marginX + 2, contentWidth - 4, 9, [255, 255, 255], 'helvetica', 'bold', 4.5);

      // Folder line
      addWrappedText(`${t('Pasta', 'Folder')}: ${tc.folder}`, marginX + 2, contentWidth - 4, 7, [100, 116, 139], 'helvetica', 'normal', 3.6);
      currentY += 1;

      // Preconditions
      if (tc.preconditions?.trim()) {
        addSectionLabel(t('Pré-condições (Variáveis)', 'Preconditions (Variables)'));
        addWrappedText(tc.preconditions.trim(), marginX + 4, contentWidth - 8, 7, [148, 163, 184], 'courier', 'normal', 3.6);
        currentY += 1;
      }

      // Gherkin steps
      if (tc.steps?.trim()) {
        addSectionLabel(t('Cenário / Passos Gherkin BDD', 'Scenario / Gherkin BDD Steps'));
        tc.steps
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .forEach((line) => {
            checkPageBreak(5.5);
            const match = line.match(GHERKIN_KEYWORDS);
            if (match) {
              const keyword = match[1];
              const rest = line.substring(keyword.length).trim();
              const colors = keywordBadgeColors(keyword);
              const badgeLabel = keyword.toUpperCase();
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.5);
              const badgeW = doc.getTextWidth(badgeLabel) + 4;
              doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
              doc.roundedRect(marginX + 4, currentY - 3, badgeW, 4, 0.8, 0.8, 'F');
              doc.setTextColor(colors.fg[0], colors.fg[1], colors.fg[2]);
              doc.text(badgeLabel, marginX + 6, currentY - 0.2);

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(226, 232, 240);
              const textX = marginX + 4 + badgeW + 2;
              const restLines = doc.splitTextToSize(rest, pageWidth - marginX - textX) as string[];
              doc.text(restLines[0] || '', textX, currentY);
              currentY += 4.5;
              // Continuation lines (wrapped) indented under the text
              restLines.slice(1).forEach((cont) => {
                checkPageBreak(4.5);
                doc.text(cont, textX, currentY);
                currentY += 4.5;
              });
            } else {
              addWrappedText(line, marginX + 6, contentWidth - 10, 7.5, [203, 213, 225], 'helvetica', 'normal', 4.5);
            }
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
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 102, 0);
      doc.text(label.toUpperCase(), marginX + 2, currentY);
      currentY += 4;
    }

    const fileName = `Plano_de_Testes_QA_TMS_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error('PDF Exporter runtime exception:', err);
  }
};
