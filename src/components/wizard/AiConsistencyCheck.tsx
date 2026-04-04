'use client';

import { useState } from 'react';
import type { ConsistencyCheckResult } from '@/app/api/ai/analyze/route';
import { intakeQuestions } from '@/config/questions';

interface AiConsistencyCheckProps {
  result: ConsistencyCheckResult | null;
  loading: boolean;
  onFixField: (field: string) => void;
}

function fieldLabel(field: string): string {
  const q = intakeQuestions.find((q) => q.field === field);
  return q?.label ?? field;
}

export function AiConsistencyCheck({ result, loading, onFixField }: AiConsistencyCheckProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-2 px-1 py-2 text-xs text-slate-400">
        <div className="w-3.5 h-3.5 border-[1.5px] border-slate-300 border-t-transparent rounded-full animate-spin" />
        Reviewing for consistency...
      </div>
    );
  }

  if (!result) return null;

  const issueCount =
    result.contradictions.length +
    result.missingRiskSignals.length +
    result.completenessGaps.length;

  if (result.overallAssessment === 'clean' && issueCount === 0) {
    return (
      <div className="mb-6 flex items-center gap-2 px-1 py-2 animate-fade-in">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs text-slate-500">No issues detected</span>
      </div>
    );
  }

  const isWarning = result.overallAssessment === 'needs_attention';
  const dotColor = isWarning ? 'bg-orange-400' : 'bg-amber-400';

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white animate-fade-in">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs text-slate-500 hover:bg-slate-50/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {issueCount} {issueCount === 1 ? 'suggestion' : 'suggestions'}
        </span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {result.contradictions.map((c) => (
            <div key={`c-${c.field1}-${c.field2}`} className="px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Contradiction</p>
              <p className="text-sm text-slate-600">
                {fieldLabel(c.field1)} vs {fieldLabel(c.field2)} &mdash; {c.issue}
              </p>
              <button
                type="button"
                onClick={() => onFixField(c.field1)}
                className="mt-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                Go to field
              </button>
            </div>
          ))}

          {result.missingRiskSignals.map((m) => (
            <div key={`m-${m.suggestedField}`} className="px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Missing signal</p>
              <p className="text-sm text-slate-600">{m.description}</p>
              <button
                type="button"
                onClick={() => onFixField(m.suggestedField)}
                className="mt-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                Go to {fieldLabel(m.suggestedField)}
              </button>
            </div>
          ))}

          {result.completenessGaps.map((g) => (
            <div key={`g-${g.field}`} className="px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Completeness</p>
              <p className="text-sm text-slate-600">
                {fieldLabel(g.field)} &mdash; {g.reason}
              </p>
              <button
                type="button"
                onClick={() => onFixField(g.field)}
                className="mt-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                Go to field
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
