import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateInherentRisk } from '@/lib/risk/inherent-risk';
import {
  applyLightweightReview as applyLightweightReviewPure,
  type LightweightReviewInput,
} from '@/lib/triage/lightweight-review';
import {
  applyTriageDecision as applyTriageDecisionPure,
  type TriageDecisionInput,
} from '@/lib/triage/triage-actions';
import type { AIUseCase, AIUseCaseStatus, CaseComment, StatusChange } from '@/types/inventory';

interface InventoryState {
  useCases: AIUseCase[];
  addUseCase: (useCase: AIUseCase) => void;
  updateUseCase: (id: string, updates: Partial<AIUseCase>) => void;
  updateStatus: (id: string, status: AIUseCaseStatus, changedBy: string) => void;
  applyTriage: (id: string, decision: TriageDecisionInput, triagedBy: string) => void;
  applyLightweightReview: (id: string, input: LightweightReviewInput, reviewedBy: string) => void;
  addComment: (id: string, comment: Omit<CaseComment, 'id' | 'timestamp'>) => void;
  getUseCase: (id: string) => AIUseCase | undefined;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      useCases: [],

      addUseCase: (useCase) =>
        set((state) => ({
          useCases: [...state.useCases, useCase],
        })),

      updateUseCase: (id, updates) =>
        set((state) => ({
          useCases: state.useCases.map((uc) =>
            uc.id === id ? { ...uc, ...updates, updatedAt: new Date().toISOString() } : uc,
          ),
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
          useCases: state.useCases.map((uc) =>
            uc.id === id ? applyTriageDecisionPure(uc, decision, triagedBy) : uc,
          ),
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
    }),
    {
      name: 'ai-governance-inventory',
      version: 4,
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

        return state;
      },
    },
  ),
);
