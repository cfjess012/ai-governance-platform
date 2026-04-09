import type { EuAiActAssessmentResult } from '@/lib/classification/eu-ai-act-determination';
import type { RouterDecision } from '@/lib/classification/intake-router';
import type { RiskTier, SevenDimensionResult } from '@/lib/classification/seven-dimension-scoring';
import type {
  EvidenceArtifact,
  GovernanceException,
  ResidualRiskResult,
  ReviewSchedule,
} from '@/lib/governance/types';
import type { AssessmentFormData } from '@/lib/questions/assessment-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';
import type { InherentRiskResult, InherentRiskTier } from '@/lib/risk/types';

export interface StatusChange {
  status: AIUseCaseStatus;
  timestamp: string;
  changedBy: string;
  /**
   * P7: Optional audit event description for non-status-change timeline entries.
   * When present, this is a governance audit event (evidence upload, attestation,
   * assessment completion, etc.) rather than a status transition.
   */
  auditEvent?: string;
}

export type AIUseCaseStatus =
  | 'draft'
  | 'submitted'
  | 'contact_required' // Blocked lane — governance must talk to the submitter before the case moves forward
  | 'triage_pending'
  | 'lightweight_review'
  | 'assessment_required'
  | 'assessment_in_progress'
  | 'decision_pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'in_production'
  | 'decommissioned';

/**
 * One event in the re-route history. Created whenever a blocked case is
 * manually moved into a different lane by the governance team after a
 * resolution conversation.
 */
export interface RerouteEvent {
  /** Lane the case was in before the re-route (always 'blocked' for now). */
  fromLane: 'blocked';
  /** Lane the case was moved into — determines the next status. */
  toLane: 'lightweight' | 'standard' | 'enhanced';
  /** Required rationale for the re-route (audit artifact). */
  resolutionNote: string;
  /** Who performed the re-route. */
  reroutedBy: string;
  /** ISO timestamp. */
  reroutedAt: string;
}

/** Path the governance team chooses for this use case after triage */
export type GovernancePath =
  | 'lightweight' // Low-risk, single-reviewer approval, ~10 questions
  | 'standard' // Medium-risk, full assessment with conditional sections
  | 'full'; // High/critical risk, full assessment + meeting + evidence collection

/** Triage decision recorded by the governance team */
export interface TriageDecision {
  /** 5-tier inherent risk confirmed (or overridden) by the reviewer */
  confirmedInherentTier: InherentRiskTier;
  /** Whether the reviewer overrode the auto-calculated tier */
  riskTierOverridden: boolean;
  /** Reason for override (required if overridden) */
  overrideReason?: string;
  /** Governance path chosen for this case */
  governancePath: GovernancePath;
  /** Reviewer assigned to drive the assessment/decision */
  assignedReviewer: string;
  /** Triage notes from the governance team */
  triageNotes: string;
  /** Who made the triage decision */
  triagedBy: string;
  /** When triage was completed */
  triagedAt: string;
}

/** A comment in the case conversation thread */
export interface CaseComment {
  id: string;
  author: string;
  /** Author role for visual distinction */
  authorRole: 'business_user' | 'governance_team' | 'reviewer';
  body: string;
  timestamp: string;
}

/** Possible decisions a lightweight reviewer can make */
export type LightweightDecision = 'approve' | 'changes_requested' | 'escalate' | 'reject';

/**
 * Lightweight review record. Filled by the assigned reviewer (governance team
 * member) — NOT by the business user. This is a deliberate single-reviewer
 * approval artifact for low-risk cases.
 */
export interface LightweightReview {
  /** Has the intake information been verified as accurate? */
  intakeAccurate: boolean;
  /** Confirms basic controls are in place (logging, error handling) */
  basicControlsConfirmed: boolean;
  /** Named contact responsible for incident escalation */
  escalationContact: string;
  /** Reviewer's notes summarizing what was checked and conclusions */
  reviewNotes: string;
  /** Final decision */
  decision: LightweightDecision;
  /** Conditions of approval (if approved with conditions) */
  approvalConditions?: string;
  /** Reason for changes requested or rejection */
  rejectionReason?: string;
  /** Who performed the review */
  reviewedBy: string;
  /** When the review was completed */
  reviewedAt: string;
}

/**
 * P5: Structured human oversight design documentation.
 * Required by EU AI Act Article 14 (human oversight) and SR 11-7
 * (model risk management). Captures the review mechanism design,
 * escalation procedures, and failsafes.
 */
export type OversightModel =
  | 'pre_decision_review'
  | 'post_decision_review'
  | 'spot_check'
  | 'no_oversight';

export interface HumanOversightDesign {
  oversightModel: OversightModel;
  /** e.g., "4 hours" — SLA for human review of AI decisions */
  reviewTimeframeSLA: string;
  /** What conditions trigger escalation to a senior reviewer */
  escalationTriggers: string;
  /** Who has authority to override the AI decision */
  overrideAuthority: string;
  /** How the review queue is monitored for SLA compliance */
  queueMonitoringProcess: string;
  /** What happens if the review SLA is not met */
  failsafeIfQueueExceeded: string;
}

/**
 * P9: Assessor attestation — the named individual who completed the
 * pre-production assessment. SR 11-7 requires that model risk management
 * activities be attributable to named, qualified individuals.
 */
export interface AssessorAttestation {
  name: string;
  title: string;
  submittedAt: string;
  declaration: string;
}

export interface AIUseCase {
  id: string;
  intake: IntakeFormData;
  assessment?: AssessmentFormData;
  scoring?: SevenDimensionResult;
  classification: {
    euAiActTier: 'prohibited' | 'high' | 'limited' | 'minimal' | 'pending';
    riskTier: RiskTier | 'pending';
    overrideTriggered: boolean;
    explanation: string[];
  };
  euAiActDetail?: EuAiActAssessmentResult;
  status: AIUseCaseStatus;
  timeline: StatusChange[];
  /**
   * Inherent risk result computed from intake answers.
   * This is the preliminary risk classification — based on the intake alone,
   * before any triage override or assessment refinement.
   * The 5-tier rating, fired rules, fired patterns, and applicable frameworks
   * all live here.
   */
  inherentRisk?: InherentRiskResult;
  /**
   * P5: Structured human oversight design documentation.
   * Required for EU AI Act Article 14 and SR 11-7.
   * Gated to appear when oversight model is post_decision or spot_check.
   */
  humanOversightDesign?: HumanOversightDesign;
  /**
   * P9: Assessor attestation — the named individual who completed the
   * pre-production assessment and attests to its accuracy.
   */
  assessorAttestation?: AssessorAttestation;
  /** Triage decision made by the governance team (set after triage) */
  triage?: TriageDecision;
  /** Lightweight review record (set when governance path is 'lightweight') */
  lightweightReview?: LightweightReview;
  /** Conversation thread between business user and governance team */
  comments: CaseComment[];
  /**
   * Governance evidence artifacts attached to this case.
   * These are the proof-of-control documents (model cards, bias audits,
   * DPIAs, FRIAs, monitoring plans, validation reports, etc.) that turn
   * the platform from attestation-only to evidence-driven compliance.
   */
  evidence?: EvidenceArtifact[];
  /**
   * Active and historical exceptions for this case.
   * Exceptions are formally-tracked deviations from policy with named
   * approver, business justification, compensating controls, and expiry.
   */
  exceptions?: GovernanceException[];
  /**
   * Periodic review schedule. Computed from inherent (or residual) risk
   * tier after triage and after every approval transition.
   */
  reviewSchedule?: ReviewSchedule;
  /**
   * Residual risk result — risk remaining after evidence and assessment
   * mitigations are applied to the inherent baseline. Recomputed when
   * evidence or assessment changes.
   */
  residualRisk?: ResidualRiskResult;
  /**
   * The Layer 1 router decision — lane, fired rules, regulatory tags.
   * Persisted on every case regardless of which intake flow was used,
   * so the triage team can see what the router flagged at submission
   * time (and so blocked cases can be detected and re-routed later).
   */
  routerDecision?: RouterDecision;
  /**
   * History of manual re-routes from the blocked lane. Each entry
   * records who moved the case, from where, to where, and why.
   * Append-only audit trail.
   */
  rerouteHistory?: RerouteEvent[];
  /**
   * ISO timestamp of when the case was explicitly marked as live in
   * production. Set by the `markInProduction` store action, which is
   * only callable on cases in `approved` status.
   */
  productionDate?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}
