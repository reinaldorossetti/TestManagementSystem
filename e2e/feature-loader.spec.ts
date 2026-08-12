import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  buildImportedTestCaseId,
  buildImportedTestCaseTitle,
  getManualExecutionDisplayTitle,
  getTestCaseDisplayFeature,
  getTestCaseDisplayId,
  getTestCaseDisplayTitle,
  parseRobotGherkinFeature,
} from '../src/utils/featureLoader';
import {
  extractForceTags,
  extractRobotExecutionTags,
  extractSuiteExecutionTags,
  resolveRobotFolderLabel,
} from '../src/utils/robotTagLoader';
import {
  buildFeatureRobotCommand,
  buildMultipleTestRobotCommand,
  buildSingleTestRobotCommand,
  getPythonExecutable,
} from '../src/utils/robotCommands';

test.describe('Robot Gherkin parser', () => {
  test('reads every Robot test case, including non-numeric names', () => {
    const robotFile = path.resolve(
      process.cwd(),
      'test_projects/mobile_automation_robot/atests/mobile_tests/features/cadastro_spec/cadastro_tests.robot',
    );
    const parsed = parseRobotGherkinFeature(readFileSync(robotFile, 'utf8'));

    expect(parsed.title).toBe('Cadastro_Tests');
    expect(parsed.scenarios).toHaveLength(17);
    expect(parsed.scenarios[3].tags).toEqual(['CDO04']);
    expect(parsed.scenarios[4]).toMatchObject({
      title: expect.stringContaining('05 -'),
      tags: ['CDO05'],
    });
    expect(parsed.scenarios[4].steps).toHaveLength(8);
  });
});

test.describe('Robot Force Tags folder resolution', () => {
  test('formats Force Tags as a readable TMS folder name', () => {
    const robotContent = `*** Settings ***
Force Tags    adicionar_tests

*** Test Cases ***
01 - Cenario de Teste Positivo
    No Operation`;

    expect(extractForceTags(robotContent)).toEqual(['adicionar_tests']);
    expect(resolveRobotFolderLabel(robotContent)).toBe('Adicionar Tests');
  });

  test('uses Test Tags only when Force Tags is absent', () => {
    const robotContent = `*** Settings ***
Test Tags    login_tests`;

    expect(resolveRobotFolderLabel(robotContent)).toBe('Login Tests');
  });

  test('accepts both Test Tags and Force Tags as suite execution filters', () => {
    const forceOnlySuite = `*** Settings ***
Force Tags    calculadora_cobrar

*** Test Cases ***
01 - Calcular
    [Tags]    CALCQC01
    No Operation`;
    const suiteWithTestTags = `*** Settings ***
Test Tags    adicionar_dinheiro_via_boleto
Force Tags    adicionar_dinheiro

*** Test Cases ***
01 - Adicionar
    [Tags]    ADIB01
    No Operation`;

    expect(extractSuiteExecutionTags(forceOnlySuite)).toEqual(['calculadora_cobrar']);
    expect(extractRobotExecutionTags(forceOnlySuite)).toEqual(['calculadora_cobrar', 'CALCQC01']);
    expect(extractSuiteExecutionTags(suiteWithTestTags)).toEqual([
      'adicionar_dinheiro_via_boleto',
      'adicionar_dinheiro',
    ]);
  });
});

test.describe('Single Robot test command', () => {
  test('builds the feature command with Test Tags', () => {
    const py = getPythonExecutable();
    expect(buildFeatureRobotCommand(
      'adicionar_dinheiro_via_boleto',
      'mobile_automation_robot',
    )).toBe(
      `${py} -m robot -i adicionar_dinheiro_via_boleto ./`,
    );
  });

  test('builds one include per selected case for plural TMS execution', () => {
    const py = getPythonExecutable();
    expect(buildMultipleTestRobotCommand(['@LT01', 'LT02', 'LT01'], 'robot-sample')).toBe(
      `${py} -m robot --include LT01 --include LT02 test_projects/robot-sample/`,
    );
  });

  test('includes only the selected test tag and uses the project working directory', () => {
    const py = getPythonExecutable();
    expect(buildSingleTestRobotCommand('@CT01', 'mobile_automation_robot')).toBe(
      `${py} -m robot --include CT01 ./`,
    );
  });
});

test.describe('Workspace import title normalization', () => {
  test('derives TC-01 from 01 or 001 in the scenario description', () => {
    for (const prefix of ['01', '001']) {
      const scenarioTitle = `${prefix} - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto`;
      const caseId = buildImportedTestCaseId(['@TC-018'], scenarioTitle, 'TC-018');

      expect(caseId).toBe('TC-01');
      expect(buildImportedTestCaseTitle(caseId, scenarioTitle)).toBe(
        'TC-01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto',
      );
    }
  });

  test('does not duplicate an existing TC prefix during TMS import', () => {
    const importedTitle =
      'TC-018 - Cenário de Teste Positivo - 01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto';

    const persistedTitle = buildImportedTestCaseTitle('TC-018', importedTitle);

    expect(persistedTitle).toBe(importedTitle);
    expect(getTestCaseDisplayId('TC-018', persistedTitle)).toBe('TC-01');
    expect(getTestCaseDisplayTitle('TC-018', persistedTitle)).toBe(
      'Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto',
    );
  });

  test('keeps the standard prefix for an unprefixed scenario', () => {
    const persistedTitle = buildImportedTestCaseTitle(
      'TC-019',
      'Validar compartilhar o comprovante',
    );

    expect(persistedTitle).toBe(
      'TC-019 - Cenário de Teste Positivo - Validar compartilhar o comprovante',
    );
    expect(getTestCaseDisplayTitle('TC-019', persistedTitle)).toBe(
      'Validar compartilhar o comprovante',
    );
  });

  test('hides duplicated prefixes from legacy TMS records', () => {
    const legacyTitle =
      'TC-018 - Cenário de Teste Positivo - TC-018 - Cenário de Teste Positivo - 01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto';

    expect(getTestCaseDisplayId('TC-018', legacyTitle)).toBe('TC-01');
    expect(getTestCaseDisplayTitle('TC-018', legacyTitle)).toBe(
      'Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto',
    );
  });

  test('hides Force Tags folder prefix from displayed case ID', () => {
    const persistedTitle =
      'ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto';

    expect(
      getTestCaseDisplayId(
        'ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01',
        persistedTitle,
      ),
    ).toBe('TC-01');
  });

  test('separates feature and scenario title for manual execution', () => {
    const caseId = 'ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01';
    const title = 'ADICIONAR-DINHEIRO-VIA-BOLETO-TC-01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto';

    expect(getTestCaseDisplayFeature(caseId)).toBe('ADICIONAR-DINHEIRO-VIA-BOLETO');
    expect(getManualExecutionDisplayTitle(caseId, title)).toBe(
      'TC-01 - Cenario de Teste Positivo - Validar adicionar dinheiro via Boleto',
    );
  });

  test('keeps non-prefixed IDs unchanged in display', () => {
    expect(getTestCaseDisplayId('ADIB02', 'Validar Compartilhar do Boleto')).toBe('ADIB02');
  });
});
