import type { Metadata } from 'next';
import { TestRunsWorkspace } from '@/src/components/testRuns/TestRunsWorkspace';

export const metadata: Metadata = {
  title: 'Test Runs | Centro de Execução QA TMS',
  description: 'Gestão de ciclos de execução (Test Runs) por versão, plataforma, ambiente e browser.',
};

export default function TestRunsPage() {
  return <TestRunsWorkspace />;
}

