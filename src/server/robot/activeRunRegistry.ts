import { spawn, type ChildProcess } from 'node:child_process';

const activeRuns = new Map<string, ChildProcess>();

export function registerRobotRun(runId: string, process: ChildProcess): void {
  activeRuns.set(runId, process);
}

export function unregisterRobotRun(runId?: string): void {
  if (runId) activeRuns.delete(runId);
}

/** Ends the command shell and all of its descendants, including Python/Robot. */
export function cancelRobotRun(runId: string): boolean {
  const child = activeRuns.get(runId);
  if (!child || child.exitCode !== null || child.killed) return false;

  if (process.platform === 'win32' && child.pid) {
    const taskKill = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    taskKill.on('error', () => child.kill());
  } else {
    child.kill();
  }
  return true;
}
