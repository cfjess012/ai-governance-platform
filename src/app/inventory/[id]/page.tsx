'use client';

import Link from 'next/link';
import { use } from 'react';
import { CommentThread } from '@/components/case/CommentThread';
import { Button } from '@/components/ui/Button';
import { assessmentQuestions, intakeQuestions } from '@/config/questions';
import { TIER_DISPLAY } from '@/lib/risk/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { isAwaitingTriage } from '@/lib/triage/triage-actions';
import type { GovernancePath } from '@/types/inventory';

const riskTierColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  pending: 'bg-slate-100 text-slate-600',
};

const pathLabels: Record<GovernancePath, string> = {
  lightweight: 'Lightweight Review',
  standard: 'Standard Assessment',
  full: 'Full Assessment + Committee Review',
};

function DimensionBar({
  name,
  score,
  weight,
  explanation,
}: {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}) {
  const barColors = [
    '',
    'bg-green-400',
    'bg-lime-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-red-500',
  ];
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{name}</span>
        <span className="text-xs text-slate-500">
          {score}/5 (weight: {weight}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${barColors[score]}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{explanation}</p>
    </div>
  );
}

function formatFieldValue(
  value: unknown,
  fieldName: string,
  questions: typeof intakeQuestions,
): string {
  if (value === undefined || value === null || value === '') return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '\u2014';
    const q = questions.find((q) => q.field === fieldName);
    if (q?.options) {
      return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(', ');
    }
    return value.join(', ');
  }
  const q = questions.find((q) => q.field === fieldName);
  if (q?.options) {
    return q.options.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const useCase = useInventoryStore((s) => s.useCases.find((uc) => uc.id === id));

  if (!useCase) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Use Case Not Found</h1>
        <p className="text-slate-500 mb-4">The use case with ID &quot;{id}&quot; was not found.</p>
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/inventory"
            className="text-xs text-[#00539B] hover:underline mb-2 inline-block"
          >
            &larr; Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{useCase.intake.useCaseName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {useCase.intake.businessArea} &middot; {useCase.intake.useCaseOwner}
          </p>
        </div>
        <div className="flex gap-2">
          {useCase.inherentRisk ? (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${TIER_DISPLAY[useCase.inherentRisk.tier].badgeClasses}`}
              title={useCase.inherentRisk.tierDisplay.description}
            >
              {TIER_DISPLAY[useCase.inherentRisk.tier].label} Inherent Risk
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
              Risk: Pending
            </span>
          )}
          {isAwaitingTriage(useCase) && (
            <Link href={`/triage/${useCase.id}`}>
              <Button size="sm">Triage This Case</Button>
            </Link>
          )}
          {useCase.status === 'lightweight_review' && !useCase.lightweightReview && (
            <Link href={`/review/lightweight/${useCase.id}`}>
              <Button size="sm">Start Lightweight Review</Button>
            </Link>
          )}
          {useCase.status === 'assessment_required' && !useCase.assessment && (
            <Link href={`/assessment?useCaseId=${useCase.id}`}>
              <Button size="sm">Start Risk Assessment</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Triage decision banner (shown after triage is complete) */}
      {useCase.triage && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-0.5">Triage Decision</h2>
              <p className="text-xs text-slate-500">
                Triaged by {useCase.triage.triagedBy} on{' '}
                {new Date(useCase.triage.triagedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {pathLabels[useCase.triage.governancePath]}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Confirmed inherent tier</p>
              <p className="text-sm font-medium text-slate-700">
                {(() => {
                  // Defensive: handle legacy cases where confirmedInherentTier may be missing
                  const tier = useCase.triage.confirmedInherentTier;
                  if (!tier) return 'Pending';
                  return TIER_DISPLAY[tier]?.label ?? tier;
                })()}
                {useCase.triage.riskTierOverridden && (
                  <span className="ml-2 text-xs text-amber-700">(overridden)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Assigned reviewer</p>
              <p className="text-sm font-medium text-slate-700">
                {useCase.triage.assignedReviewer}
              </p>
            </div>
          </div>
          {useCase.triage.riskTierOverridden && useCase.triage.overrideReason && (
            <div className="mb-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-slate-400 mb-0.5">Override reason</p>
              <p className="text-sm text-slate-700">{useCase.triage.overrideReason}</p>
            </div>
          )}
          {useCase.triage.triageNotes && (
            <div className="pt-3 border-t border-blue-200">
              <p className="text-xs text-slate-400 mb-0.5">Triage notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {useCase.triage.triageNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Inherent Risk Calculation panel ── */}
      {useCase.inherentRisk && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Inherent Risk Calculation</h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TIER_DISPLAY[useCase.inherentRisk.tier].badgeClasses}`}
            >
              {TIER_DISPLAY[useCase.inherentRisk.tier].label}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            {useCase.inherentRisk.tierDisplay.description}
          </p>

          {/* Fired regulatory rules */}
          {useCase.inherentRisk.firedRules.length > 0 && (
            <div className="mb-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                Regulatory rules ({useCase.inherentRisk.firedRules.length})
              </p>
              <ul className="space-y-2">
                {useCase.inherentRisk.firedRules.map((rule) => (
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

          {/* Fired patterns */}
          {useCase.inherentRisk.firedPatterns.length > 0 && (
            <div className="mb-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                Risk patterns ({useCase.inherentRisk.firedPatterns.length})
              </p>
              <ul className="space-y-2">
                {useCase.inherentRisk.firedPatterns.map((pattern) => (
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

          {/* Dimension scores (compact bars) */}
          <div className="mb-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Risk dimensions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {useCase.inherentRisk.dimensions.map((d) => (
                <div key={d.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{d.label}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{d.score}/4</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        d.score >= 4
                          ? 'bg-red-400'
                          : d.score >= 3
                            ? 'bg-orange-400'
                            : d.score >= 2
                              ? 'bg-amber-400'
                              : d.score >= 1
                                ? 'bg-lime-400'
                                : 'bg-emerald-400'
                      }`}
                      style={{ width: `${(d.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applicable frameworks */}
          {useCase.inherentRisk.applicableFrameworks.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Applicable frameworks ({useCase.inherentRisk.applicableFrameworks.length})
              </p>
              <ul className="space-y-1.5">
                {useCase.inherentRisk.applicableFrameworks.map((f) => (
                  <li key={`${f.framework}-${f.reference}`} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-600">
                        {f.framework} — {f.reference}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{f.applicabilityReason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-slate-400 italic mt-3 pt-3 border-t border-slate-100">
            Computed at {new Date(useCase.inherentRisk.computedAt).toLocaleString()} · Preliminary —
            triage may override
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Comment thread */}
          <CommentThread
            caseId={useCase.id}
            comments={useCase.comments ?? []}
            currentUserRole="governance_team"
            currentUserName="governance-team@example.com"
          />

          {/* Intake answers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Intake Answers</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {intakeQuestions.map((q) => {
                const val = (useCase.intake as Record<string, unknown>)[q.field];
                if (val === undefined) return null;
                return (
                  <div key={q.id} className="px-6 py-3">
                    <dt className="text-xs font-medium text-slate-500">{q.label}</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">
                      {formatFieldValue(val, q.field, intakeQuestions)}
                    </dd>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lightweight review record (if completed) */}
          {useCase.lightweightReview && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Lightweight Review</h2>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    useCase.lightweightReview.decision === 'approve'
                      ? 'bg-emerald-100 text-emerald-700'
                      : useCase.lightweightReview.decision === 'changes_requested'
                        ? 'bg-amber-100 text-amber-700'
                        : useCase.lightweightReview.decision === 'escalate'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                >
                  {useCase.lightweightReview.decision === 'approve'
                    ? 'Approved'
                    : useCase.lightweightReview.decision === 'changes_requested'
                      ? 'Changes Requested'
                      : useCase.lightweightReview.decision === 'escalate'
                        ? 'Escalated'
                        : 'Rejected'}
                </span>
              </div>
              <dl className="divide-y divide-slate-100">
                <div className="px-6 py-3">
                  <dt className="text-xs font-medium text-slate-500">Reviewed by</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">
                    {useCase.lightweightReview.reviewedBy} on{' '}
                    {new Date(useCase.lightweightReview.reviewedAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="px-6 py-3">
                  <dt className="text-xs font-medium text-slate-500">Intake accuracy verified</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">
                    {useCase.lightweightReview.intakeAccurate ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="px-6 py-3">
                  <dt className="text-xs font-medium text-slate-500">Basic controls confirmed</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">
                    {useCase.lightweightReview.basicControlsConfirmed ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="px-6 py-3">
                  <dt className="text-xs font-medium text-slate-500">Escalation contact</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">
                    {useCase.lightweightReview.escalationContact}
                  </dd>
                </div>
                <div className="px-6 py-3">
                  <dt className="text-xs font-medium text-slate-500">Review notes</dt>
                  <dd className="mt-0.5 text-sm text-slate-900 whitespace-pre-wrap">
                    {useCase.lightweightReview.reviewNotes}
                  </dd>
                </div>
                {useCase.lightweightReview.approvalConditions && (
                  <div className="px-6 py-3">
                    <dt className="text-xs font-medium text-slate-500">Approval conditions</dt>
                    <dd className="mt-0.5 text-sm text-slate-900 whitespace-pre-wrap">
                      {useCase.lightweightReview.approvalConditions}
                    </dd>
                  </div>
                )}
                {useCase.lightweightReview.rejectionReason && (
                  <div className="px-6 py-3">
                    <dt className="text-xs font-medium text-slate-500">Reason</dt>
                    <dd className="mt-0.5 text-sm text-slate-900 whitespace-pre-wrap">
                      {useCase.lightweightReview.rejectionReason}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Assessment answers (if completed) */}
          {useCase.assessment && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">Risk Assessment Answers</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {assessmentQuestions.map((q) => {
                  const val = (useCase.assessment as Record<string, unknown>)?.[q.field];
                  if (val === undefined) return null;
                  return (
                    <div key={q.id} className="px-6 py-3">
                      <dt className="text-xs font-medium text-slate-500">{q.label}</dt>
                      <dd className="mt-0.5 text-sm text-slate-900">
                        {formatFieldValue(val, q.field, assessmentQuestions)}
                      </dd>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Scoring breakdown */}
          {useCase.scoring && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Risk Scoring Breakdown</h3>
              <div className="mb-4 text-center">
                <span className="text-3xl font-bold text-slate-900">
                  {useCase.scoring.compositeScore}
                </span>
                <span className="text-sm text-slate-500 ml-1">/ 5.0</span>
                <div className="mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskTierColors[useCase.scoring.riskTier]}`}
                  >
                    {useCase.scoring.riskTier.charAt(0).toUpperCase() +
                      useCase.scoring.riskTier.slice(1)}
                  </span>
                </div>
              </div>

              {useCase.scoring.overrideTriggered && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-800">
                    Critical dimension override triggered
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">{useCase.scoring.overrideReason}</p>
                </div>
              )}

              <div className="space-y-4">
                {useCase.scoring.dimensions.map((dim) => (
                  <DimensionBar
                    key={dim.name}
                    name={dim.name}
                    score={dim.score}
                    weight={dim.weight}
                    explanation={dim.explanation}
                  />
                ))}
              </div>
            </div>
          )}

          {/* EU AI Act classification */}
          {useCase.euAiActDetail && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                EU AI Act Classification
              </h3>
              <div className="mb-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskTierColors[useCase.euAiActDetail.tier] ?? riskTierColors.pending}`}
                >
                  {useCase.euAiActDetail.tier.toUpperCase()}
                </span>
              </div>
              {useCase.euAiActDetail.triggers.length > 0 && (
                <div className="space-y-2 mb-3">
                  {useCase.euAiActDetail.triggers.map((t) => (
                    <div key={`${t.annexRef}-${t.reason}`} className="text-xs text-slate-600">
                      <span className="font-medium">{t.annexRef}:</span> {t.reason}
                    </div>
                  ))}
                </div>
              )}
              {useCase.euAiActDetail.obligations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Obligations:</p>
                  <ul className="space-y-0.5">
                    {useCase.euAiActDetail.obligations.map((o) => (
                      <li key={o} className="text-xs text-slate-600">
                        &bull; {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-3 italic">
                {useCase.euAiActDetail.disclaimer}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>
            <div className="space-y-3">
              {useCase.timeline.map((change, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: timeline is append-only;
                // multiple entries can share status+timestamp (same-millisecond writes) so the
                // index is the only stable disambiguator.
                <div
                  key={`${i}-${change.status}-${change.timestamp}`}
                  className="flex gap-3 text-xs"
                >
                  <div className="w-2 h-2 mt-1 rounded-full bg-[#00539B] flex-shrink-0" />
                  <div>
                    <p className="text-slate-700 font-medium capitalize">
                      {change.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-slate-500">
                      {new Date(change.timestamp).toLocaleString()} &middot; {change.changedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Governance requirements */}
          {useCase.scoring && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Governance Requirements</h3>
              <ul className="space-y-1.5">
                {useCase.scoring.governanceRequirements.map((req) => (
                  <li key={req} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-[#00539B] mt-0.5 flex-shrink-0">&bull;</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
