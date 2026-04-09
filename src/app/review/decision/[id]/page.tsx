'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TIER_DISPLAY } from '@/lib/risk/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import type { AIUseCaseStatus } from '@/types/inventory';

/**
 * Decision review — the post-assessment approval screen.
 *
 * Reviewers land here after a user submits a pre-production assessment.
 * The case is in `decision_pending` status. The reviewer reads the
 * scoring result + EU AI Act determination + rule firings and picks one
 * of four decisions: approve, approve with conditions, request changes,
 * or reject. On submit, status advances and the decision is logged to
 * the case timeline.
 *
 * Unlike lightweight review, this is a heavier-weight review — there's
 * no checklist, the reviewer is expected to read the assessment and make
 * a judgment call.
 */

type Decision = 'approve' | 'approve_with_conditions' | 'changes_requested' | 'rejected';

const DECISION_STATUS: Record<Decision, AIUseCaseStatus> = {
  approve: 'approved',
  approve_with_conditions: 'approved',
  changes_requested: 'changes_requested',
  rejected: 'rejected',
};

export default function DecisionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const useCase = useInventoryStore((s) => s.useCases.find((uc) => uc.id === id));
  const updateStatus = useInventoryStore((s) => s.updateStatus);
  const updateUseCase = useInventoryStore((s) => s.updateUseCase);

  const [decision, setDecision] = useState<Decision | undefined>();
  const [conditions, setConditions] = useState('');
  const [rationale, setRationale] = useState('');
  const [touched, setTouched] = useState(false);

  if (!useCase) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-slate-500">Case not found.</p>
        <Link href="/inventory" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          ← Back to inventory
        </Link>
      </div>
    );
  }

  const eligibleStatuses: AIUseCaseStatus[] = ['decision_pending', 'assessment_in_progress'];
  if (!eligibleStatuses.includes(useCase.status)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Not ready for decision</h1>
        <p className="mt-2 text-sm text-slate-600">
          Decision review is only available for cases in <strong>decision pending</strong> status.
          This case is currently <strong>{useCase.status.replace(/_/g, ' ')}</strong>.
        </p>
        <Link
          href={`/inventory/${useCase.id}`}
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          View case details
        </Link>
      </div>
    );
  }

  const errors: string[] = [];
  if (!decision) errors.push('Pick a decision to continue');
  if (decision === 'approve_with_conditions' && conditions.trim().length < 10) {
    errors.push('Describe the approval conditions (at least 10 characters)');
  }
  if (
    (decision === 'changes_requested' || decision === 'rejected') &&
    rationale.trim().length < 10
  ) {
    errors.push('Provide a rationale (at least 10 characters)');
  }

  const handleSubmit = () => {
    setTouched(true);
    if (errors.length > 0 || !decision) return;

    const nextStatus = DECISION_STATUS[decision];
    const decisionNote =
      decision === 'approve_with_conditions'
        ? `Approved with conditions: ${conditions.trim()}`
        : decision === 'changes_requested'
          ? `Changes requested: ${rationale.trim()}`
          : decision === 'rejected'
            ? `Rejected: ${rationale.trim()}`
            : 'Approved';

    // Record the decision note in the case's classification.explanation so
    // the audit trail captures why the reviewer landed where they did.
    updateUseCase(useCase.id, {
      classification: {
        ...useCase.classification,
        explanation: [...useCase.classification.explanation, decisionNote],
      },
    });
    updateStatus(useCase.id, nextStatus, 'mock-reviewer@example.com');
    router.push(`/inventory/${useCase.id}`);
  };

  const inherentTier = useCase.inherentRisk?.tier;
  const tierDisplay = inherentTier ? TIER_DISPLAY[inherentTier] : null;
  const scoringTier = useCase.scoring?.riskTier;
  const scoringTierDisplay = scoringTier ? TIER_DISPLAY[scoringTier] : null;
  const euTier = useCase.classification.euAiActTier;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/inventory"
          className="text-xs text-slate-500 transition-colors hover:text-slate-700"
        >
          ← Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Decision review
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Assessment complete. Review the case, the scoring, and make the call.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: case summary + risk cards */}
        <div className="space-y-4 lg:col-span-2">
          {/* Case summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Case
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">
              {useCase.intake.useCaseName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Owner: {useCase.intake.useCaseOwner}</p>
            <p className="mt-3 text-sm text-slate-700">{useCase.intake.businessProblem}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/inventory/${useCase.id}`}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Full intake →
              </Link>
              {useCase.assessment && (
                <Link
                  href={`/assessment?useCaseId=${useCase.id}`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Full assessment →
                </Link>
              )}
            </div>
          </div>

          {/* Risk scoring summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Risk scoring
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <RiskCard
                label="Inherent (intake)"
                value={tierDisplay?.label ?? 'Pending'}
                badgeClasses={tierDisplay?.badgeClasses}
              />
              <RiskCard
                label="Detailed (assessment)"
                value={scoringTierDisplay?.label ?? 'Pending'}
                badgeClasses={scoringTierDisplay?.badgeClasses}
              />
              <RiskCard
                label="EU AI Act"
                value={
                  euTier === 'pending' ? 'Pending' : euTier.replace(/\b\w/g, (c) => c.toUpperCase())
                }
                badgeClasses={
                  euTier === 'high' || euTier === 'prohibited'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : euTier === 'limited'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : euTier === 'minimal'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                }
              />
            </div>
          </div>

          {/* Fired rules and signals */}
          {useCase.classification.explanation.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Why this case scored this way
              </p>
              <ul className="mt-3 space-y-1.5">
                {useCase.classification.explanation.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Applicable frameworks */}
          {useCase.inherentRisk?.applicableFrameworks &&
            useCase.inherentRisk.applicableFrameworks.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Applicable frameworks
                </p>
                <div className="mt-3 space-y-1.5">
                  {useCase.inherentRisk.applicableFrameworks.map((f) => (
                    <div
                      key={`${f.framework}-${f.reference}`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    >
                      <div className="font-medium text-slate-800">{f.framework}</div>
                      <div className="text-slate-500">
                        {f.reference} · {f.applicabilityReason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Right: decision panel (sticky on wide screens) */}
        <div className="space-y-4">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Decision
            </p>
            <div className="space-y-2">
              <DecisionOption
                label="Approve"
                description="Case is cleared to proceed as described."
                selected={decision === 'approve'}
                onClick={() => setDecision('approve')}
                color="green"
              />
              <DecisionOption
                label="Approve with conditions"
                description="Cleared, but with specific conditions attached."
                selected={decision === 'approve_with_conditions'}
                onClick={() => setDecision('approve_with_conditions')}
                color="teal"
              />
              <DecisionOption
                label="Request changes"
                description="Fixes needed before this can be approved."
                selected={decision === 'changes_requested'}
                onClick={() => setDecision('changes_requested')}
                color="amber"
              />
              <DecisionOption
                label="Reject"
                description="Cannot proceed in current form."
                selected={decision === 'rejected'}
                onClick={() => setDecision('rejected')}
                color="red"
              />
            </div>

            {decision === 'approve_with_conditions' && (
              <div className="mt-4">
                <label htmlFor="conditions" className="block text-xs font-medium text-slate-700">
                  Approval conditions <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="conditions"
                  rows={3}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="What conditions must be met?"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {(decision === 'changes_requested' || decision === 'rejected') && (
              <div className="mt-4">
                <label htmlFor="rationale" className="block text-xs font-medium text-slate-700">
                  Rationale <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="rationale"
                  rows={3}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Why?"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {touched && errors.length > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-2.5 text-[11px] text-red-700">
                <ul className="list-disc space-y-0.5 pl-4">
                  {errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={handleSubmit}>Record decision</Button>
              <Link href={`/inventory/${useCase.id}`}>
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({
  label,
  value,
  badgeClasses,
}: {
  label: string;
  value: string;
  badgeClasses?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <span
        className={`mt-1.5 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
          badgeClasses ?? 'bg-white text-slate-600 border-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const DECISION_COLORS: Record<
  'green' | 'teal' | 'amber' | 'red',
  { selected: string; unselected: string; dot: string }
> = {
  green: {
    selected: 'border-green-500 bg-green-50 ring-2 ring-green-500/20',
    unselected: 'border-slate-200 bg-white hover:border-green-300',
    dot: 'bg-green-500',
  },
  teal: {
    selected: 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20',
    unselected: 'border-slate-200 bg-white hover:border-teal-300',
    dot: 'bg-teal-500',
  },
  amber: {
    selected: 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20',
    unselected: 'border-slate-200 bg-white hover:border-amber-300',
    dot: 'bg-amber-500',
  },
  red: {
    selected: 'border-red-500 bg-red-50 ring-2 ring-red-500/20',
    unselected: 'border-slate-200 bg-white hover:border-red-300',
    dot: 'bg-red-500',
  },
};

function DecisionOption({
  label,
  description,
  selected,
  color,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  color: 'green' | 'teal' | 'amber' | 'red';
  onClick: () => void;
}) {
  const styles = DECISION_COLORS[color];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
        selected ? styles.selected : styles.unselected
      }`}
    >
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">{description}</span>
      </span>
    </button>
  );
}
