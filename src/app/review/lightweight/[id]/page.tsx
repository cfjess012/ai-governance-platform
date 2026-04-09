'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { intakeQuestions } from '@/config/questions';
import { useInventoryStore } from '@/lib/store/inventory-store';
import {
  type LightweightReviewInput,
  validateLightweightReview,
} from '@/lib/triage/lightweight-review';
import type { LightweightDecision } from '@/types/inventory';

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
  'whoUsesSystem',
  'whoAffected',
  'worstOutcome',
  'dataSensitivity',
];

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

export default function LightweightReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const useCase = useInventoryStore((s) => s.useCases.find((uc) => uc.id === id));
  const applyLightweightReview = useInventoryStore((s) => s.applyLightweightReview);

  const [intakeAccurate, setIntakeAccurate] = useState(false);
  const [basicControlsConfirmed, setBasicControlsConfirmed] = useState(false);
  const [escalationContact, setEscalationContact] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [decision, setDecision] = useState<LightweightDecision>('approve');
  const [approvalConditions, setApprovalConditions] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  if (!useCase) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Use case not found</h1>
        <p className="text-sm text-slate-500 mb-4">No use case with ID &quot;{id}&quot;.</p>
        <Link href="/inventory" className="text-sm text-blue-600 hover:underline">
          &larr; Back to inventory
        </Link>
      </div>
    );
  }

  // A case is eligible for lightweight review when it's either:
  //   (a) already in `lightweight_review` status — auto-routed by the
  //       Layer 1 intake router without needing a triage step, OR
  //   (b) has a completed triage with governancePath === 'lightweight' —
  //       the standard path through the governance team.
  const isInLightweightQueue = useCase.status === 'lightweight_review';
  const triageSaidLightweight = useCase.triage?.governancePath === 'lightweight';
  const isEligibleForLightweight = isInLightweightQueue || triageSaidLightweight;
  if (!isEligibleForLightweight) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          This case is not on the lightweight path
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Lightweight review is only available for cases in the lightweight queue or triaged with
          the lightweight governance path. This case is currently{' '}
          <strong>{useCase.status.replace(/_/g, ' ')}</strong>.
        </p>
        <Link href={`/inventory/${useCase.id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to case
        </Link>
      </div>
    );
  }

  const handleSubmit = () => {
    const input: LightweightReviewInput = {
      intakeAccurate,
      basicControlsConfirmed,
      escalationContact,
      reviewNotes,
      decision,
      approvalConditions: decision === 'approve' ? approvalConditions || undefined : undefined,
      rejectionReason:
        decision === 'changes_requested' || decision === 'reject' ? rejectionReason : undefined,
    };

    const validationErrors = validateLightweightReview(input);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    applyLightweightReview(useCase.id, input, 'governance-team@example.com');
    router.push(`/inventory/${useCase.id}`);
  };

  const decisionConfig: Record<
    LightweightDecision,
    { label: string; desc: string; classes: string }
  > = {
    approve: {
      label: 'Approve',
      desc: 'All checks passed. Use case is cleared for production with optional conditions.',
      classes: 'border-emerald-300 bg-emerald-50/50 text-emerald-700',
    },
    changes_requested: {
      label: 'Request Changes',
      desc: 'Specific issues need to be addressed before approval. Provide details below.',
      classes: 'border-amber-300 bg-amber-50/50 text-amber-700',
    },
    escalate: {
      label: 'Escalate to Standard Assessment',
      desc: 'Lightweight review is insufficient. The case needs the full standard assessment.',
      classes: 'border-orange-300 bg-orange-50/50 text-orange-700',
    },
    reject: {
      label: 'Reject',
      desc: 'The use case cannot proceed in its current form. Provide a reason.',
      classes: 'border-red-300 bg-red-50/50 text-red-700',
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <Link href={`/inventory/${useCase.id}`} className="hover:text-blue-600 transition-colors">
          {useCase.intake.useCaseName}
        </Link>
        <span>/</span>
        <span className="text-slate-600">Lightweight Review</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lightweight Review</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Single-reviewer approval for low-risk use cases. Verify intake accuracy, confirm basic
          controls, and make a decision.
        </p>
      </div>

      {/* Triage context */}
      {useCase.triage && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-700">Triage Context</h2>
            <span className="text-xs text-slate-400">Triaged by {useCase.triage.triagedBy}</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">
            <strong>Confirmed inherent tier:</strong>{' '}
            {useCase.triage.confirmedInherentTier
              .replace('_', '-')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
            {' · '}
            <strong>Assigned reviewer:</strong> {useCase.triage.assignedReviewer}
          </p>
          {useCase.triage.triageNotes && (
            <p className="text-xs text-slate-600 mt-2">
              <strong>Triage notes:</strong> {useCase.triage.triageNotes}
            </p>
          )}
        </div>
      )}

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

        {/* Review form (right, 1 col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Review Checklist</h2>

            {/* Checkboxes */}
            <div className="space-y-3 mb-5">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={intakeAccurate}
                  onChange={(e) => setIntakeAccurate(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500/10"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  <strong>Intake is accurate.</strong> I have reviewed the intake answers against
                  the actual system and they match.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={basicControlsConfirmed}
                  onChange={(e) => setBasicControlsConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500/10"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  <strong>Basic controls confirmed.</strong> Logging, error handling, and the
                  ability to disable the system if needed are in place.
                </span>
              </label>
            </div>

            {/* Escalation contact */}
            <div className="mb-4">
              <label
                htmlFor="escalation-contact"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Escalation contact <span className="text-red-500">*</span>
              </label>
              <input
                id="escalation-contact"
                type="text"
                value={escalationContact}
                onChange={(e) => setEscalationContact(e.target.value)}
                placeholder="oncall@example.com"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Who is paged if this AI system fails or causes an incident?
              </p>
            </div>

            {/* Review notes */}
            <div className="mb-4">
              <label
                htmlFor="review-notes"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Review notes <span className="text-red-500">*</span>
              </label>
              <textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="What did you check? What concerns did you find? Why is this case appropriate for lightweight review?"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Decision */}
            <fieldset className="mb-4">
              <legend className="block text-xs font-medium text-slate-600 mb-1.5">Decision</legend>
              <div className="space-y-2">
                {(
                  ['approve', 'changes_requested', 'escalate', 'reject'] as LightweightDecision[]
                ).map((d) => {
                  const cfg = decisionConfig[d];
                  const isSelected = decision === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDecision(d)}
                      className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                        isSelected
                          ? cfg.classes
                          : 'border-slate-200 bg-white/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-0.5">{cfg.label}</div>
                      <p className="text-[11px] text-slate-500 leading-snug">{cfg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Conditional fields based on decision */}
            {decision === 'approve' && (
              <div className="mb-4">
                <label
                  htmlFor="approval-conditions"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Approval conditions (optional)
                </label>
                <textarea
                  id="approval-conditions"
                  value={approvalConditions}
                  onChange={(e) => setApprovalConditions(e.target.value)}
                  rows={2}
                  placeholder="Any conditions the team must meet (e.g., quarterly review, monitoring requirements)..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {(decision === 'changes_requested' || decision === 'reject') && (
              <div className="mb-4">
                <label
                  htmlFor="rejection-reason"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder={
                    decision === 'reject'
                      ? 'Why is this use case being rejected?'
                      : 'What changes are needed before approval?'
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

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
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
