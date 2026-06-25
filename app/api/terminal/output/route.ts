import { readFile } from 'node:fs/promises';
import { resolveOutputXmlPath } from '@/src/server/robot/resultsPaths';
import { parseRobotOutputXml } from '@/src/server/robot/outputXmlParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OutputBody {
  runId?: string;
  command?: string;
  /** Timestamp "YYYY-MM-DD HH:MM:SS" gerado no cliente como fallback. */
  timestamp?: string;
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

  const runId = body.runId?.trim();
  if (!runId) {
    return Response.json({ error: 'runId ausente.' }, { status: 400 });
  }

  let xmlPath: string;
  try {
    xmlPath = resolveOutputXmlPath(runId);
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
    const parsed = parseRobotOutputXml(xml, {
      runId,
      command: body.command ?? '',
      resultsPath: xmlPath,
      fallbackTimestamp: body.timestamp ?? new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
    return Response.json(parsed, { status: 200 });
  } catch (err) {
    return Response.json(
      { error: `Falha ao processar output.xml: ${(err as Error).message}` },
      { status: 422 },
    );
  }
}
