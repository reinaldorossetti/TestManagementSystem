import type { Metadata } from 'next';
import { TestRunsScorecardPageView } from '@/src/components/testRuns/TestRunsScorecardPageView';

export const metadata: Metadata = {
  title: 'Test Runs Scorecard | Centro de Execução QA TMS',
  description: 'Scorecard comparativo de ciclos de teste por milestone, runs e período.',
};

export default function TestRunsScorecardPage() {
  return <TestRunsScorecardPageView />;
}

