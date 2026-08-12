import ExcelJS from 'exceljs';
import { DbTestCaseSphere } from './sqliteEngine';
import {
  getSeverityLevel,
  getCriticalityLevel,
  getComplexityDetails,
  getStatusLabel,
} from './testCaseClassification';

const getDefaultSqlQueryExport = (caseId: string) => {
  return `-- Exemplos de Query para o Caso de Teste ${caseId}

-- 1. INSERT: Registra execução no SQLite
INSERT INTO executions (command, duration_ms, pass_count, fail_count, skip_count, report_path) 
VALUES ('robot --include ${caseId} ./', 1520, 1, 0, 0, '%ROBOT_HOME%/results/output.xml');

-- 2. UPDATE: Atualiza o status
UPDATE test_cases SET status = 'PASS', duration_ms = 1520 WHERE test_case_id = '${caseId}';`;
};

const getDefaultScriptLanguageExport = (caseId: string, title: string) => {
  return `# Script de Automação do cenário ${caseId}
*** Settings ***
Documentation    Automação para o teste: ${title || 'Caso de teste'}
Library          SeleniumLibrary

*** Test Cases ***
Executar Cenário ${caseId}
    [Tags]           ${caseId}    regression
    Dado Que O Usuário Está Logado No Sistema
    Quando Preenche Os Parâmetros Do Cenário
    Então Valida O Resultado Esperado Em Tela`;
};

// Helper to clean sheet names so Excel can load them without crashing (limit to 30 chars containing no forbidden characters)
const cleanSheetName = (folder: string) => {
  const parts = folder.split('/');
  let name = parts[parts.length - 1] || folder;
  // Replace illegal characters \ / ? * : [ ] in Excel sheets
  name = name.replace(/[\\/?*:[\]]/g, ' ');
  // Limit to 30 chars
  if (name.length > 30) {
    name = name.substring(0, 30);
  }
  return name.trim();
};

// Styles a Severity or Criticality Cell with dynamic pill fill and custom fonts matching the user's aesthetics
const applySeverityStyles = (cell: ExcelJS.Cell, val: string) => {
  cell.value = val;
  if (val === 'Critical') {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2F0FD' } // Soft light blue-grey as shown in image
    };
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
  } else if (val === 'High') {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEBE9FE' } // Soft light violet / indigo
    };
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF6366F1' } };
  } else if (val === 'Medium') {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCFCE7' } // Soft light green
    };
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
  } else {
    // Low
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' } // Soft light sky blue
    };
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0284C7' } };
  }
};

export const handleExportToExcel = async (
  testCases: DbTestCaseSphere[],
  folders: string[],
  customSqlQueries: { [key: string]: string } = {},
  customScriptLanguages: { [key: string]: string } = {},
  statusByCaseId: { [caseId: string]: string } = {},
  language: 'PT' | 'ENG' = 'PT'
) => {
  void language;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TMS QA';
  workbook.lastModifiedBy = 'TMS QA';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Dashboard Sheet: Executive Summary & Folder coverage KPI metrics
  const dashSheet = workbook.addWorksheet('📊 Resumo Executivo');
  dashSheet.views = [{ showGridLines: false }];

  // Title merge card
  dashSheet.mergeCells('B2:H3');
  const titleCell = dashSheet.getCell('B2');
  titleCell.value = 'TMS • Central de Casos de Auto-Testes';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Dark Slate Navy
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle/metadata row style
  dashSheet.mergeCells('B4:H4');
  const subtitleCell = dashSheet.getCell('B4');
  subtitleCell.value = `Plano de Testes Integrado Executável • TMS • Sincronizado em: ${new Date().toLocaleString('pt-BR')}`;
  subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // KPI CARDS:
  // Card 1: Total Casos
  dashSheet.mergeCells('B6:C6');
  const kpi1Title = dashSheet.getCell('B6');
  kpi1Title.value = 'TOTAL CASOS';
  kpi1Title.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
  kpi1Title.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi1Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  dashSheet.mergeCells('B7:C8');
  const kpi1Val = dashSheet.getCell('B7');
  kpi1Val.value = testCases.length;
  kpi1Val.font = { name: 'Segoe UI', size: 20, bold: true, color: { argb: 'FF0284C7' } };
  kpi1Val.alignment = { horizontal: 'center', vertical: 'middle' };

  // Border card 1
  for (let r = 6; r <= 8; r++) {
    for (let c = 2; c <= 3; c++) {
      dashSheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }
  }

  // Card 2: Features Grouping
  dashSheet.mergeCells('E6:F6');
  const kpi2Title = dashSheet.getCell('E6');
  kpi2Title.value = 'MÓDULOS / FEATURES';
  kpi2Title.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
  kpi2Title.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  dashSheet.mergeCells('E7:F8');
  const kpi2Val = dashSheet.getCell('E7');
  kpi2Val.value = folders.length;
  kpi2Val.font = { name: 'Segoe UI', size: 20, bold: true, color: { argb: 'FFEA580C' } };
  kpi2Val.alignment = { horizontal: 'center', vertical: 'middle' };

  // Border card 2
  for (let r = 6; r <= 8; r++) {
    for (let c = 5; c <= 6; c++) {
      dashSheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }
  }

  // Card 3: Método
  dashSheet.mergeCells('H6:I6');
  const kpi3Title = dashSheet.getCell('H6');
  kpi3Title.value = 'MÉTODO DE AUTOMAÇÃO';
  kpi3Title.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
  kpi3Title.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  dashSheet.mergeCells('H7:I8');
  const kpi3Val = dashSheet.getCell('H7');
  kpi3Val.value = 'GHERKIN ROBOT';
  kpi3Val.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF10B981' } };
  kpi3Val.alignment = { horizontal: 'center', vertical: 'middle' };

  // Border card 3
  for (let r = 6; r <= 8; r++) {
    for (let c = 8; c <= 9; c++) {
      dashSheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }
  }

  // Feature Coverage title
  dashSheet.getCell('B10').value = '📂 Cobertura de Testes por Feature / Pasta';
  dashSheet.getCell('B10').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F172A' } };

  // Feature Table Headers
  const headerRow = dashSheet.getRow(11);
  headerRow.getCell(2).value = 'NOME DA FEATURE / MÓDULO';
  headerRow.getCell(3).value = 'DIRETÓRIO DA ESPECIFICAÇÃO';
  headerRow.getCell(4).value = 'CASOS DE TESTE';
  
  for (let c = 2; c <= 4; c++) {
    const colCell = headerRow.getCell(c);
    colCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    colCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    colCell.border = {
      top: { style: 'thin', color: { argb: 'FF0284C7' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
    colCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  headerRow.height = 24;

  let currentRowIdx = 12;
  folders.forEach((folder) => {
    const rRow = dashSheet.getRow(currentRowIdx);
    const cleanLabel = folder.includes('/') ? folder.split('/').pop() || folder : folder;
    const count = testCases.filter(tc => tc.folder === folder).length;

    rRow.getCell(2).value = cleanLabel;
    rRow.getCell(2).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF334155' } };
    rRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    rRow.getCell(3).value = folder;
    rRow.getCell(3).font = { name: 'Courier New', size: 10, color: { argb: 'FF64748B' } };
    rRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    rRow.getCell(4).value = count;
    rRow.getCell(4).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0284C7' } };
    rRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    // Apply borders
    for (let c = 2; c <= 4; c++) {
      rRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
      if (currentRowIdx % 2 === 0) {
        rRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
    rRow.height = 22;
    currentRowIdx++;
  });

  // Set widths for dashboard columns
  dashSheet.getColumn(2).width = 30;
  dashSheet.getColumn(3).width = 45;
  dashSheet.getColumn(4).width = 15;
  dashSheet.getColumn(5).width = 15;
  dashSheet.getColumn(6).width = 15;
  dashSheet.getColumn(7).width = 5;
  dashSheet.getColumn(8).width = 25;
  dashSheet.getColumn(9).width = 25;

  // Headers shared between the General master list and Feature-specific sheets
  const caseHeaders = [
    { header: 'CASE ID', key: 'id', width: 12 },
    { header: 'PASTA DE TESTE', key: 'folder', width: 22 },
    { header: 'CENÁRIO / TÍTULO DO TESTE', key: 'title', width: 35 },
    { header: 'PRÉ-CONDIÇÕES ESTIPULADAS', key: 'preconditions', width: 25 },
    { header: 'PASSOS DA SUÍTE (GHERKIN / BDD)', key: 'steps', width: 40 },
    { header: 'RESULTADO ESPERADO', key: 'expected_result', width: 30 },
    { header: 'Status da última execução', key: 'last_execution_status', width: 45 },
    { header: 'Severidade', key: 'severity', width: 14 },
    { header: 'Criticidade', key: 'criticality', width: 14 },
    { header: 'Evidência Link', key: 'evidence_link', width: 26 },
    { header: 'Teste Automatizado?', key: 'is_automated', width: 15 },
    { header: 'Complexidade para Automatizar?', key: 'automation_complexity', width: 45 },
    { header: 'Observação', key: 'observation', width: 30 },
    { header: 'EXEMPLO SQL QUERY (SQLite)', key: 'sql_query', width: 40 },
    { header: 'SCRIPT AUTOMÁTICO (ROBOT)', key: 'robot_script', width: 40 },
  ];

  // Resolves the real, persisted execution status for a case, mapping the
  // internal status codes to the formal lifecycle labels (AGENTS.md). Cases that
  // were never executed report "Not Started" instead of a fabricated result.
  const getLastExecutionStatus = (id: string): string => getStatusLabel(statusByCaseId[id]);

  const applyStatusStyles = (cell: ExcelJS.Cell, statusText: string) => {
    let bgColor = 'FFF3F4F6'; // Default soft grey
    let textColor = 'FF374151'; // Dark grey

    if (statusText === 'Passed') {
      bgColor = 'FFD1FAE5'; // Soft green
      textColor = 'FF065F46'; // Deep emerald
    } else if (statusText === 'Failed') {
      bgColor = 'FFFEE2E2'; // Soft red
      textColor = 'FF991B1B'; // Deep ruby
    } else if (statusText === 'Blocked') {
      bgColor = 'FFFEF3C7'; // Soft amber
      textColor = 'FF92400E'; // Deep orange
    } else if (statusText === 'Skipped' || statusText === 'Skipped / Not Run') {
      bgColor = 'FFF3F4F6'; // Soft grey
      textColor = 'FF4B5563'; // Medium grey
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor }
    };
    cell.font = {
      name: 'Segoe UI',
      size: 9,
      bold: true,
      color: { argb: textColor }
    };
  };

  // Helper row visual configuration for data rows
  const populateDataRows = (sheet: ExcelJS.Worksheet, rowsData: DbTestCaseSphere[]) => {
    rowsData.forEach((tc, idx) => {
      const severity = getSeverityLevel(tc.title, tc.id);
      const criticality = getCriticalityLevel(severity, tc.id);
      const evidenceLink = `https://sharepoint.grupocard.local/qa/evidencia_${tc.id}.png`;
      const isAutomated = 'Sim';
      const complexityStr = getComplexityDetails(severity);
      const sqlQuery = customSqlQueries[tc.id] !== undefined ? customSqlQueries[tc.id] : getDefaultSqlQueryExport(tc.id);
      const robScript = customScriptLanguages[tc.id] !== undefined ? customScriptLanguages[tc.id] : getDefaultScriptLanguageExport(tc.id, tc.title);
      
      const folderClean = tc.folder.includes('/') ? tc.folder.split('/').pop() || tc.folder : tc.folder;
      const executionStatus = getLastExecutionStatus(tc.id);

      const values = {
        id: tc.id,
        folder: folderClean,
        title: tc.title,
        preconditions: tc.preconditions,
        steps: tc.steps,
        expected_result: tc.expected_result,
        last_execution_status: executionStatus,
        severity: severity,
        criticality: criticality,
        evidence_link: evidenceLink,
        is_automated: isAutomated,
        automation_complexity: complexityStr,
        observation: tc.observation || '- Os ajustes serão feitos numa segunda fase de melhorias.',
        sql_query: sqlQuery,
        robot_script: robScript
      };

      const addedRow = sheet.addRow(values);
      addedRow.height = 110; // Generous height for multiline readability

      const isEven = idx % 2 === 1;
      const defaultBgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

      // Style every cell in the row nicely to ensure readability
      caseHeaders.forEach((col, colIdx) => {
        const colNum = colIdx + 1;
        const cell = addedRow.getCell(colNum);
        
        // Define default border
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };

        // Alignments & Styles depending on column indexes
        if (colNum === 1) {
          // Case ID
          cell.font = { name: 'Courier New', size: 10, bold: true, color: { argb: 'FF0284C7' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        } else if (colNum === 2) {
          // Folder name
          cell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF475569' } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBgColor } };
        } else if (colNum === 3) {
          // Scenario Title
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBgColor } };
        } else if (colNum === 4) {
          // Preconditions
          cell.font = { name: 'Courier New', size: 9, color: { argb: 'FF334155' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        } else if (colNum === 5) {
          // Steps list
          cell.font = { name: 'Courier New', size: 9, color: { argb: 'FF1E293B' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // light green Gherkin syntax accent
        } else if (colNum === 6) {
          // Expected result
          cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF0369A1' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        } else if (colNum === 7) {
          // Status da última execução
          applyStatusStyles(cell, executionStatus);
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Passed,Skipped,Failed,Blocked"']
          };
        } else if (colNum === 8) {
          // Severidade -> dynamic helper
          applySeverityStyles(cell, severity);
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Dropdown Excel validation list
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Critical,High,Medium,Low"']
          };
        } else if (colNum === 9) {
          // Criticidade -> dynamic helper
          applySeverityStyles(cell, criticality);
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Dropdown Excel validation list
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Critical,High,Medium,Low"']
          };
        } else if (colNum === 10) {
          // Evidência Link (made clickable with underlines)
          cell.value = {
            text: evidenceLink,
            hyperlink: evidenceLink
          };
          cell.font = { name: 'Segoe UI', size: 9, underline: 'single', color: { argb: 'FF2563EB' } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBgColor } };
        } else if (colNum === 11) {
          // Teste Automatizado?
          cell.value = isAutomated;
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Sim,Não"']
          };
        } else if (colNum === 12) {
          // Complexidade para Automatizar?
          cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFAF0' } };
        } else if (colNum === 13) {
          // Observação
          cell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF475569' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBgColor } };
        } else if (colNum === 14 || colNum === 15) {
          // SQL and Robot script
          cell.font = { name: 'Courier New', size: 8.5, color: { argb: 'FF64748B' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    // Toggle on gridlines explicitly
    sheet.views = [{ showGridLines: true }];

    // Auto filter configuration
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rowsData.length + 1, column: caseHeaders.length }
    };
  };

  // TAB 2: DETALHES DE CASOS DE TESTE (COMPLETE GENERAL PORTFOLIO)
  const masterSheet = workbook.addWorksheet('📋 Matriz Geral de Testes');
  masterSheet.columns = caseHeaders;

  // Style Header Row in Master Sheet
  const masterHeaderRow = masterSheet.getRow(1);
  masterHeaderRow.height = 35;
  caseHeaders.forEach((col, idx) => {
    const colNum = idx + 1;
    const cell = masterHeaderRow.getCell(colNum);
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'center' : 'left', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' } // Classic dark primary slate blue
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0284C7' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  populateDataRows(masterSheet, testCases);

  // Group testCases by folder/feature and create dynamic independent sheets
  const casesByFolder: { [folder: string]: DbTestCaseSphere[] } = {};
  testCases.forEach((tc) => {
    if (!casesByFolder[tc.folder]) {
      casesByFolder[tc.folder] = [];
    }
    casesByFolder[tc.folder].push(tc);
  });

  // Create an explicit tab for each unique Feature!
  Object.entries(casesByFolder).forEach(([folderPath, casesList]) => {
    const rawSheetName = cleanSheetName(folderPath);
    // Prefix with folder icon for extreme visual layout aesthetics
    const sheetTitle = `📂 ${rawSheetName}`;
    const featureSheet = workbook.addWorksheet(sheetTitle);
    
    featureSheet.columns = caseHeaders;

    // Style Header Row in Feature-Specific Sheet (using dark professional navy theme)
    const fHeaderRow = featureSheet.getRow(1);
    fHeaderRow.height = 35;
    caseHeaders.forEach((col, idx) => {
      const colNum = idx + 1;
      const cell = fHeaderRow.getCell(colNum);
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'center' : 'left', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Royal blue variant to distinguish from general sheet
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    populateDataRows(featureSheet, casesList);
  });

  // Generate buffer and trigger secure native browser file download (using actual .xlsx mime-type)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `Plano_de_Testes_QA_Platform_TMS_${new Date().toISOString().slice(0, 10)}.xlsx`;

  triggerBrowserDownload(blob, fileName);
};

/**
 * Saves a Blob to disk as a real file download.
 *
 * The buffer above is produced asynchronously (`await writeBuffer`), so by the
 * time we click the anchor the original user gesture is gone. If the object URL
 * is revoked synchronously right after `click()`, Chromium aborts the in-flight
 * download and falls back to *navigating* to the blob URL (opening it in a new
 * tab as `blob:http://...`). We therefore defer revocation so the browser can
 * read the blob first, and keep the anchor hidden and same-tab to guarantee a
 * download instead of navigation.
 */
const triggerBrowserDownload = (blob: Blob, fileName: string): void => {
  const legacyNavigator = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean;
  };
  if (typeof legacyNavigator.msSaveOrOpenBlob === 'function') {
    legacyNavigator.msSaveOrOpenBlob(blob, fileName);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.target = '_self';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Defer cleanup: revoking immediately races the browser's download fetch.
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1500);
};
