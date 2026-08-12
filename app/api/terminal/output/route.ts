import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { isPlausibleResultsFolderName } from '@/src/utils/robotResultsFolder';
import {
  resolveOutputXmlPath,
  resolveResultsRoot,
  RESULTS_ROOT,
} from '@/src/server/robot/resultsPaths';
import { parseRobotOutputXml } from '@/src/server/robot/outputXmlParser';
import { captureRobotReportImages } from '@/src/server/robot/reportCapture';
import { findExecutionById, replaceRun } from '@/src/server/repositories/executionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OutputBody {
  runId?: string;
  command?: string;
  /** Timestamp "YYYY-MM-DD HH:MM:SS" gerado no cliente como fallback. */
  timestamp?: string;
}

interface RobotOutputSource {
  runId: string;
  outputXmlPath: string;
}

async function collectOutputXmlCandidates(dir: string): Promise<Array<RobotOutputSource & { modifiedAt: number }>> {
  const candidates: Array<RobotOutputSource & { modifiedAt: number }> = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return candidates;
  }

  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isPlausibleResultsFolderName(entry.name)) {
        const outputPath = path.join(fullPath, 'output.xml');
        try {
          candidates.push({
            runId: entry.name,
            outputXmlPath: outputPath,
            modifiedAt: (await stat(outputPath)).mtimeMs,
          });
        } catch {
          // Pasta válida mas sem output.xml; continua recursivamente.
        }
      }
      // Varre recursivamente para suportar estruturas como results/robot_framework/RUN-.../
      const nested = await collectOutputXmlCandidates(fullPath);
      candidates.push(...nested);
    }
  }));

  return candidates;
}

/** Obtém a pasta de execução mais recente que tenha um `output.xml`.
 *  Procura no diretório configurado (ex.: results/robot_framework/) e, como
 *  compatibilidade, também no results/ padrão caso o configurado esteja vazio. */
async function findLatestRobotOutput(): Promise<RobotOutputSource | null> {
  const configuredRoot = await resolveResultsRoot();
  const defaultRoot = path.resolve(process.cwd(), RESULTS_ROOT);

  const roots = Array.from(new Set([configuredRoot, defaultRoot]));
  const allCandidates = (await Promise.all(roots.map((root) => collectOutputXmlCandidates(root)))).flat();

  return allCandidates.sort((left, right) => right.modifiedAt - left.modifiedAt)[0] ?? null;
}

/**
 * Lê o `output.xml` gerado por uma execução real do Robot Framework
 * (results/<runId>/output.xml), faz o parse para o modelo relacional do TMS e
 * devolve { execution, testCases, steps } para o cliente persistir no banco.
 */
export async function POST(req: Request): Promise<Response> {
  let body: OutputBody;
  try {
    body = (await req.json()) as OutputBody;
  } catch {
    return Response.json({ error: 'Corpo inválido (JSON esperado).' }, { status: 400 });
  }

  const requestedRunId = body.runId?.trim();
  const latestSource = requestedRunId ? null : await findLatestRobotOutput();
  const runId = requestedRunId || latestSource?.runId;
  if (!runId) {
    const configuredRoot = await resolveResultsRoot();
    return Response.json(
      { error: `Nenhum output.xml Robot encontrado em ${configuredRoot}.` },
      { status: 404 },
    );
  }

  let xmlPath: string;
  try {
    xmlPath = latestSource?.outputXmlPath ?? await resolveOutputXmlPath(runId);
  } catch {
    return Response.json({ error: 'runId inválido.' }, { status: 400 });
  }

  let xml: string;
  try {
    xml = await readFile(xmlPath, 'utf-8');
  } catch {
    return Response.json(
      { error: 'output.xml não encontrado. A execução do Robot gerou o relatório?' },
      { status: 404 },
    );
  }

  try {
    // Uma reimportação deve manter o comando original quando a execução já
    // existir no SQLite. Para uma execução somente em disco, registre uma
    // origem explícita em vez de persistir um comando vazio.
    const existingExecution = await findExecutionById(runId);
    const command = body.command?.trim()
      || existingExecution?.command
      || `[IMPORTADO] ${xmlPath}`;
    const parsed = parseRobotOutputXml(xml, {
      runId,
      command,
      resultsPath: xmlPath,
      fallbackTimestamp: body.timestamp ?? new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    // O output.xml é o artefato canônico: persista primeiro para que uma
    // captura lenta ou indisponível de HTML nunca deixe Reports sem execução.
    await replaceRun(parsed);

    let captures: Awaited<ReturnType<typeof captureRobotReportImages>> = {
      testReportPaths: {},
    };
    try {
      captures = await captureRobotReportImages(
        runId,
        parsed.testCases.map((tc) => ({ id: tc.id, robotTestId: tc.robot_test_id })),
        xmlPath,
      );
    } catch (error) {
      // O output.xml é o artefato canônico. A falta de Chromium, report.html
      // ou log.html não pode impedir o registro da execução nos Reports.
      console.warn('[TMS] Captura de report Robot ignorada:', (error as Error).message);
    }

    if (captures.suiteReportPath) {
      parsed.execution.report_screenshot_path = captures.suiteReportPath;
    }
    for (const tc of parsed.testCases) {
      const reportPath = captures.testReportPaths[tc.id];
      if (reportPath) tc.report_screenshot_path = reportPath;
    }

    // Atualiza o mesmo registro com os artefatos visuais quando disponíveis.
    if (captures.suiteReportPath || Object.keys(captures.testReportPaths).length > 0) {
      await replaceRun(parsed);
    }

    return Response.json({
      ...parsed,
      importedFrom: {
        runId,
        resultsFolder: parsed.execution.results_folder,
        outputXmlPath: xmlPath,
      },
    }, { status: 200 });
  } catch (err) {
    return Response.json(
      { error: `Falha ao processar output.xml: ${(err as Error).message}` },
      { status: 422 },
    );
  }
}
