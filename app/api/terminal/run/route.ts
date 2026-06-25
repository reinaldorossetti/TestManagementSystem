import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolveResultsDir } from '@/src/server/robot/resultsPaths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RunBody {
  command?: string;
  /** Quando true e o comando for Robot, injeta --outputdir e habilita parse posterior. */
  persist?: boolean;
  /** Identificador da execução; usado como subpasta de resultados. */
  runId?: string;
}

const looksLikeRobot = (command: string): boolean => /(^|\s)(robot|python\b.*-m\s+robot)/i.test(command);

/**
 * Local command runner (Fase 0 / MVP — sem sandbox).
 *
 * Recebe um comando, executa-o no shell da máquina e devolve stdout/stderr em
 * streaming (chunked) para ser renderizado ao vivo no xterm.js da interface.
 *
 * ATENÇÃO: executa comandos arbitrários na máquina local — destinado apenas a
 * teste/uso local. NÃO expor publicamente sem allowlist + sandbox (ver plano).
 */
export async function POST(req: Request): Promise<Response> {
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return new Response('Corpo inválido (JSON esperado).', { status: 400 });
  }

  let command = body.command?.trim();
  if (!command) {
    return new Response('Comando ausente.', { status: 400 });
  }

  // Persistência: para comandos Robot, direciona a saída para results/<runId>.
  // As opções do Robot precisam vir ANTES do caminho da suíte, por isso são
  // injetadas logo após o invocador (`robot` / `python -m robot`).
  const willPersist = Boolean(body.persist && body.runId && looksLikeRobot(command));
  if (willPersist && body.runId) {
    const outputDir = resolveResultsDir(body.runId);
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch {
      /* diretório já existe */
    }
    const options = `--outputdir "${outputDir}" --output output.xml`;
    command = command.replace(/(python[0-9]*\s+-m\s+robot|py\s+-m\s+robot|robot)\b/i, `$1 ${options}`);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          /* stream já fechado */
        }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };

      const child = spawn(command, { shell: true });

      child.stdout.on('data', (chunk: Buffer) => safeEnqueue(chunk.toString()));
      child.stderr.on('data', (chunk: Buffer) => safeEnqueue(chunk.toString()));

      child.on('error', (err: Error) => {
        safeEnqueue(`\n[ERRO] ${err.message}\n`);
        safeClose();
      });

      child.on('close', (code: number | null) => {
        safeEnqueue(`\n[PROCESSO FINALIZADO] exit code: ${code ?? 'null'}\n`);
        safeClose();
      });

      // Cliente cancelou (botão Parar / aba fechada): encerra o processo.
      req.signal.addEventListener('abort', () => {
        child.kill();
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
