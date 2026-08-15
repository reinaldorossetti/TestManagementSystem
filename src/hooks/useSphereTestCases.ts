/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { DbTestCaseSphere, DbFolderAcceptanceDoc } from '../utils/sqliteEngine';

export function useSphereTestCases() {
  const [selectedSphereFolder, setSelectedSphereFolder] = useState<string>('all');
  const [selectedSphereTestCaseId, setSelectedSphereTestCaseId] = useState<string | null>(null);
  const [sphereSearchQuery, setSphereSearchQuery] = useState<string>('');
  
  // Custom SQL & Script state per test case
  const [sphereCustomSqlQuery, setSphereCustomSqlQuery] = useState<Record<string, string>>({});
  const [sphereCustomScriptLanguage, setSphereCustomScriptLanguage] = useState<Record<string, string>>({});

  // Manual execution dialog
  const [manualExecutionDialogOpen, setManualExecutionDialogOpen] = useState<boolean>(false);

  // Folder creation & editing modals
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isEditingFolder, setIsEditingFolder] = useState<boolean>(false);
  const [newFolderNameValue, setNewFolderNameValue] = useState<string>('');
  const [editFolderNameValue, setEditFolderNameValue] = useState<string>('');

  // Sphere Test Case CRUD modal
  const [isCreatingSphereTestCase, setIsCreatingSphereTestCase] = useState<boolean>(false);
  const [isEditingSphereTestCase, setIsEditingSphereTestCase] = useState<boolean>(false);
  const [formSphereId, setFormSphereId] = useState<string>('');
  const [formSphereFolder, setFormSphereFolder] = useState<string>('');
  const [formSphereTitle, setFormSphereTitle] = useState<string>('');
  const [formSpherePreconditions, setFormSpherePreconditions] = useState<string>('');
  const [formSphereSteps, setFormSphereSteps] = useState<string>('');
  const [formSphereExpectedResult, setFormSphereExpectedResult] = useState<string>('');
  const [formSphereObservation, setFormSphereObservation] = useState<string>('');
  const [applyObservationToFolder, setApplyObservationToFolder] = useState<boolean>(false);

  // Acceptance Docs
  const [acceptanceDocOpen, setAcceptanceDocOpen] = useState<boolean>(false);
  const [acceptanceDocHistoryOpen, setAcceptanceDocHistoryOpen] = useState<boolean>(false);
  const [acceptanceDocEditing, setAcceptanceDocEditing] = useState<boolean>(false);
  const [acceptanceDocContent, setAcceptanceDocContent] = useState<string>('');
  const [acceptanceDocTitle, setAcceptanceDocTitle] = useState<string>('');
  const [acceptanceDocHistorySummary, setAcceptanceDocHistorySummary] = useState<string>('');

  return {
    selectedSphereFolder,
    setSelectedSphereFolder,
    selectedSphereTestCaseId,
    setSelectedSphereTestCaseId,
    sphereSearchQuery,
    setSphereSearchQuery,
    sphereCustomSqlQuery,
    setSphereCustomSqlQuery,
    sphereCustomScriptLanguage,
    setSphereCustomScriptLanguage,
    manualExecutionDialogOpen,
    setManualExecutionDialogOpen,
    isCreatingFolder,
    setIsCreatingFolder,
    isEditingFolder,
    setIsEditingFolder,
    newFolderNameValue,
    setNewFolderNameValue,
    editFolderNameValue,
    setEditFolderNameValue,
    isCreatingSphereTestCase,
    setIsCreatingSphereTestCase,
    isEditingSphereTestCase,
    setIsEditingSphereTestCase,
    formSphereId,
    setFormSphereId,
    formSphereFolder,
    setFormSphereFolder,
    formSphereTitle,
    setFormSphereTitle,
    formSpherePreconditions,
    setFormSpherePreconditions,
    formSphereSteps,
    setFormSphereSteps,
    formSphereExpectedResult,
    setFormSphereExpectedResult,
    formSphereObservation,
    setFormSphereObservation,
    applyObservationToFolder,
    setApplyObservationToFolder,
    acceptanceDocOpen,
    setAcceptanceDocOpen,
    acceptanceDocHistoryOpen,
    setAcceptanceDocHistoryOpen,
    acceptanceDocEditing,
    setAcceptanceDocEditing,
    acceptanceDocContent,
    setAcceptanceDocContent,
    acceptanceDocTitle,
    setAcceptanceDocTitle,
    acceptanceDocHistorySummary,
    setAcceptanceDocHistorySummary,
  };
}
