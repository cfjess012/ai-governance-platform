'use client';

import { useMemo, useState } from 'react';
import {
  classifyEuAiActIntake,
  type EuAiActIntakeResult,
} from '@/lib/classification/intake-classifier';
import type { IntakeDraftData } from '@/lib/questions/intake-schema';
import { calculateInherentRisk, hasEnoughDataForRisk } from '@/lib/risk/inherent-risk';
import type { InherentRiskResult } from '@/lib/risk/types';
import { useWizardStore } from '@/lib/store/wizard-store';

const euColorDot: Record<string, string> = {
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  gray: 'bg-slate-300',
};

/**
 * Tier badge — visually distinct for each of the 5 tiers.
 * Used in the sidebar header to make the tier instantly readable.
 */
function TierBadge({ result }: { result: InherentRiskResult }) {
  const display = result.tierDisplay;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold ${display.badgeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: display.color }} />
      {display.label}
    </div>
  );
}

/**
 * One row in the contributors list.
 * Each row has a colored bullet (severity) and a short label.
 */
function ContributorRow({
  label,
  severity,
  source,
}: {
  label: string;
  severity: 'high' | 'medium' | 'low';
  source: 'rule' | 'pattern' | 'dimension';
}) {
  const dotColor =
    severity === 'high' ? 'bg-red-400' : severity === 'medium' ? 'bg-amber-400' : 'bg-slate-300';
  const sourceLabel = source === 'rule' ? 'Rule' : source === 'pattern' ? 'Pattern' : 'Dimension';
  return (
    <div className="flex items-start gap-2 py-1">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-600 leading-snug">{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{sourceLabel}</p>
      </div>
    </div>
  );
}

/**
 * Empty state shown when there isn't enough data yet to compute the tier.
 */
function NotEnoughDataState() {
  return (
    <div className="px-2">
      <p className="text-[11px] text-slate-400 italic leading-relaxed">
        Risk tier will appear once you've entered AI type, business area, deployment regions, who is
        affected, and worst-case outcome.
      </p>
    </div>
  );
}

/**
 * The EU AI Act regulatory tag — kept separate from the inherent risk tier
 * because they're different things. EU AI Act tier is a regulatory tag;
 * inherent risk is the internal governance rating.
 */
function EuAiActTag({ result }: { result: EuAiActIntakeResult }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${euColorDot[result.color] ?? euColorDot.gray}`}
      />
      <div>
        <p className="text-[11px] font-medium text-slate-600 leading-snug">{result.label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
          EU AI Act regulatory tag
        </p>
      </div>
    </div>
  );
}

export function ClassificationSidebar() {
  const formData = useWizardStore((s) => s.formData) as Partial<IntakeDraftData>;
  const [showFrameworks, setShowFrameworks] = useState(false);

  const classificationInput = useMemo(
    () => ({
      businessProblem: formData.businessProblem,
      howAiHelps: formData.howAiHelps,
      businessArea: formData.businessArea,
      aiType: formData.aiType,
      buildOrAcquire: formData.buildOrAcquire,
      thirdPartyInvolved: formData.thirdPartyInvolved,
      auditability: formData.auditability,
      usesFoundationModel: formData.usesFoundationModel,
      whichModels: formData.whichModels,
      deploymentRegions: formData.deploymentRegions,
      lifecycleStage: formData.lifecycleStage,
      previouslyReviewed: formData.previouslyReviewed,
      highRiskTriggers: formData.highRiskTriggers,
      whoUsesSystem: formData.whoUsesSystem,
      whoAffected: formData.whoAffected,
      worstOutcome: formData.worstOutcome,
      dataSensitivity: formData.dataSensitivity,
      humanOversight: formData.humanOversight,
      differentialTreatment: formData.differentialTreatment,
      peopleAffectedCount: formData.peopleAffectedCount,
    }),
    [
      formData.businessProblem,
      formData.howAiHelps,
      formData.businessArea,
      formData.aiType,
      formData.buildOrAcquire,
      formData.thirdPartyInvolved,
      formData.auditability,
      formData.usesFoundationModel,
      formData.whichModels,
      formData.deploymentRegions,
      formData.lifecycleStage,
      formData.previouslyReviewed,
      formData.highRiskTriggers,
      formData.whoUsesSystem,
      formData.whoAffected,
      formData.worstOutcome,
      formData.dataSensitivity,
      formData.humanOversight,
      formData.differentialTreatment,
      formData.peopleAffectedCount,
    ],
  );

  const hasData = hasEnoughDataForRisk(classificationInput);
  const inherentRisk = useMemo(
    () => (hasData ? calculateInherentRisk(classificationInput) : null),
    [hasData, classificationInput],
  );
  const euResult = useMemo(() => classifyEuAiActIntake(classificationInput), [classificationInput]);

  return (
    <div>
      <p className="px-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        Preliminary Risk
      </p>

      {/* ── Inherent Risk Tier (primary) ── */}
      {inherentRisk ? (
        <div className="px-2 mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <TierBadge result={inherentRisk} />
            {inherentRisk.firedRules.length > 0 && (
              <span
                className="text-[9px] text-slate-400 uppercase tracking-wider"
                title="Forced by regulatory rule"
              >
                Rule-enforced
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {inherentRisk.tierDisplay.description}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Preliminary — governance team will confirm
          </p>
        </div>
      ) : (
        <NotEnoughDataState />
      )}

      {/* ── EU AI Act regulatory tag (secondary, separate from inherent risk) ── */}
      <div className="px-2 mb-4 pt-3 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
          EU AI Act
        </p>
        <EuAiActTag result={euResult} />
      </div>

      {/* ── Fired rules ── */}
      {inherentRisk && inherentRisk.firedRules.length > 0 && (
        <div className="px-2 mb-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-2">
            Regulatory Rules ({inherentRisk.firedRules.length})
          </p>
          {inherentRisk.firedRules.map((rule) => (
            <div key={rule.id} className="mb-2 last:mb-0">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-red-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-700 leading-snug">{rule.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{rule.reason}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">
                    {rule.citation.framework} — {rule.citation.reference}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fired patterns ── */}
      {inherentRisk && inherentRisk.firedPatterns.length > 0 && (
        <div className="px-2 mb-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-2">
            Risk Patterns ({inherentRisk.firedPatterns.length})
          </p>
          {inherentRisk.firedPatterns.map((pattern) => (
            <div key={pattern.id} className="mb-2 last:mb-0">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-amber-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-700 leading-snug">
                    {pattern.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    {pattern.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Top contributors (when no rules or patterns fired) ── */}
      {inherentRisk &&
        inherentRisk.firedRules.length === 0 &&
        inherentRisk.firedPatterns.length === 0 &&
        inherentRisk.topContributors.length > 0 && (
          <div className="px-2 mb-4 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Top Risk Factors
            </p>
            {inherentRisk.topContributors.map((c) => (
              <ContributorRow
                key={`${c.source}-${c.label}`}
                label={c.label}
                severity={c.severity}
                source={c.source}
              />
            ))}
          </div>
        )}

      {/* ── Applicable frameworks (collapsible) ── */}
      {inherentRisk && inherentRisk.applicableFrameworks.length > 0 && (
        <div className="px-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFrameworks((v) => !v)}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 hover:text-slate-600"
          >
            <span>Applicable Frameworks ({inherentRisk.applicableFrameworks.length})</span>
            <svg
              aria-hidden="true"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${showFrameworks ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showFrameworks && (
            <div className="space-y-2 animate-fade-in">
              {inherentRisk.applicableFrameworks.map((f) => (
                <div key={`${f.framework}-${f.reference}`} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-600 leading-snug">
                      {f.framework}
                    </p>
                    <p className="text-[10px] text-slate-400">{f.reference}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
