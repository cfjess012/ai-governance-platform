'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useCallback, useState } from 'react';
import { CommentThread } from '@/components/case/CommentThread';
import { ExportReportModal } from '@/components/export/ExportReportModal';
import { ComplianceChecklist } from '@/components/governance/ComplianceChecklist';
import { EvidenceList } from '@/components/governance/EvidenceList';
import { EvidenceUpload } from '@/components/governance/EvidenceUpload';
import { ExceptionForm } from '@/components/governance/ExceptionForm';
import { ResidualRiskCard } from '@/components/governance/ResidualRiskCard';
import { Button } from '@/components/ui/Button';
import { assessmentQuestions, intakeQuestions } from '@/config/questions';
import { buildComplianceReport } from '@/lib/governance/evidence-completeness';
import { formatNextReview, reviewStatus } from '@/lib/governance/review-schedule';
import { useActor } from '@/lib/hooks/use-actor';
import { type InherentRiskTier, TIER_DISPLAY } from '@/lib/risk/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { isAwaitingTriage } from '@/lib/triage/triage-actions';
import type { GovernancePath, StatusChange } from '@/types/inventory';

// ─── Constants ─────────────────────────────────────────────────────

const TABS = ['overview', 'risk', 'compliance', 'evidence', 'intake', 'activity'] as const;
type TabId = (typeof TABS)[number];
const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  risk: 'Risk Analysis',
  compliance: 'Compliance & Controls',
  evidence: 'Evidence & Attestation',
  intake: 'Intake Details',
  activity: 'Activity',
};

const pathLabels: Record<GovernancePath, string> = {
  lightweight: 'Lightweight Review',
  standard: 'Standard Assessment',
  full: 'Full Assessment + Committee Review',
};

const EU_TIER_STYLES: Record<string, string> = {
  prohibited: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  limited: 'bg-amber-100 text-amber-800 border-amber-200',
  minimal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  contact_required: 'Contact Required',
  triage_pending: 'Triage Pending',
  lightweight_review: 'Lightweight Review',
  assessment_required: 'Assessment Required',
  assessment_in_progress: 'Assessment In Progress',
  decision_pending: 'Decision Pending',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
  rejected: 'Rejected',
  in_production: 'In Production',
  decommissioned: 'Decommissioned',
};

// ─── Helpers ───────────────────────────────────────────────────────

function tierBadge(tier: InherentRiskTier) {
  const d = TIER_DISPLAY[tier];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${d.badgeClasses}`}
    >
      {d.label}
    </span>
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

function ComplianceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Intake field groupings for Tab 5
const INTAKE_GROUPS = [
  {
    label: 'System Overview',
    fields: [
      'useCaseName',
      'businessProblem',
      'howAiHelps',
      'businessArea',
      'useCaseOwner',
      'ownerEmail',
    ],
  },
  {
    label: 'AI Model Details',
    fields: [
      'aiType',
      'buildOrAcquire',
      'vendorName',
      'usesFoundationModel',
      'whichModels',
      'auditability',
    ],
  },
  {
    label: 'Data & Privacy',
    fields: [
      'dataSensitivity',
      'highRiskTriggers',
      'deploymentRegions',
      'otherRegions',
      'thirdPartyInvolved',
    ],
  },
  {
    label: 'Deployment & Operations',
    fields: [
      'lifecycleStage',
      'previouslyReviewed',
      'whoUsesSystem',
      'whoAffected',
      'peopleAffectedCount',
    ],
  },
  {
    label: 'Risk & Oversight',
    fields: ['worstOutcome', 'humanOversight', 'differentialTreatment', 'reviewUrgency'],
  },
  {
    label: 'Portfolio Alignment',
    fields: [
      'valueCreationLevers',
      'budgetReflected',
      'strategicAlignment',
      'targetPocQuarter',
      'targetProductionQuarter',
      'executiveSponsor',
      'reviewFrequency',
    ],
  },
];

// ─── Main component ────────────────────────────────────────────────

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'overview';

  const useCase = useInventoryStore((s) => s.useCases.find((uc) => uc.id === id));
  const recordReview = useInventoryStore((s) => s.recordReview);
  const resubmitForReview = useInventoryStore((s) => s.resubmitForReview);
  const markInProduction = useInventoryStore((s) => s.markInProduction);
  const rerouteFromBlocked = useInventoryStore((s) => s.rerouteFromBlocked);
  const approveCase = useInventoryStore((s) => s.approveCase);
  const rejectCase = useInventoryStore((s) => s.rejectCase);
  const escalateCase = useInventoryStore((s) => s.escalateCase);
  const actor = useActor();

  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState<
    'approve' | 'reject' | 'escalate' | null
  >(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [showRerouteForm, setShowRerouteForm] = useState(false);
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [rerouteLane, setRerouteLane] = useState<'lightweight' | 'standard' | 'enhanced'>(
    'standard',
  );
  const [rerouteNote, setRerouteNote] = useState('');
  const [expandedIntakeGroups, setExpandedIntakeGroups] = useState<Set<string>>(new Set());
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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

  // Derived data
  const evidence = useCase.evidence ?? [];
  const activeExceptions = (useCase.exceptions ?? []).filter((e) => e.status === 'active');
  const complianceReport = useCase.inherentRisk
    ? buildComplianceReport(
        useCase.inherentRisk.applicableFrameworks.map((f) => f.framework),
        useCase.classification.euAiActTier,
        evidence,
      )
    : null;
  const completenessPct = complianceReport?.summary.completenessPct ?? 0;
  const inherentTier = useCase.inherentRisk?.tier;
  const residualTier = useCase.residualRisk?.residualTier;
  const compositeScore = useCase.scoring?.compositeScore;
  const isActionable =
    useCase.status === 'decision_pending' || useCase.status === 'lightweight_review';

  // ─── Sticky Header ─────────────────────────────────────────────

  const renderStickyHeader = () => (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between h-[76px]">
        {/* Left: title + subtitle */}
        <div className="min-w-0 flex-1 mr-4">
          <div className="flex items-center gap-2">
            <Link href="/inventory" className="text-xs text-slate-400 hover:text-blue-600 shrink-0">
              &larr;
            </Link>
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {useCase.intake.useCaseName}
            </h1>
            {inherentTier && tierBadge(inherentTier)}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-500 truncate">
              {useCase.intake.businessArea} &middot; {useCase.intake.useCaseOwner}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
              {STATUS_LABELS[useCase.status] ?? useCase.status}
            </span>
          </div>
        </div>

        {/* Center: risk metrics strip */}
        <div className="hidden lg:flex items-center gap-4 shrink-0 mr-4">
          {/* Inherent → Residual */}
          {inherentTier && (
            <div className="flex items-center gap-1 text-[10px]">
              {tierBadge(inherentTier)}
              {residualTier && residualTier !== inherentTier && (
                <>
                  <span className="text-slate-400">→</span>
                  {tierBadge(residualTier)}
                </>
              )}
            </div>
          )}
          {/* Score */}
          {compositeScore !== undefined && (
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 tabular-nums leading-none">
                {compositeScore}
              </p>
              <p className="text-[9px] text-slate-400">/ 5.0</p>
            </div>
          )}
          {/* Compliance bar */}
          <div className="w-20">
            <p className="text-[9px] text-slate-400 mb-0.5">{completenessPct}% compliant</p>
            <ComplianceBar pct={completenessPct} />
          </div>
          {/* EU AI Act */}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${EU_TIER_STYLES[useCase.classification.euAiActTier] ?? EU_TIER_STYLES.pending}`}
          >
            EU:{' '}
            {useCase.classification.euAiActTier === 'pending'
              ? 'Pending'
              : useCase.classification.euAiActTier.charAt(0).toUpperCase() +
                useCase.classification.euAiActTier.slice(1)}
          </span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setShowExportModal(true)}>
            Export Report
          </Button>
          {isAwaitingTriage(useCase) && (
            <Link href={`/triage/${useCase.id}`}>
              <Button size="sm">Triage</Button>
            </Link>
          )}
          {useCase.status === 'assessment_required' && (
            <Link href={`/assessment?useCaseId=${useCase.id}`}>
              <Button size="sm">{useCase.assessment ? 'Continue' : 'Start'} Assessment</Button>
            </Link>
          )}
          {useCase.status === 'assessment_in_progress' && (
            <Link href={`/assessment?useCaseId=${useCase.id}`}>
              <Button size="sm">Continue Assessment</Button>
            </Link>
          )}
          {isActionable && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setShowDecisionForm('approve');
                  setDecisionNote('');
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowDecisionForm('reject');
                  setDecisionNote('');
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowDecisionForm('escalate');
                  setDecisionNote('');
                }}
              >
                Escalate
              </Button>
            </>
          )}
          {useCase.status === 'changes_requested' && (
            <Button size="sm" onClick={() => resubmitForReview(useCase.id, actor.identity)}>
              Resubmit
            </Button>
          )}
          {useCase.status === 'approved' && !confirmProduction && (
            <Button size="sm" onClick={() => setConfirmProduction(true)}>
              Go Live
            </Button>
          )}
          {useCase.status === 'approved' && confirmProduction && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  markInProduction(useCase.id, actor.identity);
                  setConfirmProduction(false);
                }}
              >
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmProduction(false)}>
                Cancel
              </Button>
            </>
          )}
          {useCase.status === 'contact_required' && (
            <Button size="sm" onClick={() => setShowRerouteForm(true)}>
              Re-route
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Tab Bar ───────────────────────────────────────────────────

  const renderTabBar = () => (
    <div className="sticky top-[76px] z-20 bg-white border-b border-slate-200 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto w-full">
        <nav className="flex gap-1 -mb-px" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  // ─── Decision Form (floating) ──────────────────────────────────

  const renderDecisionForm = () => {
    if (!showDecisionForm) return null;
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3 capitalize">
            {showDecisionForm} — Decision Note Required
          </h2>
          <textarea
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder={
              showDecisionForm === 'approve'
                ? 'Summarize why this case is approved and any conditions…'
                : showDecisionForm === 'reject'
                  ? 'Explain why this case is being rejected…'
                  : 'Explain why escalation is needed…'
            }
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showDecisionForm === 'reject' ? 'danger' : 'primary'}
              disabled={decisionNote.trim().length < 10}
              onClick={() => {
                const note = decisionNote.trim();
                const actorId = actor.identity;
                if (showDecisionForm === 'approve') approveCase(useCase.id, note, actorId);
                else if (showDecisionForm === 'reject') rejectCase(useCase.id, note, actorId);
                else escalateCase(useCase.id, note, actorId);
                setShowDecisionForm(null);
                setDecisionNote('');
              }}
            >
              Confirm {showDecisionForm}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDecisionForm(null)}>
              Cancel
            </Button>
          </div>
          {decisionNote.trim().length > 0 && decisionNote.trim().length < 10 && (
            <p className="text-xs text-amber-600 mt-2">Note must be at least 10 characters.</p>
          )}
        </div>
      </div>
    );
  };

  // ─── Re-route form ─────────────────────────────────────────────

  const renderRerouteForm = () => {
    if (!showRerouteForm || useCase.status !== 'contact_required') return null;
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-4">
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Re-route from Blocked Lane</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="reroute-lane"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Target lane
              </label>
              <select
                id="reroute-lane"
                value={rerouteLane}
                onChange={(e) => setRerouteLane(e.target.value as typeof rerouteLane)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="lightweight">Lightweight</option>
                <option value="standard">Standard</option>
                <option value="enhanced">Enhanced</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="reroute-note"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Resolution note *
              </label>
              <input
                id="reroute-note"
                type="text"
                value={rerouteNote}
                onChange={(e) => setRerouteNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!rerouteNote.trim()}
              onClick={() => {
                rerouteFromBlocked(useCase.id, rerouteLane, rerouteNote.trim(), actor.identity);
                setShowRerouteForm(false);
                setRerouteNote('');
              }}
            >
              Re-route
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRerouteForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ─── TAB 1: Overview ───────────────────────────────────────────

  const renderOverview = () => {
    const nextReview = useCase.reviewSchedule ? formatNextReview(useCase.reviewSchedule) : null;
    const reviewSt = useCase.reviewSchedule ? reviewStatus(useCase.reviewSchedule) : null;
    const missingControls = complianceReport?.summary.missing ?? 0;

    return (
      <div className="space-y-5">
        {/* 2×3 card grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Risk Score */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Risk Score
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {compositeScore ?? '—'}
              <span className="text-sm text-slate-400 font-normal"> / 5.0</span>
            </p>
          </div>
          {/* Inherent Tier */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Inherent Tier
            </p>
            {inherentTier ? (
              tierBadge(inherentTier)
            ) : (
              <span className="text-sm text-slate-400">Pending</span>
            )}
          </div>
          {/* Residual Tier */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Residual Tier
            </p>
            {residualTier ? (
              tierBadge(residualTier)
            ) : (
              <span className="text-sm text-slate-400">Pending</span>
            )}
          </div>
          {/* Compliance */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Compliance
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{completenessPct}%</p>
            <ComplianceBar pct={completenessPct} />
          </div>
          {/* EU AI Act */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              EU AI Act
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${EU_TIER_STYLES[useCase.classification.euAiActTier] ?? EU_TIER_STYLES.pending}`}
            >
              {useCase.classification.euAiActTier === 'pending'
                ? 'Pending'
                : useCase.classification.euAiActTier}
            </span>
          </div>
          {/* Next Review */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Next Review
            </p>
            <p
              className={`text-sm font-bold ${reviewSt === 'overdue' ? 'text-red-600' : reviewSt === 'due_soon' ? 'text-amber-600' : 'text-slate-700'}`}
            >
              {nextReview ?? 'Not scheduled'}
            </p>
            {useCase.reviewSchedule && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-slate-400 capitalize">
                  {useCase.reviewSchedule.frequency.replace('_', '-')} cadence
                </p>
                <button
                  type="button"
                  onClick={() => recordReview(useCase.id, actor.identity)}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Mark reviewed
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact chips: triggers, patterns, frameworks */}
        {useCase.inherentRisk && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            {useCase.inherentRisk.firedRules.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">
                  Regulatory Triggers
                </p>
                <div className="flex flex-wrap gap-1">
                  {useCase.inherentRisk.firedRules.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {useCase.inherentRisk.firedPatterns.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Risk Patterns
                </p>
                <div className="flex flex-wrap gap-1">
                  {useCase.inherentRisk.firedPatterns.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {useCase.inherentRisk.applicableFrameworks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Frameworks
                </p>
                <div className="flex flex-wrap gap-1">
                  {useCase.inherentRisk.applicableFrameworks.map((f) => (
                    <span
                      key={`${f.framework}-${f.reference}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                    >
                      {f.framework}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Governance path + triage summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Governance Path
            </p>
            <p className="text-sm text-slate-700">
              {useCase.triage ? pathLabels[useCase.triage.governancePath] : 'Pending triage'} —{' '}
              <span className="font-medium">{STATUS_LABELS[useCase.status]}</span>
            </p>
          </div>
          {useCase.triage && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Triage Summary
              </p>
              <p className="text-xs text-slate-700">
                By <strong>{useCase.triage.triagedBy}</strong> on{' '}
                {new Date(useCase.triage.triagedAt).toLocaleDateString()} · Reviewer:{' '}
                {useCase.triage.assignedReviewer}
              </p>
              {useCase.triage.triageNotes && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {useCase.triage.triageNotes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Key actions needed */}
        {(missingControls > 0 || useCase.classification.euAiActTier === 'pending') && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900 mb-1">Key actions needed</p>
            <ul className="space-y-0.5">
              {missingControls > 0 && (
                <li className="text-xs text-amber-800">
                  {missingControls} compliance control{missingControls !== 1 ? 's' : ''} missing
                  attested evidence
                </li>
              )}
              {useCase.classification.euAiActTier === 'pending' && (
                <li className="text-xs text-amber-800">
                  EU AI Act classification not yet determined
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ─── TAB 2: Risk Analysis ──────────────────────────────────────

  const renderRisk = () => (
    <div className="space-y-5">
      {/* Inherent Risk */}
      {useCase.inherentRisk && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Inherent Risk Calculation</h2>
            {tierBadge(useCase.inherentRisk.tier)}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {useCase.inherentRisk.tierDisplay.description}
          </p>

          {/* Rules — collapsible */}
          {useCase.inherentRisk.firedRules.length > 0 && (
            <div className="mb-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                Regulatory Rules ({useCase.inherentRisk.firedRules.length})
              </p>
              {useCase.inherentRisk.firedRules.map((rule) => {
                const isOpen = expandedRules.has(rule.id);
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(expandedRules);
                      isOpen ? next.delete(rule.id) : next.add(rule.id);
                      setExpandedRules(next);
                    }}
                    className="w-full text-left mb-1 rounded-md border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">{rule.name}</span>
                      <span className="text-[10px] text-red-600 font-semibold">FIRED</span>
                    </div>
                    {isOpen && (
                      <div className="mt-2 text-xs text-slate-500">
                        <p>{rule.reason}</p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          {rule.citation.framework} — {rule.citation.reference}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Patterns — collapsible */}
          {useCase.inherentRisk.firedPatterns.length > 0 && (
            <div className="mb-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                Risk Patterns ({useCase.inherentRisk.firedPatterns.length})
              </p>
              {useCase.inherentRisk.firedPatterns.map((pattern) => {
                const isOpen = expandedRules.has(pattern.id);
                return (
                  <button
                    key={pattern.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(expandedRules);
                      isOpen ? next.delete(pattern.id) : next.add(pattern.id);
                      setExpandedRules(next);
                    }}
                    className="w-full text-left mb-1 rounded-md border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">{pattern.name}</span>
                      <span className="text-[10px] text-amber-600 font-semibold">FIRED</span>
                    </div>
                    {isOpen && <p className="mt-2 text-xs text-slate-500">{pattern.description}</p>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Dimensions */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Dimensions
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
                      className={`h-1.5 rounded-full ${d.score >= 4 ? 'bg-red-400' : d.score >= 3 ? 'bg-orange-400' : d.score >= 2 ? 'bg-amber-400' : d.score >= 1 ? 'bg-lime-400' : 'bg-emerald-400'}`}
                      style={{ width: `${(d.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assessment scoring */}
      {useCase.scoring && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Assessment Scoring</h2>
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-slate-900">
              {useCase.scoring.compositeScore}
            </span>
            <span className="text-sm text-slate-500 ml-1">/ 5.0</span>
          </div>
          <div className="space-y-3">
            {useCase.scoring.dimensions.map((dim) => (
              <div key={dim.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-700">{dim.name}</span>
                  <span className="text-xs text-slate-500">
                    {dim.score}/5 ({dim.weight}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${dim.score >= 5 ? 'bg-red-500' : dim.score >= 4 ? 'bg-orange-400' : dim.score >= 3 ? 'bg-yellow-400' : dim.score >= 2 ? 'bg-lime-400' : 'bg-green-400'}`}
                    style={{ width: `${(dim.score / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{dim.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Residual Risk */}
      {useCase.residualRisk && <ResidualRiskCard result={useCase.residualRisk} />}

      {/* EU AI Act */}
      {useCase.euAiActDetail && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">EU AI Act Classification</h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${EU_TIER_STYLES[useCase.euAiActDetail.tier] ?? EU_TIER_STYLES.pending}`}
          >
            {useCase.euAiActDetail.tier.toUpperCase()}
          </span>
          {useCase.euAiActDetail.triggers.length > 0 && (
            <div className="mt-3 space-y-1">
              {useCase.euAiActDetail.triggers.map((t) => (
                <p key={`${t.annexRef}-${t.reason}`} className="text-xs text-slate-600">
                  <strong>{t.annexRef}:</strong> {t.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exceptions (collapsible, at bottom of Risk tab) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExceptionForm((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-900">
            Exceptions & Waivers
            {activeExceptions.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {activeExceptions.length}
              </span>
            )}
          </span>
          <Link
            href="/exceptions"
            className="text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Register →
          </Link>
        </button>
        {activeExceptions.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            {activeExceptions.map((e) => (
              <div
                key={e.id}
                className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <p className="text-xs font-semibold text-amber-900">{e.policyOrControl}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Approved by {e.approvedBy} · expires{' '}
                  {e.expiresAt && new Date(e.expiresAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
        {showExceptionForm && (
          <div className="px-5 py-4 border-t border-slate-100">
            <ExceptionForm useCaseId={useCase.id} onCreated={() => setShowExceptionForm(false)} />
          </div>
        )}
      </div>
    </div>
  );

  // ─── TAB 3: Compliance & Controls ──────────────────────────────

  const renderCompliance = () => (
    <div>
      {complianceReport && complianceReport.controls.length > 0 ? (
        <ComplianceChecklist
          controls={complianceReport.controls}
          completenessPct={complianceReport.summary.completenessPct}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            No applicable controls detected. Complete the intake and triage process first.
          </p>
        </div>
      )}
    </div>
  );

  // ─── TAB 4: Evidence & Attestation ─────────────────────────────

  const renderEvidence = () => (
    <div className="space-y-5">
      {/* Mitigation credit breakdown */}
      {useCase.residualRisk && <ResidualRiskCard result={useCase.residualRisk} />}

      {/* Evidence upload + list */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Evidence</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload artifacts to satisfy compliance controls and earn mitigation credit.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setShowEvidenceUpload((v) => !v)}>
            {showEvidenceUpload ? 'Cancel' : '+ Upload'}
          </Button>
        </div>
        <div className="p-5">
          {showEvidenceUpload && (
            <div className="mb-5 pb-5 border-b border-slate-100">
              <EvidenceUpload
                useCaseId={useCase.id}
                onUploaded={() => setShowEvidenceUpload(false)}
              />
            </div>
          )}
          <EvidenceList useCaseId={useCase.id} evidence={evidence} />
        </div>
      </div>
    </div>
  );

  // ─── TAB 5: Intake Details ─────────────────────────────────────

  const renderIntake = () => {
    const intakeData = useCase.intake as Record<string, unknown>;
    return (
      <div className="space-y-2">
        {INTAKE_GROUPS.map((group) => {
          const fieldsWithValues = group.fields.filter(
            (f) => intakeData[f] !== undefined && intakeData[f] !== null && intakeData[f] !== '',
          );
          const isExpanded = expandedIntakeGroups.has(group.label);
          return (
            <div
              key={group.label}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  const next = new Set(expandedIntakeGroups);
                  isExpanded ? next.delete(group.label) : next.add(group.label);
                  setExpandedIntakeGroups(next);
                }}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-900">{group.label}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {fieldsWithValues.length} fields
                </span>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {group.fields.map((field) => {
                    const q = intakeQuestions.find((iq) => iq.field === field);
                    const val = intakeData[field];
                    if (val === undefined || val === null || val === '') return null;
                    return (
                      <div key={field} className="px-5 py-2.5 grid grid-cols-3 gap-4">
                        <dt className="text-xs font-medium text-slate-500 col-span-1">
                          {q?.label ?? field}
                        </dt>
                        <dd className="text-sm text-slate-900 col-span-2">
                          {typeof val === 'boolean' ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {val ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            formatFieldValue(val, field, intakeQuestions)
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Assessment answers */}
        {useCase.assessment && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const next = new Set(expandedIntakeGroups);
                expandedIntakeGroups.has('assessment')
                  ? next.delete('assessment')
                  : next.add('assessment');
                setExpandedIntakeGroups(next);
              }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-900">Risk Assessment Answers</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {
                  assessmentQuestions.filter(
                    (q) => (useCase.assessment as Record<string, unknown>)?.[q.field] !== undefined,
                  ).length
                }{' '}
                fields
              </span>
            </button>
            {expandedIntakeGroups.has('assessment') && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {assessmentQuestions.map((q) => {
                  const val = (useCase.assessment as Record<string, unknown>)?.[q.field];
                  if (val === undefined) return null;
                  return (
                    <div key={q.id} className="px-5 py-2.5 grid grid-cols-3 gap-4">
                      <dt className="text-xs font-medium text-slate-500 col-span-1">{q.label}</dt>
                      <dd className="text-sm text-slate-900 col-span-2">
                        {formatFieldValue(val, q.field, assessmentQuestions)}
                      </dd>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lightweight review */}
        {useCase.lightweightReview && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Lightweight Review Record</h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Reviewed by</dt>
                <dd className="text-slate-900 font-medium">
                  {useCase.lightweightReview.reviewedBy}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Decision</dt>
                <dd className="text-slate-900 font-medium capitalize">
                  {useCase.lightweightReview.decision}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Intake accurate</dt>
                <dd>{useCase.lightweightReview.intakeAccurate ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Controls confirmed</dt>
                <dd>{useCase.lightweightReview.basicControlsConfirmed ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
            {useCase.lightweightReview.reviewNotes && (
              <p className="mt-3 text-xs text-slate-600 whitespace-pre-wrap">
                {useCase.lightweightReview.reviewNotes}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── TAB 6: Activity ───────────────────────────────────────────

  const renderActivity = () => {
    // Merge timeline + comments into one chronological feed
    const timelineEntries = useCase.timeline.map((t, i) => ({
      type: 'system' as const,
      timestamp: t.timestamp,
      key: `tl-${i}-${t.timestamp}`,
      data: t,
    }));
    const commentEntries = (useCase.comments ?? []).map((c) => ({
      type: 'comment' as const,
      timestamp: c.timestamp,
      key: `cmt-${c.id}`,
      data: c,
    }));
    const merged = [...timelineEntries, ...commentEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return (
      <div className="space-y-4">
        {/* Feed */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {merged.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-slate-400">No activity yet.</p>
              </div>
            ) : (
              merged.map((entry) => {
                if (entry.type === 'system') {
                  const t = entry.data as StatusChange;
                  return (
                    <div key={entry.key} className="px-5 py-3 flex gap-3">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700">
                          {t.auditEvent ?? t.status.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(t.timestamp).toLocaleString()} · {t.changedBy}
                        </p>
                      </div>
                    </div>
                  );
                }
                const c = entry.data as (typeof useCase.comments)[number];
                const roleStyles: Record<string, { bg: string; text: string; label: string }> = {
                  business_user: {
                    bg: 'bg-slate-100',
                    text: 'text-slate-600',
                    label: 'Business User',
                  },
                  governance_team: {
                    bg: 'bg-blue-100',
                    text: 'text-blue-700',
                    label: 'Governance Analyst',
                  },
                  reviewer: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Risk Officer' },
                };
                const style = roleStyles[c.authorRole] ?? roleStyles.governance_team;
                return (
                  <div key={entry.key} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">{c.author}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Compose */}
        <CommentThread
          caseId={useCase.id}
          comments={[]}
          currentUserRole={
            actor.role === 'governance_analyst' ? 'governance_team' : 'business_user'
          }
          currentUserName={actor.name}
        />
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/40">
      {renderStickyHeader()}
      {renderTabBar()}
      {renderDecisionForm()}
      {renderRerouteForm()}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 min-h-[600px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'risk' && renderRisk()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === 'evidence' && renderEvidence()}
        {activeTab === 'intake' && renderIntake()}
        {activeTab === 'activity' && renderActivity()}
      </div>
      {showExportModal && (
        <ExportReportModal useCase={useCase} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
