/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LoggedStepProps {
  text: string;
}

/**
 * Helper component to render terminal log lines beautifully with soft/light GIVEN, WHEN, THEN colors
 */
export const LoggedStep: React.FC<LoggedStepProps> = ({ text }) => {
  const stepRegex = /^\s*(Step\s*\|\s*\[)(GIVEN|WHEN|THEN|AND|BUT)(\])\s+(Dado que|Dado|Quando|Então|E|Mas|Given|When|Then|And|But)?(.*)$/i;
  const match = text.match(stepRegex);

  if (!match) {
    return <span>{text}</span>;
  }

  const prefix = "  Step  |  ";
  const type = match[2]; // GIVEN, WHEN, etc.
  const rawType = match[4] || ""; // Dado que, Quando, etc.
  const rest = match[5] || ""; // rest of the text

  let typeColorClass = "";
  let rawTypeColorClass = "";

  if (type.toUpperCase() === 'GIVEN') {
    typeColorClass = "text-sky-300 bg-sky-950/40 border border-sky-800/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-sky-200/90 font-bold";
  } else if (type.toUpperCase() === 'WHEN') {
    typeColorClass = "text-amber-300 bg-amber-950/40 border border-amber-800/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-amber-200/90 font-bold";
  } else if (type.toUpperCase() === 'THEN') {
    typeColorClass = "text-red-300 bg-red-950/45 border border-red-800/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-red-200/90 font-bold";
  } else {
    typeColorClass = "text-slate-300 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded font-bold text-[9.5px]";
    rawTypeColorClass = "text-slate-300 font-bold";
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 font-mono">
      <span className="text-slate-500 font-bold">{prefix}</span>
      <span className={typeColorClass}>[{type}]</span>
      {rawType && <span className={rawTypeColorClass}>{rawType}</span>}
      <span className="text-slate-300 font-medium">{rest}</span>
    </span>
  );
};
