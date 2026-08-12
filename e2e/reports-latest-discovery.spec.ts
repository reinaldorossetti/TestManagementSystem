import { test, expect } from './fixtures';
import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';

const MINIMAL_OUTPUT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<robot generated="2026-07-27 10:00:00.000">
  <suite name="Latest Discovery Test">
    <test id="s1-t1" name="Descoberta em Diretorio Configurado">
      <status status="PASS" elapsed="1.234"></status>
    </test>
  </suite>
  <statistics>
    <total>
      <stat pass="1" fail="0">All Tests</stat>
    </total>
  </statistics>
</robot>
`;

test.describe('Latest Robot report discovery respects configured directory', () => {
  test('Given output.xml inside results/robot_framework/, when importing latest report, then it is discovered and persisted', async ({
    request,
  }) => {
    const configuredDir = 'results/robot_framework/';
    const runFolder = 'RUN-LATEST-DISCOVERY-TEST';
    const outputDir = path.resolve(configuredDir, runFolder);
    const outputXmlPath = path.join(outputDir, 'output.xml');

    const beforeSettings = await request.get('/api/terminal/settings');
    expect(beforeSettings.ok()).toBeTruthy();
    const originalSettings = await beforeSettings.json() as { resultsDirectory: string };

    try {
      const putRes = await request.put('/api/terminal/settings', {
        data: { resultsDirectory: configuredDir },
      });
      expect(putRes.ok()).toBeTruthy();

      await mkdir(outputDir, { recursive: true });
      await writeFile(outputXmlPath, MINIMAL_OUTPUT_XML, 'utf-8');

      const importRes = await request.post('/api/terminal/output', { data: {} });
      expect(importRes.ok()).toBeTruthy();

      const imported = await importRes.json() as {
        execution: {
          id: string;
          results_path: string;
          results_folder?: string;
          total_tests: number;
          passed: number;
        };
        importedFrom: { runId: string; outputXmlPath: string; resultsFolder?: string };
      };

      expect(imported.importedFrom.runId).toBe(runFolder);
      expect(imported.importedFrom.outputXmlPath).toBe(outputXmlPath);
      expect(imported.execution.results_path).toBe(outputXmlPath);
      expect(imported.execution.results_folder).toBe(runFolder);
      expect(imported.execution.total_tests).toBe(1);
      expect(imported.execution.passed).toBe(1);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
      await request.put('/api/terminal/settings', {
        data: { resultsDirectory: originalSettings.resultsDirectory },
      });
    }
  });
});
