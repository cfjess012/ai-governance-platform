'use client';

import { useMemo } from 'react';
import {
  classifyEuAiActIntake,
  detectRiskSignals,
  type RiskSignal,
} from '@/lib/classification/intake-classifier';
import type { IntakeDraftData } from '@/lib/questions/intake-schema';
import { useWizardStore } from '@/lib/store/wizard-store';

const severityDot: Record<string, string> = {
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
};

function SignalItem({ signal }: { signal: RiskSignal }) {
  const dot = severityDot[signal.severity] ?? severityDot.blue;
  return (
    <div className="flex items-start gap-2 py-1">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
      <p className="text-[12px] text-slate-500 leading-relaxed">{signal.label}</p>
    </div>
  );
}

export function ClassificationSidebar() {
  const formData = useWizardStore((s) => s.formData) as Partial<IntakeDraftData>;

  const classificationInput = useMemo(
    () => ({
      businessProblem: formData.businessProblem,
      howAiHelps: formData.howAiHelps,
      businessArea: formData.businessArea,
      aiType: formData.aiType,
      buildOrAcquire: formData.buildOrAcquire,
      highRiskTriggers: formData.highRiskTriggers,
      deploymentRegions: formData.deploymentRegions,
      worstOutcome: formData.worstOutcome,
      humanOversight: formData.humanOversight,
    }),
    [
      formData.businessProblem,
      formData.howAiHelps,
      formData.businessArea,
      formData.aiType,
      formData.buildOrAcquire,
      formData.highRiskTriggers,
      formData.deploymentRegions,
      formData.worstOutcome,
      formData.humanOversight,
    ],
  );

  const euResult = useMemo(() => classifyEuAiActIntake(classificationInput), [classificationInput]);
  const riskSignals = useMemo(() => detectRiskSignals(classificationInput), [classificationInput]);

  const tierDot =
    euResult.color === 'red'
      ? 'bg-red-400'
      : euResult.color === 'amber'
        ? 'bg-amber-400'
        : 'bg-slate-300';

  return (
    <div>
      <p className="px-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        Classification
      </p>

      <div className="px-2 mb-3">
        <div className="flex items-start gap-2">
          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${tierDot}`} />
          <div>
            <p className="text-[12px] font-medium text-slate-700 leading-snug">{euResult.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              {euResult.description}
            </p>
          </div>
        </div>
      </div>

      {riskSignals.length > 0 && (
        <div className="px-2">
          <p className="text-[11px] text-slate-400 mb-1">Risk signals</p>
          {riskSignals.map((signal) => (
            <SignalItem key={signal.id} signal={signal} />
          ))}
        </div>
      )}

      {riskSignals.length === 0 && (
        <p className="px-2 text-[11px] text-slate-400 italic">No signals yet</p>
      )}
    </div>
  );
}
