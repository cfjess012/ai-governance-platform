'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useMemo, useState } from 'react';
import { intakeQuestions } from '@/config/questions';
import type { RiskTier } from '@/lib/classification/seven-dimension-scoring';
import { useInventoryStore } from '@/lib/store/inventory-store';
import {
  caseAgeInDays,
  recommendGovernancePath,
  validateTriageDecision,
} from '@/lib/triage/triage-actions';
import type { GovernancePath } from '@/types/inventory';

const riskTierColors: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
};

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

  const initialTier: RiskTier =
    useCase?.classification.riskTier !== 'pending'
      ? (useCase?.classification.riskTier as RiskTier)
      : 'medium';

  const [confirmedRiskTier, setConfirmedRiskTier] = useState<RiskTier>(initialTier);
  const [governancePath, setGovernancePath] = useState<GovernancePath>(
    recommendGovernancePath(initialTier),
  );
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const originalTier = useCase?.classification.riskTier;
  const riskTierOverridden = originalTier !== 'pending' && confirmedRiskTier !== originalTier;

  const ageInDays = useMemo(() => (useCase ? caseAgeInDays(useCase) : 0), [useCase]);

  if (!useCase) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Use case not found</h1>
          <p className="text-sm text-slate-500 mb-4">No use case with ID &quot;{id}&quot;.</p>
          <Link href="/triage" className="text-sm text-blue-600 hover:underline">
            &larr; Back to triage queue
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = () => {
    const decision = {
      confirmedRiskTier,
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
    applyTriage(useCase.id, decision, 'governance-team@example.com');
    router.push(`/inventory/${useCase.id}`);
  };

  return (
    <main className="flex-1 overflow-y-auto">
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

        {/* Auto-classification banner */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Preliminary Classification</h2>
            <span className="text-xs text-slate-400">Auto-generated from intake</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Risk tier</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${riskTierColors[useCase.classification.riskTier]}`}
              >
                {useCase.classification.riskTier === 'pending'
                  ? 'Pending'
                  : useCase.classification.riskTier.charAt(0).toUpperCase() +
                    useCase.classification.riskTier.slice(1)}
              </span>
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
          {useCase.classification.explanation.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1.5">Triggering factors:</p>
              <ul className="space-y-0.5">
                {useCase.classification.explanation.map((e) => (
                  <li key={e} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-slate-300 mt-px">&bull;</span>
                    {e}
                  </li>
                ))}
              </ul>
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

              {/* Confirmed risk tier */}
              <div className="mb-4">
                <label
                  htmlFor="confirmed-risk-tier"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Confirmed risk tier
                </label>
                <select
                  id="confirmed-risk-tier"
                  value={confirmedRiskTier}
                  onChange={(e) => {
                    const tier = e.target.value as RiskTier;
                    setConfirmedRiskTier(tier);
                    setGovernancePath(recommendGovernancePath(tier));
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                {riskTierOverridden && (
                  <p className="text-xs text-amber-700 mt-1">
                    Overriding auto-classification ({originalTier})
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
                          <span className="text-xs font-semibold text-slate-900">{cfg.title}</span>
                          <span className="text-[10px] text-slate-400">{cfg.sla}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{cfg.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

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

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Submit Triage Decision
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
