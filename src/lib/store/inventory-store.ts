import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CreateExceptionInput,
  createException as createExceptionPure,
  revokeException as revokeExceptionPure,
  sweepExpiredExceptions,
} from '@/lib/governance/exceptions';
import { calculateResidualRisk } from '@/lib/governance/residual-risk';
import { computeReviewSchedule } from '@/lib/governance/review-schedule';
import type { EvidenceArtifact, GovernanceException } from '@/lib/governance/types';
import { calculateInherentRisk } from '@/lib/risk/inherent-risk';
import { TIER_DISPLAY } from '@/lib/risk/types';
import {
  applyLightweightReview as applyLightweightReviewPure,
  type LightweightReviewInput,
} from '@/lib/triage/lightweight-review';
import {
  applyTriageDecision as applyTriageDecisionPure,
  type TriageDecisionInput,
} from '@/lib/triage/triage-actions';
import type {
  AIUseCase,
  AIUseCaseStatus,
  CaseComment,
  RerouteEvent,
  StatusChange,
} from '@/types/inventory';

/**
 * Recompute the residual risk and review schedule for a use case.
 * Pure helper used by every action that touches evidence, exceptions, or
 * the assessment — keeps the derived fields in sync without scattering
 * the recompute logic across the store.
 */
function recomputeDerivedFields(uc: AIUseCase): AIUseCase {
  const inherentTier = uc.inherentRisk?.tier;
  if (!inherentTier) return uc;

  const regulatoryRulesFired = (uc.inherentRisk?.firedRules ?? []).length > 0;
  const evidence = uc.evidence ?? [];

  const residualRisk = calculateResidualRisk(
    inherentTier,
    uc.assessment,
    evidence,
    regulatoryRulesFired,
    uc.humanOversightDesign,
  );

  // P4 fix: Review cadence uses the CONFIRMED tier as a floor — not the
  // residual tier alone. A High-risk system cannot receive quarterly cadence
  // even if evidence collection reduces the residual tier to Medium-High.
  // The confirmed tier (from triage override or inherent) is the governance
  // floor for monitoring frequency.
  const confirmedTier = uc.triage?.confirmedInherentTier ?? inherentTier;
  const residualTier = residualRisk.residualTier;
  // Use whichever tier is MORE severe for review scheduling
  const confirmedOrdinal = TIER_DISPLAY[confirmedTier]?.ordinal ?? 0;
  const residualOrdinal = TIER_DISPLAY[residualTier]?.ordinal ?? 0;
  const scheduleTier = confirmedOrdinal >= residualOrdinal ? confirmedTier : residualTier;

  const reviewSchedule = computeReviewSchedule(
    scheduleTier,
    uc.reviewSchedule?.lastReviewedAt,
    uc.reviewSchedule?.reviewOwner,
  );

  return { ...uc, residualRisk, reviewSchedule };
}

/** Generate a stable evidence id */
function generateEvidenceId(): string {
  return `evd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface InventoryState {
  useCases: AIUseCase[];
  addUseCase: (useCase: AIUseCase) => void;
  updateUseCase: (id: string, updates: Partial<AIUseCase>) => void;
  updateStatus: (id: string, status: AIUseCaseStatus, changedBy: string) => void;
  applyTriage: (id: string, decision: TriageDecisionInput, triagedBy: string) => void;
  applyLightweightReview: (id: string, input: LightweightReviewInput, reviewedBy: string) => void;
  addComment: (id: string, comment: Omit<CaseComment, 'id' | 'timestamp'>) => void;
  getUseCase: (id: string) => AIUseCase | undefined;

  // ─── Workflow transitions ───────────────────────────────────
  /** Gap 1: Resubmit a case in changes_requested back into the correct review queue. */
  resubmitForReview: (id: string, resubmittedBy: string) => void;
  /** Gap 2: Explicitly mark an approved case as live in production. */
  markInProduction: (id: string, markedBy: string) => void;
  /** Gap 4: Re-route a case from the blocked lane (contact_required) into a different lane. */
  rerouteFromBlocked: (
    id: string,
    toLane: RerouteEvent['toLane'],
    resolutionNote: string,
    reroutedBy: string,
  ) => void;

  // ─── Approval workflow ──────────────────────────────────────
  /** Approve a case from decision_pending (or lightweight_review with completed review) */
  approveCase: (id: string, note: string, approvedBy: string) => void;
  /** Reject a case from decision_pending or lightweight_review */
  rejectCase: (id: string, note: string, rejectedBy: string) => void;
  /** Escalate a case (bump to higher governance path) */
  escalateCase: (id: string, note: string, escalatedBy: string) => void;

  // ─── Evidence ──────────────────────────────────────────────
  /** Add a new evidence artifact and recompute residual risk */
  addEvidence: (
    useCaseId: string,
    evidence: Omit<EvidenceArtifact, 'id' | 'uploadedAt' | 'status'>,
  ) => string;
  /** Attest evidence (sign it as accurate) and recompute residual risk */
  attestEvidence: (
    useCaseId: string,
    evidenceId: string,
    attestedBy: string,
    attestedRole: string,
    note?: string,
  ) => void;
  /** Reject evidence with a reason */
  rejectEvidence: (useCaseId: string, evidenceId: string, reason: string) => void;
  /** Remove evidence (e.g., uploaded in error) */
  removeEvidence: (useCaseId: string, evidenceId: string) => void;

  // ─── Exceptions ────────────────────────────────────────────
  /** Create a new active exception linked to a use case */
  createException: (input: CreateExceptionInput) => string;
  /** Revoke an active exception */
  revokeException: (
    useCaseId: string,
    exceptionId: string,
    revokedBy: string,
    reason: string,
  ) => void;
  /** Sweep expired exceptions across all use cases (call from a UI mount) */
  sweepExpired: () => void;
  /** Get all active exceptions across all use cases (for the register page) */
  getAllExceptions: () => Array<GovernanceException & { useCaseName: string }>;

  // ─── Review schedule ───────────────────────────────────────
  /** Mark a use case as just reviewed — anchors the next-review computation */
  recordReview: (useCaseId: string, reviewedBy: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      useCases: [],

      addUseCase: (useCase) =>
        set((state) => ({
          useCases: [...state.useCases, recomputeDerivedFields(useCase)],
        })),

      updateUseCase: (id, updates) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id) return uc;
            const next = { ...uc, ...updates, updatedAt: new Date().toISOString() };
            return recomputeDerivedFields(next);
          }),
        })),

      updateStatus: (id, status, changedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id) return uc;
            const change: StatusChange = {
              status,
              timestamp: new Date().toISOString(),
              changedBy,
            };
            return {
              ...uc,
              status,
              timeline: [...uc.timeline, change],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      applyTriage: (id, decision, triagedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id) return uc;
            const triaged = applyTriageDecisionPure(uc, decision, triagedBy);
            // P9 fix: anchor review schedule to the CONFIRMED tier, not the auto-calculated one
            const tier = decision.confirmedInherentTier;
            const reviewSchedule = computeReviewSchedule(
              tier,
              undefined,
              decision.assignedReviewer,
            );
            return recomputeDerivedFields({ ...triaged, reviewSchedule });
          }),
        })),

      applyLightweightReview: (id, input, reviewedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) =>
            uc.id === id ? applyLightweightReviewPure(uc, input, reviewedBy) : uc,
          ),
        })),

      addComment: (id, comment) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id) return uc;
            const newComment: CaseComment = {
              ...comment,
              id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: new Date().toISOString(),
            };
            return {
              ...uc,
              comments: [...(uc.comments ?? []), newComment],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      getUseCase: (id) => get().useCases.find((uc) => uc.id === id),

      // ─── Workflow transitions ─────────────────────────────
      resubmitForReview: (id, resubmittedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id || uc.status !== 'changes_requested') return uc;
            // Derive the correct queue from the case's governance history:
            //   - If triage said lightweight, go back to lightweight_review
            //   - If case has a submitted assessment, go to decision_pending (reviewer re-reviews)
            //   - If triage said standard/full, go to assessment_required
            //   - Fallback: triage_pending
            let nextStatus: AIUseCaseStatus;
            const path = uc.triage?.governancePath;
            if (path === 'lightweight' || uc.lightweightReview) {
              nextStatus = 'lightweight_review';
            } else if (uc.assessment) {
              nextStatus = 'decision_pending';
            } else if (path === 'standard' || path === 'full') {
              nextStatus = 'assessment_required';
            } else {
              nextStatus = 'triage_pending';
            }
            const now = new Date().toISOString();
            const change: StatusChange = {
              status: nextStatus,
              timestamp: now,
              changedBy: resubmittedBy,
            };
            return {
              ...uc,
              status: nextStatus,
              timeline: [...uc.timeline, change],
              updatedAt: now,
            };
          }),
        })),

      markInProduction: (id, markedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id || uc.status !== 'approved') return uc;
            const now = new Date().toISOString();
            const change: StatusChange = {
              status: 'in_production',
              timestamp: now,
              changedBy: markedBy,
            };
            return {
              ...uc,
              status: 'in_production' as const,
              productionDate: now,
              timeline: [...uc.timeline, change],
              updatedAt: now,
            };
          }),
        })),

      rerouteFromBlocked: (id, toLane, resolutionNote, reroutedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id || uc.status !== 'contact_required') return uc;
            const laneToStatus: Record<RerouteEvent['toLane'], AIUseCaseStatus> = {
              lightweight: 'lightweight_review',
              standard: 'triage_pending',
              enhanced: 'triage_pending',
            };
            const nextStatus = laneToStatus[toLane];
            const now = new Date().toISOString();
            const event: RerouteEvent = {
              fromLane: 'blocked',
              toLane,
              resolutionNote,
              reroutedBy,
              reroutedAt: now,
            };
            const change: StatusChange = {
              status: nextStatus,
              timestamp: now,
              changedBy: reroutedBy,
            };
            return {
              ...uc,
              status: nextStatus,
              rerouteHistory: [...(uc.rerouteHistory ?? []), event],
              timeline: [...uc.timeline, change],
              updatedAt: now,
            };
          }),
        })),

      // ─── Approval workflow ─────────────────────────────────
      approveCase: (id, note, approvedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            const approvable =
              uc.id === id &&
              (uc.status === 'decision_pending' || uc.status === 'lightweight_review');
            if (!approvable) return uc;
            const now = new Date().toISOString();
            const change: StatusChange = {
              status: 'approved',
              timestamp: now,
              changedBy: approvedBy,
            };
            const comment: CaseComment = {
              id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              author: approvedBy,
              authorRole: 'governance_team',
              body: `**Approved**: ${note}`,
              timestamp: now,
            };
            return {
              ...uc,
              status: 'approved' as const,
              timeline: [...uc.timeline, change],
              comments: [...(uc.comments ?? []), comment],
              updatedAt: now,
            };
          }),
        })),

      rejectCase: (id, note, rejectedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            const rejectable =
              uc.id === id &&
              (uc.status === 'decision_pending' || uc.status === 'lightweight_review');
            if (!rejectable) return uc;
            const now = new Date().toISOString();
            const change: StatusChange = {
              status: 'rejected',
              timestamp: now,
              changedBy: rejectedBy,
            };
            const comment: CaseComment = {
              id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              author: rejectedBy,
              authorRole: 'governance_team',
              body: `**Rejected**: ${note}`,
              timestamp: now,
            };
            return {
              ...uc,
              status: 'rejected' as const,
              timeline: [...uc.timeline, change],
              comments: [...(uc.comments ?? []), comment],
              updatedAt: now,
            };
          }),
        })),

      escalateCase: (id, note, escalatedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== id) return uc;
            // Only escalate from lightweight_review or decision_pending
            if (uc.status !== 'lightweight_review' && uc.status !== 'decision_pending') return uc;
            const now = new Date().toISOString();
            // Escalate: lightweight → assessment_required, decision_pending → triage_pending (re-triage)
            const nextStatus: AIUseCaseStatus =
              uc.status === 'lightweight_review' ? 'assessment_required' : 'triage_pending';
            const change: StatusChange = {
              status: nextStatus,
              timestamp: now,
              changedBy: escalatedBy,
            };
            const comment: CaseComment = {
              id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              author: escalatedBy,
              authorRole: 'governance_team',
              body: `**Escalated**: ${note}`,
              timestamp: now,
            };
            return {
              ...uc,
              status: nextStatus,
              timeline: [...uc.timeline, change],
              comments: [...(uc.comments ?? []), comment],
              updatedAt: now,
            };
          }),
        })),

      // ─── Evidence ──────────────────────────────────────────
      addEvidence: (useCaseId, evidence) => {
        const id = generateEvidenceId();
        const now = new Date().toISOString();
        const newArtifact: EvidenceArtifact = {
          ...evidence,
          id,
          status: 'collected',
          uploadedAt: now,
        };
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== useCaseId) return uc;
            // P7: audit trail entry for evidence upload
            const auditEntry: StatusChange = {
              status: uc.status,
              timestamp: now,
              changedBy: evidence.uploadedBy,
              auditEvent: `Evidence uploaded: "${evidence.title}" (${evidence.category})`,
            };
            const next: AIUseCase = {
              ...uc,
              evidence: [...(uc.evidence ?? []), newArtifact],
              timeline: [...uc.timeline, auditEntry],
              updatedAt: now,
            };
            return recomputeDerivedFields(next);
          }),
        }));
        return id;
      },

      attestEvidence: (useCaseId, evidenceId, attestedBy, attestedRole, note) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== useCaseId) return uc;
            const now = new Date().toISOString();
            const artifact = (uc.evidence ?? []).find((e) => e.id === evidenceId);
            // P7: audit trail entry with the attester's actual name and role
            const auditEntry: StatusChange = {
              status: uc.status,
              timestamp: now,
              changedBy: `${attestedBy} (${attestedRole})`,
              auditEvent: `Evidence attested: "${artifact?.title ?? evidenceId}"`,
            };
            const next: AIUseCase = {
              ...uc,
              evidence: (uc.evidence ?? []).map((e) =>
                e.id === evidenceId
                  ? {
                      ...e,
                      status: 'attested' as const,
                      attestation: { attestedBy, attestedRole, attestedAt: now, note },
                    }
                  : e,
              ),
              timeline: [...uc.timeline, auditEntry],
              updatedAt: now,
            };
            return recomputeDerivedFields(next);
          }),
        })),

      rejectEvidence: (useCaseId, evidenceId, reason) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== useCaseId) return uc;
            const next: AIUseCase = {
              ...uc,
              evidence: (uc.evidence ?? []).map((e) =>
                e.id === evidenceId
                  ? { ...e, status: 'rejected' as const, rejectionReason: reason }
                  : e,
              ),
              updatedAt: new Date().toISOString(),
            };
            return recomputeDerivedFields(next);
          }),
        })),

      removeEvidence: (useCaseId, evidenceId) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== useCaseId) return uc;
            const next: AIUseCase = {
              ...uc,
              evidence: (uc.evidence ?? []).filter((e) => e.id !== evidenceId),
              updatedAt: new Date().toISOString(),
            };
            return recomputeDerivedFields(next);
          }),
        })),

      // ─── Exceptions ────────────────────────────────────────
      createException: (input) => {
        const exception = createExceptionPure(input);
        set((state) => ({
          useCases: state.useCases.map((uc) =>
            uc.id === input.useCaseId
              ? {
                  ...uc,
                  exceptions: [...(uc.exceptions ?? []), exception],
                  updatedAt: new Date().toISOString(),
                }
              : uc,
          ),
        }));
        return exception.id;
      },

      revokeException: (useCaseId, exceptionId, revokedBy, reason) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== useCaseId) return uc;
            return {
              ...uc,
              exceptions: (uc.exceptions ?? []).map((e) =>
                e.id === exceptionId ? revokeExceptionPure(e, revokedBy, reason) : e,
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      sweepExpired: () =>
        set((state) => ({
          useCases: state.useCases.map((uc) =>
            uc.exceptions && uc.exceptions.length > 0
              ? { ...uc, exceptions: sweepExpiredExceptions(uc.exceptions) }
              : uc,
          ),
        })),

      getAllExceptions: () => {
        const out: Array<GovernanceException & { useCaseName: string }> = [];
        for (const uc of get().useCases) {
          for (const e of uc.exceptions ?? []) {
            out.push({ ...e, useCaseName: uc.intake.useCaseName ?? 'Untitled' });
          }
        }
        return out;
      },

      // ─── Review schedule ───────────────────────────────────
      recordReview: (useCaseId, reviewedBy) =>
        set((state) => ({
          useCases: state.useCases.map((uc) => {
            if (uc.id !== useCaseId) return uc;
            const tier = uc.residualRisk?.residualTier ?? uc.inherentRisk?.tier ?? 'medium';
            return {
              ...uc,
              reviewSchedule: computeReviewSchedule(tier, new Date().toISOString(), reviewedBy),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),
    }),
    {
      name: 'ai-governance-inventory',
      version: 5,
      migrate: (persistedState: unknown, fromVersion: number) => {
        const state = persistedState as { useCases?: unknown[] } | null;
        if (!state || !Array.isArray(state.useCases)) return state;

        // v1 → v2: aiType changed from string → string[]
        if (fromVersion < 2) {
          state.useCases = state.useCases.map((uc) => {
            if (!uc || typeof uc !== 'object') return uc;
            const useCase = uc as { intake?: Record<string, unknown>; comments?: unknown[] };
            if (useCase.intake && typeof useCase.intake.aiType === 'string') {
              useCase.intake = {
                ...useCase.intake,
                aiType: [useCase.intake.aiType],
              };
            }
            // Defensively backfill comments array
            if (!Array.isArray(useCase.comments)) {
              useCase.comments = [];
            }
            return useCase;
          });
        }

        // v2 → v3: backfill inherentRisk for existing cases
        if (fromVersion < 3) {
          state.useCases = state.useCases.map((uc) => {
            if (!uc || typeof uc !== 'object') return uc;
            const useCase = uc as { intake?: Record<string, unknown>; inherentRisk?: unknown };
            if (useCase.intake && !useCase.inherentRisk) {
              try {
                useCase.inherentRisk = calculateInherentRisk(useCase.intake as never);
              } catch {
                // Skip cases where intake is malformed; they'll get re-scored on next edit
              }
            }
            return useCase;
          });
        }

        // v3 → v4: triage.confirmedRiskTier (4-tier) → triage.confirmedInherentTier (5-tier)
        if (fromVersion < 4) {
          // Map old 4-tier (low/medium/high/critical) → new 5-tier (low/medium_low/medium/medium_high/high)
          const tierMap: Record<string, string> = {
            low: 'low',
            medium: 'medium',
            high: 'medium_high',
            critical: 'high',
          };
          state.useCases = state.useCases.map((uc) => {
            if (!uc || typeof uc !== 'object') return uc;
            const useCase = uc as { triage?: Record<string, unknown> };
            if (useCase.triage && typeof useCase.triage === 'object') {
              const triage = useCase.triage as Record<string, unknown>;
              // If old field exists and new field doesn't, migrate
              if (
                typeof triage.confirmedRiskTier === 'string' &&
                triage.confirmedInherentTier === undefined
              ) {
                const oldTier = triage.confirmedRiskTier as string;
                triage.confirmedInherentTier = tierMap[oldTier] ?? 'medium';
                // Leave the old field in place as a historical artifact; new code reads the new field
              }
              // Defensive: if neither field is present (corrupted state), default to medium
              if (triage.confirmedInherentTier === undefined) {
                triage.confirmedInherentTier = 'medium';
              }
            }
            return useCase;
          });
        }

        // v4 → v5: backfill governance objects (evidence, exceptions, residual risk, review schedule)
        if (fromVersion < 5) {
          state.useCases = state.useCases.map((uc) => {
            if (!uc || typeof uc !== 'object') return uc;
            const useCase = uc as Record<string, unknown>;
            // Initialize empty arrays for the new governance collections
            if (!Array.isArray(useCase.evidence)) useCase.evidence = [];
            if (!Array.isArray(useCase.exceptions)) useCase.exceptions = [];
            // residualRisk and reviewSchedule will be computed lazily on the
            // next mutation through recomputeDerivedFields. We don't compute
            // them here because the migration runs synchronously and we
            // don't want to crash on malformed historical state.
            return useCase;
          });
        }

        return state;
      },
    },
  ),
);
