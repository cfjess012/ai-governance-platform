'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

/**
 * Governance Workflow Mind Map — pixel-accurate to the code
 *
 * Every node, every edge, every actor, every time estimate, every decision
 * gate, every gap in this file is grounded in a specific file:line in the
 * codebase. See the `citations` field on each node. Where the code is
 * incomplete or contradictory, the node carries a `gap` flag — these are
 * deliberately visible, not smoothed over.
 *
 * Layout: a fixed-dimension canvas (1200×2100) with nodes positioned by
 * explicit (x, y) coordinates. Edges are SVG paths between node anchors.
 * Clicking any node opens a right-side detail panel.
 *
 * Four lanes (by color) plus universal nodes at top and bottom:
 *   lightweight (green)  → low-risk, single reviewer, fast path
 *   standard    (blue)   → moderate risk, standard assessment
 *   enhanced    (amber)  → high-risk, full assessment + committee
 *   blocked     (red)    → governance contact required first
 *   universal   (slate)  → runs for all cases regardless of lane
 */

// ─────────────────────────────────────────────────────────────────────────────
// Data model
// ─────────────────────────────────────────────────────────────────────────────

type Lane = 'universal' | 'lightweight' | 'standard' | 'enhanced' | 'blocked' | 'governance';
type NodeKind = 'entry' | 'process' | 'decision' | 'terminal' | 'governance_overlay';

interface WorkflowNode {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  lane: Lane;
  kind: NodeKind;
  title: string;
  subtitle?: string;
  actor?: string;
  duration?: string;
  statuses?: string[]; // AIUseCaseStatus values this node covers
  summary: string;
  bullets: string[];
  triggers: string[]; // what causes the next step
  citations: string[]; // file:line references
  gap?: string; // if set, this step is not fully implemented
}

interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
  kind?: 'forward' | 'escalate' | 'loop' | 'overlay';
}

// ─────────────────────────────────────────────────────────────────────────────
// Lane colors — kept synchronized with Tailwind class strings below
// ─────────────────────────────────────────────────────────────────────────────

const LANE_STYLES: Record<
  Lane,
  { border: string; bg: string; text: string; stroke: string; dot: string; label: string }
> = {
  universal: {
    border: 'border-slate-300',
    bg: 'bg-white',
    text: 'text-slate-900',
    stroke: '#94a3b8',
    dot: 'bg-slate-400',
    label: 'Universal',
  },
  lightweight: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    text: 'text-green-900',
    stroke: '#16a34a',
    dot: 'bg-green-500',
    label: 'Lightweight',
  },
  standard: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    stroke: '#2563eb',
    dot: 'bg-blue-500',
    label: 'Standard',
  },
  enhanced: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    stroke: '#d97706',
    dot: 'bg-amber-500',
    label: 'Enhanced',
  },
  blocked: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    text: 'text-red-900',
    stroke: '#dc2626',
    dot: 'bg-red-500',
    label: 'Blocked',
  },
  governance: {
    border: 'border-purple-300',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    stroke: '#9333ea',
    dot: 'bg-purple-500',
    label: 'Governance Overlay',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Canvas constants
// ─────────────────────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 2180;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;

// Column x-centers
const COL_CENTER = CANVAS_WIDTH / 2; // 640
const COL_LW = 180;
const COL_STD = 480;
const COL_ENH = 800;
const COL_BLK = 1100;

// ─────────────────────────────────────────────────────────────────────────────
// Workflow graph — every node below is a real step in the codebase
// ─────────────────────────────────────────────────────────────────────────────

const NODES: WorkflowNode[] = [
  // ────────────────────────── ENTRY ──────────────────────────
  {
    id: 'entry',
    x: COL_CENTER,
    y: 80,
    lane: 'universal',
    kind: 'entry',
    title: 'Submit AI Use Case Intake',
    actor: 'Business User',
    duration: '7–17 min',
    statuses: ['draft', 'submitted'],
    summary:
      'Every case starts here. Four intake flows exist — Quick Register (7 questions), Card Flip, Single Page, and Full Guided. All produce the same underlying IntakeFormData.',
    bullets: [
      'Quick Register: 7 questions (Layer 1) — routes directly via the intake router',
      'Full Guided / Card Flip / Single Page: 36 questions, Section A (21) + B (5) + C (10)',
      'Conditional sub-fields: Q9a/b (vendor), Q10a (foundation models), Q11a (other regions)',
      'Auto-save every 2 seconds to wizard-store',
      'Intake classifier runs live in the sidebar for real-time EU AI Act preview',
    ],
    triggers: ['User clicks Submit on the final intake step'],
    citations: [
      'src/lib/questions/intake-schema.ts — the 36-field Zod schema (incl. processes_customer_pii trigger)',
      'src/config/questions.ts — intakeQuestions registry',
      'src/lib/intake/submit.ts — unified submit pipeline',
      'src/lib/classification/intake-classifier.ts — sidebar preview classifier',
    ],
  },

  // ────────────────────────── AUTO CLASSIFICATION (system) ──────────────────────────
  {
    id: 'auto-classify',
    x: COL_CENTER,
    y: 240,
    lane: 'universal',
    kind: 'process',
    title: 'Automatic Classification',
    subtitle: 'runs in real time',
    actor: 'System',
    duration: '< 1 sec',
    summary:
      'The submission runs through two parallel classifiers: the Layer 1 router (if Quick Register was used) to assign a review lane, and the 5-tier inherent risk scorer for everyone.',
    bullets: [
      'Inherent risk score — 7 dimensions × weights → composite 0–100 → 5-tier (low/medium_low/medium/medium_high/high)',
      'Hard regulatory rules — EU AI Act Art 5/Annex III, NYC LL 144, Colorado SB 24-205 → force minimum tier',
      'Confluence patterns — combinatorial escalations (e.g., GenAI + customer data + EU)',
      'Framework detection — EU AI Act, GDPR, NIST AI RMF 1.0, Federal Reserve SR 11-7, NAIC, NYC LL 144, Colorado AI Act, HIPAA, ISO/IEC 42001:2023, ECOA/Fair Housing, SEC/FINRA, Reg E/EFTA, FTC Act Section 5, CFPB/OCC (incl. proxy variable detection)',
      'Top contributors list — 3–5 ranked reasons for the score',
      'Layer 1 router (Quick Register only) — lane + regulatory tags',
    ],
    triggers: ['Score and tier computed', 'Case advances to lane assignment'],
    citations: [
      'src/lib/risk/inherent-risk.ts — 5-tier scoring engine',
      'src/lib/risk/dimensions.ts — 7 dimension scorers',
      'src/lib/risk/rules.ts — hard regulatory rules',
      'src/lib/risk/patterns.ts — confluence patterns',
      'src/lib/risk/frameworks.ts — framework detection',
      'src/lib/classification/intake-router.ts — 4-lane Layer 1 router (14 rules)',
    ],
    gap: "The Layer 1 router only runs for Quick Register submissions — users from the full guided wizard, card flow, and single-page form bypass it. The unified submitIntake() function exists but isn't wired into the other three intake UIs yet.",
  },

  // ────────────────────────── LANE ASSIGNMENT ──────────────────────────
  {
    id: 'lane-decision',
    x: COL_CENTER,
    y: 400,
    lane: 'universal',
    kind: 'decision',
    title: 'Lane Assignment',
    subtitle: 'decision gate',
    actor: 'System',
    duration: 'instant',
    summary:
      '14 router rules evaluate the submission. Most severe lane wins. All rules that fire are recorded on the case for governance visibility.',
    bullets: [
      'Lightweight (0 severity) — default when no rule fires. Target: ~40% of cases.',
      'Standard (1) — customer data, customer content, AI agents, shadow AI, employee data, SR 11-7 pre-notify. Target: ~40%.',
      'Enhanced (2) — financial decisions, employment decisions, health/biometric, autonomous, Annex III area + customer touchpoint. Target: ~15%.',
      'Blocked (3) — (biometric + vision) OR (autonomous + financial). Target: ~5%. Governance must contact user first.',
    ],
    triggers: [
      'Lightweight → lightweight_review queue (direct)',
      'Standard / Enhanced → triage_pending queue',
      'Blocked → triage_pending with priority flag',
    ],
    citations: [
      'src/lib/classification/intake-router.ts:128 routeIntake()',
      'src/lib/classification/intake-router.ts:140-160 blocked rules',
      'src/lib/classification/intake-router.ts:165-226 enhanced rules',
      'src/lib/classification/intake-router.ts:231-297 standard rules',
    ],
  },

  // ────────────────────────── LIGHTWEIGHT LANE ──────────────────────────
  {
    id: 'lw-queue',
    x: COL_LW,
    y: 560,
    lane: 'lightweight',
    kind: 'process',
    title: 'Lightweight Review Queue',
    actor: 'Governance Analyst',
    duration: '1–3 business days',
    statuses: ['lightweight_review'],
    summary:
      'Low-risk cases land here directly from the router or via triage routing. No full assessment required — one reviewer makes a 4-option decision.',
    bullets: [
      'Eligible for 5-tier { low, medium_low } inherent risk scores',
      'Reviewer verifies intake accuracy + basic controls confirmed',
      'Escalation contact captured for incident routing',
      'Review notes required (minimum 10 chars)',
    ],
    triggers: ['Reviewer picks a decision from the 4 options below'],
    citations: [
      'src/lib/triage/lightweight-review.ts — pure logic',
      'src/app/review/lightweight/[id]/page.tsx — UI (378 lines)',
    ],
  },
  {
    id: 'lw-decision',
    x: COL_LW,
    y: 720,
    lane: 'lightweight',
    kind: 'decision',
    title: 'Lightweight Decision',
    subtitle: '4 options',
    actor: 'Lightweight Reviewer',
    summary: 'One of four decisions, each advancing the case to a different next status.',
    bullets: [
      'Approve → approved (requires intake accurate + basic controls confirmed)',
      'Changes requested → changes_requested (reason required)',
      'Escalate → assessment_required (case becomes standard/full path)',
      'Reject → rejected (reason required, terminal)',
    ],
    triggers: ['Branches into 4 paths based on decision'],
    citations: [
      'src/lib/triage/lightweight-review.ts:24-37 statusForLightweightDecision',
      'src/lib/triage/lightweight-review.ts:42-69 validateLightweightReview',
    ],
  },

  // ────────────────────────── STANDARD LANE ──────────────────────────
  {
    id: 'std-triage',
    x: COL_STD,
    y: 560,
    lane: 'standard',
    kind: 'process',
    title: 'Triage Queue',
    actor: 'Governance Analyst',
    duration: '3–5 business days',
    statuses: ['triage_pending'],
    summary:
      'Governance analyst reviews the auto-classification, validates the tier, may override, and picks a governance path (lightweight / standard / full).',
    bullets: [
      'Confirmed inherent tier (can override the auto score with a required reason)',
      'Assigned reviewer for downstream assessment',
      'Triage notes (min 10 chars)',
      'Path recommendation: low/ml → lightweight, m/mh → standard, high → full',
      'Every override is logged for classifier feedback loop',
    ],
    triggers: ['Analyst picks governance path → lightweight_review or assessment_required'],
    citations: [
      'src/lib/triage/triage-actions.ts — decision logic + validation',
      'src/lib/triage/triage-actions.ts:43-55 recommended path',
      'src/app/triage/page.tsx — queue view',
      'src/app/triage/[id]/page.tsx — single-case triage form',
      'src/lib/triage/override-analytics.ts — override feedback loop',
    ],
  },
  {
    id: 'std-assessment',
    x: COL_STD,
    y: 720,
    lane: 'standard',
    kind: 'process',
    title: 'Pre-Production Assessment',
    subtitle: '~35 questions (standard path)',
    actor: 'Business User',
    duration: '~25–35 min',
    statuses: ['assessment_required', 'assessment_in_progress'],
    summary:
      'Standard path runs an abbreviated assessment — sections D, G, H, I can be auto-skipped when the intake profile makes them irrelevant, and pre-populated fields are hidden from the form.',
    bullets: [
      '10 sections total (A/B/C/D/E/F/G/H/I/review)',
      'Section D skipped when humanOversight === human_decides AND no high-risk triggers',
      'Section G skipped when no foundation model AND no GenAI/agent/RAG',
      'Section H skipped when internal-only users AND no consequential decisions',
      'Section I skipped when thirdPartyInvolved === no',
      'Pre-filled fields (customerFacingOutputs, users, regions, usesGenAi, vendor, data classification) are hidden, not re-asked',
    ],
    triggers: ['User submits → decision_pending'],
    citations: [
      'src/lib/questions/assessment-schema.ts — 109 field canonical schema',
      'src/lib/assessment/section-visibility.ts — path-based skipping',
      'src/lib/questions/assessment-branching.ts — GenAI/agentic/vendor gates',
      'src/app/assessment/page.tsx — wizard UI',
    ],
  },

  // ────────────────────────── ENHANCED LANE ──────────────────────────
  {
    id: 'enh-triage',
    x: COL_ENH,
    y: 560,
    lane: 'enhanced',
    kind: 'process',
    title: 'Priority Triage Queue',
    actor: 'Senior Governance Analyst',
    duration: '1–3 business days',
    statuses: ['triage_pending'],
    summary:
      'Enhanced-lane cases get priority triage. Router-fired rules are surfaced as "preliminary regulatory flags" — the triage team knows which regulators to pre-notify before starting the review.',
    bullets: [
      'Router tags surfaced: sr_11_7, reg_bi, finra, eeoc, nyc_ll_144, hipaa_check, bipa, phi, eu_ai_act_annex_iii, bias_audit',
      'SR 11-7 Model Risk Management is pre-notified automatically for predictive ML in actuarial/claims/finance/investments/risk_management',
      'Triage call typically scheduled within 48 hours',
      'Path recommendation defaults to full, but can be overridden to standard with documented reason',
    ],
    triggers: ['Analyst picks full or standard path → assessment_required'],
    citations: [
      'src/lib/classification/intake-router.ts:165-226 enhanced rules',
      'src/lib/triage/triage-actions.ts — path assignment',
    ],
  },
  {
    id: 'enh-assessment',
    x: COL_ENH,
    y: 720,
    lane: 'enhanced',
    kind: 'process',
    title: 'Full Pre-Prod Assessment',
    subtitle: '~55 questions (full path)',
    actor: 'Business User',
    duration: '~45–70 min',
    statuses: ['assessment_required', 'assessment_in_progress'],
    summary:
      'Full path: ALL 10 sections rendered, no skipping. Includes emerging AI risks (Section G), explainability & transparency (Section H), and vendor assessment (Section I) regardless of intake profile.',
    bullets: [
      'Fairness testing evidence required (Section G)',
      'Drift monitoring + adversarial testing required for GenAI',
      'Maximum autonomous action blast radius (Section D)',
      'Third-party vendor AI Act compliance (Section I, 20 questions)',
      'Seven-dimension scoring computed live during form fill',
    ],
    triggers: ['User submits → decision_pending'],
    citations: [
      'src/lib/assessment/section-visibility.ts:48 calculatePathBasedVisibility',
      'src/lib/classification/seven-dimension-scoring.ts — 7-dim scorer',
      'src/lib/classification/eu-ai-act-determination.ts — authoritative EU AI Act tier',
    ],
  },

  // ────────────────────────── BLOCKED LANE ──────────────────────────
  {
    id: 'blk-contact',
    x: COL_BLK,
    y: 560,
    lane: 'blocked',
    kind: 'process',
    title: 'Governance Contact Required',
    actor: 'Head of AI Risk',
    duration: '1–2 business days',
    statuses: ['contact_required'],
    summary:
      'Two rule combinations trigger a hard pause: the governance team must speak with the submitter before the case proceeds to assessment. Not a rejection — a "talk to us first" gate.',
    bullets: [
      'Rule 1: biometric data + computer vision → EU AI Act Article 5 prohibited-practice check',
      'Rule 2: autonomous action + financial decisions → Operational Risk + Change Management gate',
      'User can still save the case as a draft while waiting',
      'After the conversation, the case re-enters triage with documented scope',
    ],
    triggers: ['Governance conversation → re-enters triage queue (standard or enhanced lane)'],
    citations: [
      'src/lib/classification/intake-router.ts:140-160 blocked rules',
      'src/app/review/lightweight/[id]/page.tsx — framing: talk-first, not reject',
    ],
  },
  {
    id: 'blk-rejoin',
    x: COL_BLK,
    y: 720,
    lane: 'blocked',
    kind: 'decision',
    title: 'Re-enter triage',
    subtitle: 'after contact',
    actor: 'Head of AI Risk',
    summary:
      'Post-conversation, the case joins the standard or enhanced lane depending on what the governance team and submitter agreed on.',
    bullets: [
      'Case scope may be narrowed to avoid the prohibited pattern',
      'Compensating controls may be attested before proceeding',
      'Rejection is possible here too — back out entirely if the use case cannot be safely modified',
    ],
    triggers: ['→ enhanced triage / standard triage / rejected'],
    citations: ['src/lib/triage/triage-actions.ts'],
    // Gap CLOSED: rerouteFromBlocked action + UI on inventory detail page implemented.
    // src/lib/store/inventory-store.ts:253-284 rerouteFromBlocked action
    // src/app/inventory/[id]/page.tsx:314-330 re-route form with lane selector + resolution note
  },

  // ────────────────────────── DECISION REVIEW (shared by std / enh) ──────────────────────────
  {
    id: 'decision-review',
    x: (COL_STD + COL_ENH) / 2,
    y: 880,
    lane: 'universal',
    kind: 'process',
    title: 'Decision Review',
    actor: 'Governance Committee',
    duration: '3–7 business days',
    statuses: ['decision_pending'],
    summary:
      'Post-assessment approval gate. Inline Approve/Reject/Escalate buttons on the case detail page. Each requires a decision note (min 10 chars). Decision note auto-posted to the case comment thread.',
    bullets: [
      'Approve → approved (note logged as comment, timeline entry with actor name)',
      'Reject → rejected (note logged as comment, terminal)',
      'Escalate → assessment_required (from lightweight) or triage_pending (from decision_pending)',
      'Decision note required (min 10 chars) before confirm button enables',
      'Actor identity from session (named individual, not mock email)',
    ],
    triggers: ['Decision → approved / changes_requested / rejected / escalated'],
    citations: [
      'src/lib/store/inventory-store.ts:300-380 — approveCase, rejectCase, escalateCase actions',
      'src/app/inventory/[id]/page.tsx:182-195 — inline approve/reject/escalate buttons',
      'src/app/inventory/[id]/page.tsx:305-375 — decision form with required note',
    ],
  },
  {
    id: 'decision-gate',
    x: (COL_STD + COL_ENH) / 2,
    y: 1040,
    lane: 'universal',
    kind: 'decision',
    title: 'Governance Decision',
    subtitle: '4 options',
    summary: 'Branches into 3 terminal/near-terminal outcomes.',
    bullets: [
      'Approve → approved',
      'Approve with conditions → approved (conditions logged)',
      'Changes requested → changes_requested (loops back)',
      'Rejected → rejected (terminal)',
    ],
    triggers: ['Status advanced per decision'],
    citations: ['src/app/review/decision/[id]/page.tsx:27-33 DECISION_STATUS'],
  },

  // ────────────────────────── OUTCOMES ──────────────────────────
  {
    id: 'outcome-changes',
    x: COL_LW + 50,
    y: 1200,
    lane: 'lightweight',
    kind: 'process',
    title: 'Changes Requested',
    actor: 'Business User',
    statuses: ['changes_requested'],
    summary:
      'Reviewer identified specific fixes. Case sits in this status until the user revises and resubmits.',
    bullets: [
      'Rationale captured on the case (min 10 chars)',
      'User returns to the relevant form (intake or assessment)',
      'On resubmit, case re-enters the appropriate review queue',
    ],
    triggers: ['User fixes and resubmits'],
    citations: [
      'src/lib/triage/lightweight-review.ts:30',
      'src/app/review/decision/[id]/page.tsx DECISION_STATUS.changes_requested',
    ],
    // Gap CLOSED: resubmitForReview action implemented.
    // src/lib/store/inventory-store.ts:198-231 — derives correct queue from governance history:
    //   lightweight path → lightweight_review
    //   has assessment → decision_pending
    //   standard/full path → assessment_required
    //   fallback → triage_pending
  },
  {
    id: 'outcome-approved',
    x: (COL_STD + COL_ENH) / 2,
    y: 1200,
    lane: 'universal',
    kind: 'process',
    title: 'Approved',
    actor: 'System',
    statuses: ['approved'],
    summary:
      'Case is cleared for production. If approved_with_conditions, the conditions are captured in the classification explanation and must be met before go-live.',
    bullets: [
      'Decision note logged to classification.explanation',
      'Timeline entry with reviewer identity and timestamp',
      'If conditional: conditions logged verbatim for audit',
    ],
    triggers: ['Manual transition to in_production when launch occurs'],
    citations: [
      'src/lib/store/inventory-store.ts — updateStatus',
      'src/types/inventory.ts — AIUseCaseStatus enum',
    ],
    // Gap CLOSED: markInProduction action with confirmation UI implemented.
    // src/lib/store/inventory-store.ts:233-251 — markInProduction (requires approved status)
    // src/app/inventory/[id]/page.tsx:239-254 — "Mark as In Production" button with confirm dialog
  },
  {
    id: 'outcome-rejected',
    x: COL_BLK + 50,
    y: 1200,
    lane: 'blocked',
    kind: 'terminal',
    title: 'Rejected',
    actor: 'Governance Committee',
    statuses: ['rejected'],
    summary:
      'Case cannot proceed in its current form. Terminal unless the user submits a new intake with revised scope.',
    bullets: [
      'Rationale captured (min 10 chars)',
      'Case closed to further edits',
      'User can register a fresh case with a different scope',
    ],
    triggers: ['Terminal — no outgoing transitions'],
    citations: [
      'src/lib/triage/lightweight-review.ts:35',
      'src/app/review/decision/[id]/page.tsx DECISION_STATUS.rejected',
    ],
  },

  // ────────────────────────── IN PRODUCTION ──────────────────────────
  {
    id: 'in-production',
    x: COL_CENTER,
    y: 1360,
    lane: 'universal',
    kind: 'process',
    title: 'In Production',
    actor: 'Business User + Governance',
    duration: 'until decommissioned',
    statuses: ['in_production'],
    summary:
      'The approved system is live. This is where the governance overlay kicks in: residual risk, evidence collection, periodic re-review, and exception tracking all operate against this state.',
    bullets: [
      'Inherent risk tier locked at approval',
      'Residual risk recomputed as evidence accrues',
      'Review schedule set from tier → cadence',
      'Exceptions tracked against specific controls',
      'Incidents reported through governance channel',
    ],
    triggers: [
      'Evidence → residual risk recomputation',
      'Review schedule elapses → review due',
      'Exception requested → approval workflow',
      'Decommission authorized → scheduled or immediate',
    ],
    citations: [
      'src/types/inventory.ts — AIUseCase.evidence, exceptions, reviewSchedule, residualRisk',
      'src/lib/governance/ — the governance overlay modules',
    ],
    // Gap CLOSED: markInProduction action with confirmation dialog.
    // src/lib/store/inventory-store.ts:233-251
  },

  // ────────────────────────── GOVERNANCE OVERLAY (4 parallel concerns) ──────────────────────────
  {
    id: 'gov-residual',
    x: 160,
    y: 1540,
    lane: 'governance',
    kind: 'governance_overlay',
    title: 'Residual Risk',
    subtitle: 'recomputed on evidence change',
    actor: 'System + Risk Officer',
    summary:
      'Residual risk = inherent risk minus control credit. Up to 2 tiers of reduction, capped by regulatory floor.',
    bullets: [
      '7 mitigations: human oversight, bias audit, robustness, monitoring, incident response, risk mgmt, model validation',
      'Each mitigation worth 0–1.0 credit based on evidence quality (text only / collected / attested). Human oversight: pre-decision→1.0, post-decision+SLA→0.4-0.6, spot-check→0.2, assessment-only→0.3',
      '~3.5 credit = 1 tier reduction',
      'Regulatory floor: cases with a regulatory rule fired cannot drop more than 1 tier below inherent',
      'Control credit cap by tier: high→2, mh→2, m→2, ml→1, low→0',
    ],
    triggers: ['Residual tier recomputed', 'Dashboard updated'],
    citations: [
      'src/lib/governance/residual-risk.ts (356 lines)',
      'src/lib/governance/types.ts — ResidualRiskResult',
    ],
  },
  {
    id: 'gov-evidence',
    x: 480,
    y: 1540,
    lane: 'governance',
    kind: 'governance_overlay',
    title: 'Evidence Collection',
    subtitle: 'evidence-driven compliance',
    actor: 'Use Case Owner + Attestors',
    summary:
      '19 evidence categories map to 31 controls across 10 frameworks (EU AI Act, GDPR, NIST AI RMF 1.0, SR 11-7, ISO 42001, ECOA, SEC/FINRA, Reg E, FTC, CFPB/OCC). Tier-gated via requiredEvidenceCategories(). Each artifact has status (collected / attested / expired / rejected) and controlIds.',
    bullets: [
      'Artifacts: model card, dataset sheet, bias audit, robustness test, DPIA, FRIA, risk mgmt plan, tech docs, oversight design, monitoring plan, incident response, validation report, security assessment, vendor DPA, vendor SLA, training records, change log, attestation, other',
      'Attestation by responsible role (risk officer / DPO / security / legal / model validator / use case owner)',
      'Completeness % = mandatory controls satisfied ÷ mandatory controls total',
      'Artifact status: collected → attested (by role + timestamp)',
    ],
    triggers: ['Attested evidence increases residual risk credit'],
    citations: [
      'src/lib/governance/types.ts — EvidenceArtifact, EvidenceCategory',
      'src/lib/governance/controls.ts — control library',
      'src/lib/governance/evidence-completeness.ts — compliance report builder',
    ],
    gap: 'Completeness % is computed but not gating any approval. A "can\'t approve unless completenessPct >= X" rule is not wired up anywhere.',
  },
  {
    id: 'gov-review',
    x: 800,
    y: 1540,
    lane: 'governance',
    kind: 'governance_overlay',
    title: 'Periodic Review',
    subtitle: 'tier-based cadence',
    actor: 'Review Owner',
    summary:
      'Review cadence is derived from max(confirmed post-triage tier, residual tier) — the confirmed tier acts as a floor. A High-risk system gets monthly review even if evidence reduces residual to Medium-High. Cadence refreshed on each review via recordReview().',
    bullets: [
      'high → monthly (30 days)',
      'medium_high → quarterly (91 days)',
      'medium → semi-annual (182 days)',
      'medium_low → annual (365 days)',
      'low → annual (365 days)',
      'Status helpers: overdue / due_soon (≤14 days) / upcoming (≤60 days) / on_track',
    ],
    triggers: ['Overdue review → notification (not wired up)'],
    citations: [
      'src/lib/governance/review-schedule.ts',
      'src/lib/governance/types.ts — ReviewSchedule, ReviewFrequency',
    ],
    gap: 'The pure functions (isReviewOverdue, daysUntilReview, reviewStatus) exist, but nothing calls them on a schedule. There is no sweeper / cron job that transitions overdue cases into a "re-review required" state or notifies the review owner.',
  },
  {
    id: 'gov-exceptions',
    x: 1120,
    y: 1540,
    lane: 'governance',
    kind: 'governance_overlay',
    title: 'Exceptions & Waivers',
    subtitle: 'policy deviation tracking',
    actor: 'Requester + Approver',
    summary:
      'Formally-tracked exceptions from policy with approver, expiry, and compensating controls. Six reasons codified. Status: active / expired / revoked.',
    bullets: [
      'Reasons: business_critical, regulatory_uncertainty, technical_infeasibility, temporary_workaround, inherited_risk, other',
      'Required fields: justification, compensating controls, approver, expiry date',
      'Lifecycle: createException → (sweepExpiredExceptions) → expired OR revokeException → revoked',
      'daysUntilExpiry helper for warning banners',
    ],
    triggers: ['Expired exception → compensating controls must be re-verified'],
    citations: [
      'src/lib/governance/exceptions.ts',
      'src/lib/governance/types.ts — GovernanceException, ExceptionReason',
    ],
    gap: 'createException() assumes approvedBy is decided at creation time. No multi-step approval workflow (request → review → approve/deny). sweepExpiredExceptions() is called on mount of the /exceptions register page (src/app/exceptions/page.tsx) but not on a true cron schedule.',
  },

  // ────────────────────────── DECOMMISSIONING ──────────────────────────
  {
    id: 'decommission',
    x: COL_CENTER,
    y: 1780,
    lane: 'universal',
    kind: 'process',
    title: 'Decommissioning',
    actor: 'Authorized Individual',
    summary:
      'End of lifecycle. Two modes: immediate (effectiveDate ≤ now) or scheduled (effectiveDate in future — the case stays in production until the effective date arrives).',
    bullets: [
      '5 reasons: operational, regulatory, replaced, retired, other',
      'Required: reason, effective date, authorizedBy (free-text per policy)',
      'Notes required when reason = other (min 10 chars)',
      'Decommission note logged to classification.explanation',
      'Timeline entry with authorizedBy and timestamp',
    ],
    triggers: ['Immediate → decommissioned. Scheduled → stays in_production, awaits sweeper.'],
    citations: [
      'src/lib/lifecycle/decommission.ts — pure logic + tests',
      'src/lib/lifecycle/decommission.ts:68 DECOMMISSION_REASONS',
      'src/lib/lifecycle/decommission.ts:91 applyDecommission',
    ],
    gap: 'No sweeper for scheduled decommissions. A case with a future effectiveDate stays in_production forever unless someone manually triggers the transition on the effective date.',
  },
  {
    id: 'terminal-decommissioned',
    x: COL_CENTER,
    y: 1960,
    lane: 'universal',
    kind: 'terminal',
    title: 'Decommissioned',
    statuses: ['decommissioned'],
    summary: 'Terminal state. No further transitions. Case retained for audit only.',
    bullets: [
      'Audit trail remains queryable',
      'Comments thread remains readable',
      'Evidence artifacts remain attached for historical reference',
    ],
    triggers: ['Terminal — no outgoing transitions'],
    citations: ['src/types/inventory.ts — AIUseCaseStatus'],
  },
];

const EDGES: WorkflowEdge[] = [
  { from: 'entry', to: 'auto-classify', kind: 'forward' },
  { from: 'auto-classify', to: 'lane-decision', kind: 'forward' },

  // Lane assignment → 4 lanes
  { from: 'lane-decision', to: 'lw-queue', kind: 'forward', label: 'lightweight' },
  { from: 'lane-decision', to: 'std-triage', kind: 'forward', label: 'standard' },
  { from: 'lane-decision', to: 'enh-triage', kind: 'forward', label: 'enhanced' },
  { from: 'lane-decision', to: 'blk-contact', kind: 'forward', label: 'blocked' },

  // Lightweight lane flow
  { from: 'lw-queue', to: 'lw-decision', kind: 'forward' },
  { from: 'lw-decision', to: 'outcome-approved', kind: 'forward', label: 'approve' },
  { from: 'lw-decision', to: 'outcome-changes', kind: 'forward', label: 'changes' },
  { from: 'lw-decision', to: 'std-assessment', kind: 'escalate', label: 'escalate' },
  { from: 'lw-decision', to: 'outcome-rejected', kind: 'forward', label: 'reject' },

  // Standard lane flow
  { from: 'std-triage', to: 'std-assessment', kind: 'forward' },
  { from: 'std-assessment', to: 'decision-review', kind: 'forward' },

  // Enhanced lane flow
  { from: 'enh-triage', to: 'enh-assessment', kind: 'forward' },
  { from: 'enh-assessment', to: 'decision-review', kind: 'forward' },

  // Blocked lane flow
  { from: 'blk-contact', to: 'blk-rejoin', kind: 'forward' },
  { from: 'blk-rejoin', to: 'std-triage', kind: 'escalate', label: 'standard' },
  { from: 'blk-rejoin', to: 'enh-triage', kind: 'escalate', label: 'enhanced' },
  { from: 'blk-rejoin', to: 'outcome-rejected', kind: 'forward', label: 'reject' },

  // Decision review → outcomes
  { from: 'decision-review', to: 'decision-gate', kind: 'forward' },
  { from: 'decision-gate', to: 'outcome-approved', kind: 'forward' },
  { from: 'decision-gate', to: 'outcome-changes', kind: 'forward', label: 'changes' },
  { from: 'decision-gate', to: 'outcome-rejected', kind: 'forward', label: 'reject' },

  // Approved → in production (gap)
  { from: 'outcome-approved', to: 'in-production', kind: 'forward' },

  // In production → governance overlays
  { from: 'in-production', to: 'gov-residual', kind: 'overlay' },
  { from: 'in-production', to: 'gov-evidence', kind: 'overlay' },
  { from: 'in-production', to: 'gov-review', kind: 'overlay' },
  { from: 'in-production', to: 'gov-exceptions', kind: 'overlay' },

  // In production → decommissioning
  { from: 'in-production', to: 'decommission', kind: 'forward' },
  { from: 'decommission', to: 'terminal-decommissioned', kind: 'forward' },

  // Re-entry loop — IMPLEMENTED via resubmitForReview action
  { from: 'outcome-changes', to: 'std-assessment', kind: 'loop', label: 'resubmit' },
  // New edges for approve/reject/escalate from decision_pending or lightweight_review
  { from: 'decision-review', to: 'outcome-approved', kind: 'forward', label: 'approve (inline)' },
  { from: 'decision-review', to: 'outcome-rejected', kind: 'forward', label: 'reject (inline)' },
  { from: 'decision-review', to: 'std-assessment', kind: 'escalate', label: 'escalate' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProcessMindMapPage() {
  const [selectedId, setSelectedId] = useState<string>('entry');
  const [activeLane, setActiveLane] = useState<Lane | 'all'>('all');

  const nodeById = useMemo(() => {
    const m = new Map<string, WorkflowNode>();
    for (const n of NODES) m.set(n.id, n);
    return m;
  }, []);

  const selected = nodeById.get(selectedId) ?? NODES[0];

  const isNodeVisible = useCallback(
    (node: WorkflowNode) => {
      if (activeLane === 'all') return true;
      if (node.lane === 'universal' || node.lane === 'governance') return true;
      return node.lane === activeLane;
    },
    [activeLane],
  );

  const isEdgeVisible = useCallback(
    (edge: WorkflowEdge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) return false;
      return isNodeVisible(from) && isNodeVisible(to);
    },
    [nodeById, isNodeVisible],
  );

  const stats = useMemo(
    () => [
      { label: 'Process Steps', value: '7', note: 'user-facing' },
      { label: 'State Machine', value: '13', note: 'src/types/inventory.ts:20-32' },
      { label: 'Intake Questions', value: '36', note: 'src/config/questions.ts' },
      { label: 'Risk Tiers', value: '5', note: 'low → high' },
      { label: 'Scoring Dimensions', value: '7+7', note: 'intake 7 + assessment 7' },
      { label: 'Router Rules', value: '14', note: 'incl. PII trigger' },
      { label: 'Review Paths', value: '4', note: 'lightweight / std / full / blocked' },
      { label: 'Governance Modules', value: '6', note: '31 controls, 10 frameworks' },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-xs text-slate-500 transition-colors hover:text-slate-700">
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">AI Governance Workflow Map</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every node on this map is grounded in a specific file in the codebase — no UI narrative,
          no hand-waving. Click any node to see the underlying logic, actors, time estimates,
          triggers, and any gaps where the code is incomplete.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{s.value}</p>
            <p className="text-[10px] text-slate-400">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Lane filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Filter lane:</span>
        {(['all', 'lightweight', 'standard', 'enhanced', 'blocked'] as const).map((lane) => {
          const isActive = activeLane === lane;
          const style = lane === 'all' ? null : LANE_STYLES[lane as Lane];
          return (
            <button
              key={lane}
              type="button"
              onClick={() => setActiveLane(lane)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? lane === 'all'
                    ? 'bg-slate-900 text-white'
                    : `${style?.bg} ${style?.text} ring-2 ring-offset-1 ${style?.border.replace('border-', 'ring-')}`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lane === 'all' ? 'All lanes' : LANE_STYLES[lane as Lane].label}
            </button>
          );
        })}
      </div>

      {/* Main layout: canvas + detail panel */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Canvas */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/40 p-4 shadow-sm">
          <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            {/* SVG edges layer */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            >
              <title>Workflow edges</title>
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="arrow-escalate"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
                </marker>
                <marker
                  id="arrow-loop"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
                </marker>
              </defs>

              {EDGES.filter(isEdgeVisible).map((edge) => {
                const from = nodeById.get(edge.from);
                const to = nodeById.get(edge.to);
                if (!from || !to) return null;

                const nh = from.height ?? NODE_HEIGHT;
                const th = to.height ?? NODE_HEIGHT;

                const x1 = from.x;
                const y1 = from.y + nh / 2;
                const x2 = to.x;
                const y2 = to.y - th / 2;

                // For overlay edges, draw as dashed thin curves.
                const isOverlay = edge.kind === 'overlay';
                const isLoop = edge.kind === 'loop';
                const isEscalate = edge.kind === 'escalate';

                const color = isLoop
                  ? '#dc2626'
                  : isEscalate
                    ? '#d97706'
                    : isOverlay
                      ? '#9333ea'
                      : '#94a3b8';
                const strokeDash = isOverlay ? '4 4' : isLoop ? '6 3' : undefined;
                const marker = isLoop
                  ? 'url(#arrow-loop)'
                  : isEscalate
                    ? 'url(#arrow-escalate)'
                    : 'url(#arrow)';
                const strokeWidth = isOverlay ? 1.5 : 2;

                // Path: straight when vertical, curve when horizontal offset
                const isVertical = Math.abs(x1 - x2) < 5;
                const pathD = isVertical
                  ? `M ${x1} ${y1} L ${x2} ${y2}`
                  : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      markerEnd={marker}
                      opacity={isOverlay ? 0.6 : 0.9}
                    />
                    {edge.label && (
                      <g>
                        <rect
                          x={midX - 32}
                          y={midY - 8}
                          width={64}
                          height={16}
                          rx={8}
                          fill="white"
                          stroke={color}
                          strokeWidth={0.5}
                        />
                        <text
                          x={midX}
                          y={midY + 3}
                          textAnchor="middle"
                          fontSize="9"
                          fill={color}
                          fontWeight="600"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {NODES.filter(isNodeVisible).map((node) => {
              const style = LANE_STYLES[node.lane];
              const isSelected = node.id === selectedId;
              const w = node.width ?? NODE_WIDTH;
              const h = node.height ?? NODE_HEIGHT;
              const isDecision = node.kind === 'decision';
              const isTerminal = node.kind === 'terminal';
              const isOverlay = node.kind === 'governance_overlay';
              const isEntry = node.kind === 'entry';

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={`absolute text-left transition-all ${
                    isSelected ? 'z-10 scale-[1.03]' : 'z-[1]'
                  }`}
                  style={{
                    left: node.x - w / 2,
                    top: node.y - h / 2,
                    width: w,
                    height: h,
                  }}
                >
                  <div
                    className={`flex h-full w-full flex-col justify-center border-2 px-3 py-2 transition-all ${
                      style.border
                    } ${style.bg} ${
                      isDecision
                        ? 'rounded-none [clip-path:polygon(8%_0,92%_0,100%_50%,92%_100%,8%_100%,0_50%)]'
                        : isTerminal
                          ? 'rounded-lg ring-2 ring-offset-2'
                          : isOverlay
                            ? 'rounded-xl border-dashed'
                            : isEntry
                              ? 'rounded-xl shadow-md'
                              : 'rounded-xl'
                    } ${
                      isSelected
                        ? 'shadow-lg ring-2 ring-blue-500 ring-offset-2'
                        : 'shadow-sm hover:shadow-md'
                    } ${node.gap ? 'after:absolute after:right-2 after:top-2 after:text-[10px] after:content-["⚠"]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${style.text} opacity-70`}
                      >
                        {isDecision
                          ? 'Decision'
                          : isTerminal
                            ? 'Terminal'
                            : isOverlay
                              ? 'Governance'
                              : isEntry
                                ? 'Entry'
                                : 'Process'}
                      </span>
                      {node.gap && (
                        <span
                          role="img"
                          aria-label="has implementation gap"
                          className="text-[10px] font-bold text-amber-600"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                    <div className={`mt-0.5 text-xs font-bold leading-tight ${style.text}`}>
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div className="text-[10px] italic text-slate-500">{node.subtitle}</div>
                    )}
                    {(node.actor || node.duration) && (
                      <div className="mt-1 flex items-center gap-1.5">
                        {node.actor && (
                          <span className="text-[9px] text-slate-600">{node.actor}</span>
                        )}
                        {node.duration && (
                          <span className="rounded bg-white/80 px-1 text-[9px] font-mono text-slate-500">
                            {node.duration}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${LANE_STYLES[selected.lane].dot}`}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {LANE_STYLES[selected.lane].label} ·{' '}
                    {selected.kind === 'decision'
                      ? 'Decision gate'
                      : selected.kind === 'terminal'
                        ? 'Terminal state'
                        : selected.kind === 'governance_overlay'
                          ? 'Governance overlay'
                          : selected.kind === 'entry'
                            ? 'Entry point'
                            : 'Process step'}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{selected.title}</h2>
                {selected.subtitle && (
                  <p className="text-xs italic text-slate-500">{selected.subtitle}</p>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
              {selected.actor && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                  <span className="font-semibold">Actor:</span> {selected.actor}
                </span>
              )}
              {selected.duration && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                  <span className="font-semibold">Duration:</span> {selected.duration}
                </span>
              )}
              {selected.statuses && selected.statuses.length > 0 && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-blue-700">
                  {selected.statuses.join(' | ')}
                </span>
              )}
            </div>

            {/* Summary */}
            <p className="mb-4 text-sm leading-relaxed text-slate-700">{selected.summary}</p>

            {/* What happens */}
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                What happens here
              </p>
              <ul className="space-y-1.5">
                {selected.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-xs leading-snug text-slate-700">
                    <span
                      className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${LANE_STYLES[selected.lane].dot}`}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Triggers */}
            {selected.triggers.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Triggers the next step
                </p>
                <ul className="space-y-1">
                  {selected.triggers.map((t) => (
                    <li key={t} className="text-xs text-slate-700">
                      → {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gap */}
            {selected.gap && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                  <span>⚠</span>
                  <span>Implementation gap</span>
                </p>
                <p className="text-xs leading-relaxed text-amber-900">{selected.gap}</p>
              </div>
            )}

            {/* Citations */}
            {selected.citations.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Source code
                </p>
                <ul className="space-y-0.5">
                  {selected.citations.map((c) => (
                    <li key={c} className="font-mono text-[10px] text-slate-500">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Legend
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Lightweight lane — ~40% of cases</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Standard lane — ~40% of cases</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Enhanced lane — ~15% of cases</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>Blocked lane — ~5% of cases</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span>Governance overlay (post-approval)</span>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                <span className="text-[10px]">⚠</span>
                <span>Step has an implementation gap</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="8" aria-hidden>
                  <title>Loop</title>
                  <line
                    x1="0"
                    y1="4"
                    x2="20"
                    y2="4"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                  />
                </svg>
                <span>Re-entry loop (often unimplemented)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="8" aria-hidden>
                  <title>Overlay</title>
                  <line
                    x1="0"
                    y1="4"
                    x2="20"
                    y2="4"
                    stroke="#9333ea"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
                <span>Governance overlay</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
            <p className="mb-1 font-semibold">How to read this map</p>
            <p className="leading-relaxed">
              Top-down flow, split by color into 4 lanes. Every node is clickable — the detail panel
              shows the logic, actors, triggers, source files, and any implementation gaps. Gaps are
              real; they&apos;re flagged with ⚠ and described frankly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
