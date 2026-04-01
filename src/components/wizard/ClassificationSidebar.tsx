'use client';

import { useMemo } from 'react';
import {
  classifyEuAiActIntake,
  detectRiskSignals,
  type EuAiActIntakeResult,
  type RiskSignal,
} from '@/lib/classification/intake-classifier';
import type { IntakeDraftData } from '@/lib/questions/intake-schema';
import { useWizardStore } from '@/lib/store/wizard-store';

const euColorMap: Record<string, string> = {
  red: 'bg-red-50 border-red-200 text-red-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  gray: 'bg-slate-50 border-slate-200 text-slate-600',
};

const signalColorMap: Record<string, { bg: string; dot: string; text: string }> = {
  red: { bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-800' },
  amber: { bg: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-800' },
  blue: { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-800' },
};

function EuAiActPanel({ result }: { result: EuAiActIntakeResult }) {
  const colors = euColorMap[result.color] ?? euColorMap.gray;
  return (
    <div className={`rounded-lg border p-4 ${colors}`}>
      <div className="flex items-start gap-2">
        <div
          className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            result.color === 'red'
              ? 'bg-red-500'
              : result.color === 'amber'
                ? 'bg-amber-500'
                : 'bg-slate-400'
          }`}
        />
        <div>
          <p className="text-sm font-semibold leading-snug">{result.label}</p>
          <p className="text-xs mt-1 opacity-80 leading-relaxed">{result.description}</p>
        </div>
      </div>
    </div>
  );
}

function RiskSignalItem({ signal }: { signal: RiskSignal }) {
  const colors = signalColorMap[signal.severity] ?? signalColorMap.blue;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 ${colors.bg}`}>
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
      <p className={`text-xs font-medium leading-snug ${colors.text}`}>{signal.label}</p>
    </div>
  );
}

export function ClassificationSidebar() {
  const formData = useWizardStore((s) => s.formData) as Partial<IntakeDraftData>;

  const euResult = useMemo(
    () =>
      classifyEuAiActIntake({
        businessPurpose: formData.businessPurpose,
        ethicalAiAligned: formData.ethicalAiAligned,
        prohibitedPractices: formData.prohibitedPractices,
        businessArea: formData.businessArea,
        solutionType: formData.solutionType,
      }),
    [
      formData.businessPurpose,
      formData.ethicalAiAligned,
      formData.prohibitedPractices,
      formData.businessArea,
      formData.solutionType,
    ],
  );

  const riskSignals = useMemo(
    () =>
      detectRiskSignals({
        ethicalAiAligned: formData.ethicalAiAligned,
        prohibitedPractices: formData.prohibitedPractices,
        solutionType: formData.solutionType,
      }),
    [formData.ethicalAiAligned, formData.prohibitedPractices, formData.solutionType],
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">Live Classification</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">Updates as you answer questions</p>
      </div>

      {/* EU AI Act Risk Tier */}
      <div className="p-4 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          EU AI Act Risk Tier
        </h4>
        <EuAiActPanel result={euResult} />
      </div>

      {/* Preliminary Risk Signals */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Preliminary Risk Signals
        </h4>
        {riskSignals.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No risk signals detected from current answers.
          </p>
        ) : (
          <div className="space-y-2">
            {riskSignals.map((signal) => (
              <RiskSignalItem key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          These are <strong>preliminary</strong> classifications based on intake data. Final risk
          tier will be determined during the Pre-Production Risk Assessment.
        </p>
      </div>
    </div>
  );
}
