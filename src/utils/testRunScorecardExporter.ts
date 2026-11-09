import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import type { AggregatedScorecard } from '@/src/server/services/testRunScorecard';
import type { TestRunRecord } from '@/src/server/repositories/testRunRepository';

const A4_LANDSCAPE = { orientation: 'l', unit: 'mm', format: 'a4' } as const;

function createPdfDocument(): jsPDF {
  if (typeof jsPDF === 'function') return new jsPDF(A4_LANDSCAPE);
  const maybe = jsPDF as unknown as { jsPDF?: new (o: typeof A4_LANDSCAPE) => jsPDF };
  if (maybe && typeof maybe.jsPDF === 'function') return new maybe.jsPDF(A4_LANDSCAPE);
  return new (jsPDF as unknown as new (o: typeof A4_LANDSCAPE) => jsPDF)(A4_LANDSCAPE);
}

/**
 * Generates an Excel (.xlsx) buffer for the Test Runs Scorecard:
 * - Sheet 1: `Agregado` (summary KPI + per-run breakdown table)
 * - Sheet 2: `Casos por Run` (one line per case of each run with version, platform, environment, browser, milestone)
 */
export async function generateScorecardXlsxBuffer(
  scorecard: AggregatedScorecard,
  detailedRuns: TestRunRecord[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Centro de Execução QA TMS';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Agregado Scorecard');
  summarySheet.columns = [
    { header: 'Name', key: 'name', width: 36 },
    { header: 'Versão', key: 'appVersion', width: 16 },
    { header: 'Plataforma', key: 'platform', width: 14 },
    { header: 'Ambiente', key: 'environment', width: 16 },
    { header: 'Browser / Dispositivo', key: 'browserOrDevice', width: 22 },
    { header: 'Milestone', key: 'milestone', width: 18 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Open', key: 'open', width: 16 },
    { header: 'Passed', key: 'passed', width: 16 },
    { header: 'Failed', key: 'failed', width: 16 },
    { header: 'Skipped', key: 'skipped', width: 16 },
    { header: 'Blocked', key: 'blocked', width: 16 },
  ];

  summarySheet.addRow({
    name: 'AGREGADO TOTAL',
    appVersion: '-',
    platform: '-',
    environment: '-',
    browserOrDevice: '-',
    milestone: '-',
    total: scorecard.aggregate.total,
    open: scorecard.aggregate.open.formatted,
    passed: scorecard.aggregate.passed.formatted,
    failed: scorecard.aggregate.failed.formatted,
    skipped: scorecard.aggregate.skipped.formatted,
    blocked: scorecard.aggregate.blocked.formatted,
  });

  for (const run of scorecard.runs) {
    summarySheet.addRow({
      name: run.name,
      appVersion: run.appVersion,
      platform: run.platform,
      environment: run.environment,
      browserOrDevice: run.browserOrDevice ?? '-',
      milestone: run.milestone,
      total: run.total,
      open: run.open.formatted,
      passed: run.passed.formatted,
      failed: run.failed.formatted,
      skipped: run.skipped.formatted,
      blocked: run.blocked.formatted,
    });
  }

  const casesSheet = workbook.addWorksheet('Casos dos Runs');
  casesSheet.columns = [
    { header: 'Run ID', key: 'runId', width: 24 },
    { header: 'Run Name', key: 'runName', width: 34 },
    { header: 'Caso ID (Fonte)', key: 'sourceTestCaseId', width: 20 },
    { header: 'Badge', key: 'badgeSnapshot', width: 14 },
    { header: 'Título do Caso', key: 'titleSnapshot', width: 44 },
    { header: 'Pasta', key: 'folderSnapshot', width: 32 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Versão', key: 'appVersion', width: 16 },
    { header: 'Plataforma', key: 'platform', width: 14 },
    { header: 'Ambiente', key: 'environment', width: 16 },
    { header: 'Browser / Dispositivo', key: 'browserOrDevice', width: 22 },
    { header: 'Milestone', key: 'milestone', width: 18 },
    { header: 'Notas', key: 'notes', width: 36 },
    { header: 'Duração (s)', key: 'durationS', width: 14 },
  ];

  for (const run of detailedRuns) {
    for (const c of run.cases) {
      casesSheet.addRow({
        runId: run.id,
        runName: run.name,
        sourceTestCaseId: c.sourceTestCaseId,
        badgeSnapshot: c.badgeSnapshot,
        titleSnapshot: c.titleSnapshot,
        folderSnapshot: c.folderSnapshot,
        status: c.status,
        appVersion: run.appVersion,
        platform: run.platform,
        environment: run.environment,
        browserOrDevice: run.browserOrDevice ?? '',
        milestone: run.milestone,
        notes: c.notes ?? '',
        durationS: c.durationS ?? '',
      });
    }
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/**
 * Generates a PDF buffer for the Test Runs Scorecard showing the aggregate
 * metrics and the per-run breakdown table matching the screen (`AC-SCR-07`).
 */
export function generateScorecardPdfBuffer(scorecard: AggregatedScorecard): Buffer {
  const doc = createPdfDocument();

  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 102, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TMS - TEST RUNS SCORECARD REPORT', 14, 13);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, 14, 21);

  let y = 38;

  // Aggregate Box
  doc.setFillColor(18, 24, 38);
  doc.roundedRect(14, y, 269, 24, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Agregado (${scorecard.runs.length} Run(s) | Total: ${scorecard.aggregate.total})`, 20, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(52, 211, 153);
  doc.text(`Passed: ${scorecard.aggregate.passed.formatted}`, 20, y + 17);

  doc.setTextColor(248, 113, 113);
  doc.text(`Failed: ${scorecard.aggregate.failed.formatted}`, 72, y + 17);

  doc.setTextColor(148, 163, 184);
  doc.text(`Open: ${scorecard.aggregate.open.formatted}`, 124, y + 17);

  doc.setTextColor(251, 191, 36);
  doc.text(`Blocked: ${scorecard.aggregate.blocked.formatted}`, 176, y + 17);

  doc.setTextColor(56, 189, 248);
  doc.text(`Skipped: ${scorecard.aggregate.skipped.formatted}`, 230, y + 17);

  y += 32;

  if (scorecard.warnings.length > 0) {
    doc.setTextColor(217, 119, 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    for (const warning of scorecard.warnings) {
      doc.text(`! ${warning.messagePt}`, 14, y);
      y += 5;
    }
    y += 3;
  }

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 269, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.text('Name / Configuração', 17, y + 6);
  doc.text('Total', 120, y + 6);
  doc.text('Open', 140, y + 6);
  doc.text('Passed', 172, y + 6);
  doc.text('Failed', 204, y + 6);
  doc.text('Skipped', 234, y + 6);
  doc.text('Blocked', 260, y + 6);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  for (const run of scorecard.runs) {
    if (y > 185) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(run.name.slice(0, 52), 17, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const metaLine = `v${run.appVersion} | ${run.platform} | ${run.environment}${
      run.browserOrDevice ? ` | ${run.browserOrDevice}` : ''
    } | ${run.milestone}`;
    doc.text(metaLine.slice(0, 68), 17, y + 9);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(run.total), 120, y + 6);
    doc.text(run.open.formatted, 140, y + 6);
    doc.text(run.passed.formatted, 172, y + 6);
    doc.text(run.failed.formatted, 204, y + 6);
    doc.text(run.skipped.formatted, 234, y + 6);
    doc.text(run.blocked.formatted, 260, y + 6);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 12, 283, y + 12);
    y += 14;
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

