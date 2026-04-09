/**
 * Governance object types — the four "first-class governance objects" that
 * turn the platform from a risk questionnaire into a compliance instrument.
 *
 * 1. EvidenceArtifact — proof that a control is implemented
 * 2. GovernanceException — approved deviation from policy
 * 3. ReviewSchedule — periodic re-attestation cadence
 * 4. ResidualRiskResult — risk *after* mitigations and evidence
 *
 * All four are pure data shapes — no behavior. The store layer wires them
 * into AIUseCase. Pure functions in sibling files (controls.ts,
 * residual-risk.ts, review-schedule.ts, evidence-completeness.ts) operate
 * on these shapes.
 */

import type { InherentRiskTier } from '@/lib/risk/types';

// ─── Evidence Artifacts ─────────────────────────────────────────────

/**
 * Categories of evidence the platform recognizes.
 * Each maps loosely to a control family in the controls library.
 */
export type EvidenceCategory =
  | 'model_card' // Model documentation (e.g., Hugging Face card, vendor spec sheet)
  | 'dataset_sheet' // Datasheets for Datasets / Data Statements
  | 'bias_audit' // Disparate impact / fairness evaluation report
  | 'robustness_test' // Adversarial / OOD / red-team evaluation
  | 'dpia' // Data Protection Impact Assessment (GDPR Article 35)
  | 'fria' // Fundamental Rights Impact Assessment (EU AI Act Article 27)
  | 'risk_management_plan' // EU AI Act Article 9
  | 'technical_documentation' // EU AI Act Article 11 / Annex IV
  | 'human_oversight_design' // EU AI Act Article 14
  | 'monitoring_plan' // Drift / performance / safety monitoring
  | 'incident_response_plan' // IR runbook
  | 'validation_report' // SR 11-7 model validation
  | 'security_assessment' // Prompt injection, model extraction tests
  | 'vendor_dpa' // Data processing agreement
  | 'vendor_sla' // Service level agreement
  | 'training_records' // Who has been trained on responsible AI use
  | 'change_log' // Model version history with risk-impact analysis
  | 'attestation' // Signed attestation from a named owner
  | 'other';

/** Lifecycle status of an evidence artifact */
export type EvidenceStatus =
  | 'collected' // Uploaded and tagged but not yet attested
  | 'attested' // A named owner has signed off on its accuracy
  | 'expired' // Past its validity window — requires refresh
  | 'rejected'; // Reviewer rejected the artifact (insufficient, wrong)

/**
 * A piece of governance evidence attached to a use case.
 * In production this would carry an S3 (or equivalent) reference;
 * in the POC we store a synthetic file reference.
 */
export interface EvidenceArtifact {
  /** Stable id (e.g., evd-<random>) */
  id: string;
  /** Category of evidence — drives controls library lookups */
  category: EvidenceCategory;
  /** Display title (e.g., "Q1 2026 Bias Audit Report") */
  title: string;
  /** Original filename (preserved for download UX) */
  fileName: string;
  /** Synthetic file reference. In prod, an S3 key. In the POC, a sha or marker. */
  fileRef: string;
  /** Size in bytes (for display) */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** Free-form description */
  description?: string;
  /** Lifecycle status */
  status: EvidenceStatus;
  /**
   * Control ids this artifact provides evidence for.
   * Empty array means "untagged". The completeness checker uses this
   * to determine which required controls have evidence.
   */
  controlIds: string[];
  /** When the artifact was uploaded */
  uploadedAt: string;
  /** Who uploaded it */
  uploadedBy: string;
  /** Attestation block — present if status === 'attested' */
  attestation?: {
    attestedBy: string;
    attestedRole: string;
    attestedAt: string;
    note?: string;
  };
  /** ISO date after which this artifact is considered stale */
  expiresAt?: string;
  /** Reason for rejection — present if status === 'rejected' */
  rejectionReason?: string;
}

// ─── Exceptions / Waivers ───────────────────────────────────────────

/**
 * Why an exception was granted — drives reporting and audit categorization.
 */
export type ExceptionReason =
  | 'business_critical' // Material business value justifies deviation
  | 'regulatory_uncertainty' // Framework requirement is unclear
  | 'technical_infeasibility' // Required control isn't technically achievable yet
  | 'temporary_workaround' // Time-bounded gap during remediation
  | 'inherited_risk' // Pre-existing system, grandfathered in
  | 'other';

export type ExceptionStatus = 'active' | 'expired' | 'revoked';

/**
 * A formally-tracked deviation from policy.
 *
 * Exceptions are first-class objects so they can be:
 *   - Listed in an audit-ready exception register
 *   - Tracked to expiry and forced to renew or remediate
 *   - Linked to board approval / executive sign-off
 *   - Reported on at portfolio level
 */
export interface GovernanceException {
  /** Stable id (e.g., exc-<random>) */
  id: string;
  /** The use case this exception belongs to */
  useCaseId: string;
  /** What policy / control / requirement this exception is from */
  policyOrControl: string;
  /** Categorized reason */
  reason: ExceptionReason;
  /** Free-form business justification (the audit narrative) */
  justification: string;
  /** Compensating controls in lieu of the waived requirement */
  compensatingControls: string;
  /** Lifecycle status */
  status: ExceptionStatus;
  /** Who requested the exception */
  requestedBy: string;
  /** When it was requested */
  requestedAt: string;
  /** The named approver (typically a CRO, Head of AI Risk, or board delegate) */
  approvedBy?: string;
  /** Approver's role/title (for audit) */
  approvedByRole?: string;
  /** When the exception was approved */
  approvedAt?: string;
  /** ISO date the exception expires — required for active exceptions */
  expiresAt?: string;
  /** If revoked, when */
  revokedAt?: string;
  /** If revoked, by whom */
  revokedBy?: string;
  /** If revoked, why */
  revocationReason?: string;
}

// ─── Periodic Review Schedule ───────────────────────────────────────

/** How often a use case at a given tier must be reviewed */
export type ReviewFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface ReviewSchedule {
  /** Cadence */
  frequency: ReviewFrequency;
  /** When the most recent review was completed */
  lastReviewedAt?: string;
  /** When the next review is due (computed) */
  nextReviewDue: string;
  /** Who owns the next review */
  reviewOwner?: string;
}

// ─── Residual Risk ──────────────────────────────────────────────────

/**
 * The result of computing residual risk (inherent risk minus control credit).
 *
 * The control credit comes from:
 *   - Evidence artifacts collected for required controls
 *   - Mitigations recorded in the assessment (drift monitoring, human oversight, etc.)
 *
 * Residual risk is bounded BELOW by the inherent risk floor — you cannot
 * mitigate yourself out of an EU AI Act Annex III high-risk classification
 * just by collecting evidence.
 */
export interface ResidualRiskResult {
  /** The inherent tier from the original calculation */
  inherentTier: InherentRiskTier;
  /** The residual tier after applying control credit */
  residualTier: InherentRiskTier;
  /** Numeric control credit applied (0-2 — capped so you can't drop more than 2 tiers) */
  controlCreditApplied: number;
  /** Maximum control credit that could be earned (varies by inherent tier) */
  controlCreditMax: number;
  /** Tier the residual cannot drop below (regulatory floor) */
  residualFloor: InherentRiskTier;
  /** Per-mitigation breakdown — what credit each mitigation contributed */
  mitigationCredits: Array<{
    /** Stable id of the mitigation */
    id: string;
    /** Display label */
    label: string;
    /** Credit earned (0-1) */
    credit: number;
    /** What evidence supported it */
    evidenceBasis: string;
  }>;
  /** Plain-language summary */
  explanation: string;
  /** When this was computed */
  computedAt: string;
}
