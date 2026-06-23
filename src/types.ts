/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScenarioType = 'success' | 'failure' | 'permission';

export interface BDDScenario {
  id: string;
  category: string;
  title: string;
  type: ScenarioType;
  given: string[];
  when: string[];
  then: string[];
  details: string;
  // Steps matching simulator actions
  simulatorActions?: {
    screen: 'login' | 'association' | 'onboarding_intro' | 'onboarding_details' | 'confirmation_dados';
    description: string;
    fieldId?: string;
    value?: string;
    delay?: number;
    expectedOutcome: 'success' | 'failure';
    errorMessage?: string;
    userRole?: 'representante_legal' | 'funcionario';
  }[];
}

export interface TestCaseResult {
  id: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  currentStepIndex: number;
  message?: string;
}
