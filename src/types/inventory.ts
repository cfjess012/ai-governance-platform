import type { EuAiActAssessmentResult } from '@/lib/classification/eu-ai-act-assessment';
import type { RiskTier, SevenDimensionResult } from '@/lib/classification/seven-dimension-scoring';
import type { AssessmentFormData } from '@/lib/questions/assessment-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';

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
  /** Risk tier confirmed or overridden by the reviewer */
  confirmedRiskTier: RiskTier;
  /** Whether the reviewer overrode the auto-classification */
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
  /** Triage decision made by the governance team (set after triage) */
  triage?: TriageDecision;
  /** Conversation thread between business user and governance team */
  comments: CaseComment[];
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}
