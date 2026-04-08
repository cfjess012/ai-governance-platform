import type { EuAiActAssessmentResult } from '@/lib/classification/eu-ai-act-assessment';
import type { RiskTier, SevenDimensionResult } from '@/lib/classification/seven-dimension-scoring';
import type { AssessmentFormData } from '@/lib/questions/assessment-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';
import type { InherentRiskResult, InherentRiskTier } from '@/lib/risk/types';

export interface StatusChange {
  status: AIUseCaseStatus;
  timestamp: string;
  changedBy: string;
}

export type AIUseCaseStatus =
  | 'draft'
  | 'submitted'
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
  /** Triage decision made by the governance team (set after triage) */
  triage?: TriageDecision;
  /** Lightweight review record (set when governance path is 'lightweight') */
  lightweightReview?: LightweightReview;
  /** Conversation thread between business user and governance team */
  comments: CaseComment[];
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}
