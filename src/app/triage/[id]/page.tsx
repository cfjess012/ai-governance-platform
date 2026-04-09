'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useMemo, useState } from 'react';
import { intakeQuestions } from '@/config/questions';
import { calculateInherentRisk } from '@/lib/risk/inherent-risk';
import { type InherentRiskTier, TIER_DISPLAY } from '@/lib/risk/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useSessionStore } from '@/lib/store/session-store';
import {
  caseAgeInDays,
  recommendGovernancePath,
  validateTriageDecision,
} from '@/lib/triage/triage-actions';
import type { GovernancePath } from '@/types/inventory';

const ALL_TIERS: InherentRiskTier[] = ['low', 'medium_low', 'medium', 'medium_high', 'high'];

const pathDescriptions: Record<
  GovernancePath,
  { title: string; desc: string; sla: string; sections: string }
> = {
  lightweight: {
    title: 'Lightweight Review',
    desc: 'Single-reviewer approval. Use for low-risk internal tools, well-understood vendor products, and non-decisional systems.',
    sla: '~3 business days',
    sections: '~10 questions, single reviewer',
  },
  standard: {
    title: 'Standard Assessment',
    desc: 'Full pre-production assessment with conditional sections activated by risk profile. Use for medium-risk customer-facing or decision-support systems.',
    sla: '~10 business days',
    sections: '~30-45 questions, multi-stakeholder input',
  },
  full: {
    title: 'Full Assessment + Committee Review',
    desc: 'Complete assessment with mandatory evidence collection, scheduled review meeting, and governance committee approval. Use for high-risk or critical-risk systems.',
    sla: '~3-4 weeks',
    sections: '~59 questions, evidence required, committee approval',
  },
};

function formatFieldValue(value: unknown, fieldName: string): string {
  if (value === undefined || value === null || value === '') return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '\u2014';
    const q = intakeQuestions.find((q) => q.field === fieldName);
    if (q?.options) {
      return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(', ');
    }
    return value.join(', ');
  }
  const q = intakeQuestions.find((q) => q.field === fieldName);
  if (q?.options) {
    return q.options.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

const KEY_INTAKE_FIELDS = [
  'businessProblem',
  'howAiHelps',
  'aiType',
  'buildOrAcquire',
  'thirdPartyInvolved',
  'vendorName',
  'usesFoundationModel',
  'deploymentRegions',
  'lifecycleStage',
  'previouslyReviewed',
  'highRiskTriggers',
  'whoAffected',
  'worstOutcome',
  'dataSensitivity',
  'humanOversight',
  'differentialTreatment',
  'peopleAffectedCount',
  'reviewUrgency',
];

export default function TriageDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const useCase = useInventoryStore((s) => s.useCases.find((uc) => uc.id === id));
  const applyTriage = useInventoryStore((s) => s.applyTriage);
  const updateUseCase = useInventoryStore((s) => s.updateUseCase);
  const sessionUser = useSessionStore((s) => s.user);

  // The case's stored inherentRisk OR a fresh computation if missing (defensive backfill)
  const inherentRisk = useMemo(() => {
    if (!useCase) return null;
    if (useCase.inherentRisk) return useCase.inherentRisk;
    return calculateInherentRisk(useCase.intake);
  }, [useCase]);

  const autoCalculatedTier: InherentRiskTier = inherentRisk?.tier ?? 'medium';

  const [confirmedTier, setConfirmedTier] = useState<InherentRiskTier>(autoCalculatedTier);
  const [governancePath, setGovernancePath] = useState<GovernancePath>(
    recommendGovernancePath(autoCalculatedTier),
  );
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [euAiActTier, setEuAiActTier] = useState(useCase?.classification.euAiActTier ?? 'pending');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const riskTierOverridden = confirmedTier !== autoCalculatedTier;

  const ageInDays = useMemo(() => (useCase ? caseAgeInDays(useCase) : 0), [useCase]);

  if (!useCase) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Use case not found</h1>
        <p className="text-sm text-slate-500 mb-4">No use case with ID &quot;{id}&quot;.</p>
        <Link href="/triage" className="text-sm text-blue-600 hover:underline">
          &larr; Back to triage queue
        </Link>
      </div>
    );
  }

  const handleSubmit = () => {
    const decision = {
      confirmedInherentTier: confirmedTier,
      riskTierOverridden,
      overrideReason: riskTierOverridden ? overrideReason : undefined,
      governancePath,
      assignedReviewer,
      triageNotes,
    };
    const validationErrors = validateTriageDecision(decision);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    applyTriage(useCase.id, decision, sessionUser?.name ?? 'Unknown Analyst');
    // P8: persist EU AI Act classification override during triage
    if (euAiActTier !== useCase.classification.euAiActTier) {
      updateUseCase(useCase.id, {
        classification: {
          ...useCase.classification,
          euAiActTier: euAiActTier as 'prohibited' | 'high' | 'limited' | 'minimal' | 'pending',
        },
      });
    }
    setSubmitted(true);
    // Brief delay so the user sees confirmation before redirect
    setTimeout(() => router.push(`/inventory/${useCase.id}`), 1200);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/triage" className="hover:text-blue-600 transition-colors">
          Triage Queue
        </Link>
        <span>/</span>
        <span className="text-slate-600">{useCase.intake.useCaseName}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {useCase.intake.useCaseName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Submitted by {useCase.submittedBy} · {ageInDays} day{ageInDays === 1 ? '' : 's'} ago ·{' '}
            {useCase.intake.businessArea}
          </p>
        </div>
      </div>

      {/* ── Auto-calculated inherent risk panel ── */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Auto-Calculated Inherent Risk</h2>
          <span className="text-xs text-slate-400">Computed from intake answers</span>
        </div>

        {/* Tier + EU AI Act + Lifecycle */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Inherent tier</p>
            {inherentRisk ? (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${inherentRisk.tierDisplay.badgeClasses}`}
              >
                {inherentRisk.tierDisplay.label}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Pending</span>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">EU AI Act</p>
            <p className="text-sm font-medium text-slate-700">
              {useCase.classification.euAiActTier}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Lifecycle</p>
            <p className="text-sm font-medium text-slate-700">
              {useCase.intake.lifecycleStage?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Tier description */}
        {inherentRisk && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              {inherentRisk.tierDisplay.description}
            </p>
          </div>
        )}

        {/* Fired regulatory rules */}
        {inherentRisk && inherentRisk.firedRules.length > 0 && (
          <div className="mb-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
              Regulatory Rules Fired ({inherentRisk.firedRules.length})
            </p>
            <ul className="space-y-2">
              {inherentRisk.firedRules.map((rule) => (
                <li key={rule.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-red-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{rule.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{rule.reason}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 italic">
                      {rule.citation.framework} — {rule.citation.reference}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fired confluence patterns */}
        {inherentRisk && inherentRisk.firedPatterns.length > 0 && (
          <div className="mb-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
              Risk Patterns Detected ({inherentRisk.firedPatterns.length})
            </p>
            <ul className="space-y-2">
              {inherentRisk.firedPatterns.map((pattern) => (
                <li key={pattern.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-amber-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{pattern.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {pattern.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top contributors (when no rules/patterns) */}
        {inherentRisk &&
          inherentRisk.firedRules.length === 0 &&
          inherentRisk.firedPatterns.length === 0 &&
          inherentRisk.topContributors.length > 0 && (
            <div className="mb-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Top Risk Factors
              </p>
              <ul className="space-y-1">
                {inherentRisk.topContributors.map((c) => (
                  <li
                    key={`${c.source}-${c.label}`}
                    className="text-xs text-slate-600 flex items-start gap-1.5"
                  >
                    <span className="text-slate-300 mt-px">&bull;</span>
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Applicable frameworks (collapsed by default — handled in sidebar; here just count) */}
        {inherentRisk && inherentRisk.applicableFrameworks.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <strong className="text-slate-600">
                {inherentRisk.applicableFrameworks.length} regulatory framework
                {inherentRisk.applicableFrameworks.length === 1 ? '' : 's'} apply:
              </strong>{' '}
              {inherentRisk.applicableFrameworks.map((f) => f.framework).join(', ')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intake summary (left, 2 cols) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Intake Summary</h2>
            </div>
            <dl className="divide-y divide-slate-100">
              {KEY_INTAKE_FIELDS.map((fieldName) => {
                const q = intakeQuestions.find((q) => q.field === fieldName);
                if (!q) return null;
                const val = (useCase.intake as Record<string, unknown>)[fieldName];
                if (val === undefined || val === '') return null;
                return (
                  <div key={fieldName} className="px-5 py-2.5">
                    <dt className="text-xs text-slate-400">{q.label}</dt>
                    <dd className="text-sm text-slate-700 mt-0.5">
                      {formatFieldValue(val, fieldName)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        {/* Triage decision form (right, 1 col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Triage Decision</h2>

            {/* Confirmed inherent tier */}
            <div className="mb-4">
              <label
                htmlFor="confirmed-tier"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Confirmed inherent tier
              </label>
              <select
                id="confirmed-tier"
                value={confirmedTier}
                onChange={(e) => {
                  const tier = e.target.value as InherentRiskTier;
                  setConfirmedTier(tier);
                  setGovernancePath(recommendGovernancePath(tier));
                }}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {TIER_DISPLAY[tier].label}
                  </option>
                ))}
              </select>
              {riskTierOverridden && (
                <p className="text-xs text-amber-700 mt-1">
                  Overriding auto-calculated tier ({TIER_DISPLAY[autoCalculatedTier].label})
                </p>
              )}
            </div>

            {/* Override reason */}
            {riskTierOverridden && (
              <div className="mb-4">
                <label
                  htmlFor="override-reason"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Reason for override <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  placeholder="Explain why you're overriding the auto-classification..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Governance path */}
            <fieldset className="mb-4">
              <legend className="block text-xs font-medium text-slate-600 mb-1.5">
                Governance path
              </legend>
              <div className="space-y-2">
                {(['lightweight', 'standard', 'full'] as GovernancePath[]).map((p) => {
                  const cfg = pathDescriptions[p];
                  const isSelected = governancePath === p;
                  const isRecommended = recommendGovernancePath(autoCalculatedTier) === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGovernancePath(p)}
                      className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                        isSelected
                          ? 'border-blue-400 bg-white'
                          : 'border-slate-200 bg-white/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-slate-900">
                          {cfg.title}
                          {isRecommended && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700">
                              Recommended
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">{cfg.sla}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{cfg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* P8: EU AI Act classification override */}
            <div className="mb-4">
              <label
                htmlFor="eu-ai-act-tier"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                EU AI Act Classification
              </label>
              <select
                id="eu-ai-act-tier"
                value={euAiActTier}
                onChange={(e) => setEuAiActTier(e.target.value as typeof euAiActTier)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Not Yet Determined</option>
                <option value="minimal">Minimal Risk</option>
                <option value="limited">Limited Risk</option>
                <option value="high">High Risk (Annex III)</option>
                <option value="prohibited">Unacceptable Risk</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Auto-detected: {useCase.classification.euAiActTier}. Override if your assessment
                differs.
              </p>
            </div>

            {/* Assigned reviewer */}
            <div className="mb-4">
              <label
                htmlFor="assigned-reviewer"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Assigned reviewer <span className="text-red-500">*</span>
              </label>
              <input
                id="assigned-reviewer"
                type="text"
                value={assignedReviewer}
                onChange={(e) => setAssignedReviewer(e.target.value)}
                placeholder="reviewer@example.com"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Triage notes */}
            <div className="mb-4">
              <label
                htmlFor="triage-notes"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Triage notes <span className="text-red-500">*</span>
              </label>
              <textarea
                id="triage-notes"
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                rows={4}
                placeholder="Summarize your triage decision and any concerns the reviewer should know about..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Visible to the assigned reviewer and the business user.
              </p>
            </div>

            {errors.length > 0 && (
              <div className="mb-4 p-2.5 rounded-md border border-red-200 bg-red-50">
                <ul className="space-y-0.5">
                  {errors.map((e) => (
                    <li key={e} className="text-xs text-red-700">
                      &bull; {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {submitted ? (
              <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50 text-center">
                <p className="text-sm font-semibold text-emerald-800">
                  Triage decision submitted successfully
                </p>
                <p className="text-xs text-emerald-600 mt-1">Redirecting to case detail…</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Submit Triage Decision
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
