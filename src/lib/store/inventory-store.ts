import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyTriageDecision as applyTriageDecisionPure,
  type TriageDecisionInput,
} from '@/lib/triage/triage-actions';
import type {
  AIUseCase,
  AIUseCaseStatus,
  CaseComment,
  StatusChange,
} from '@/types/inventory';

interface InventoryState {
  useCases: AIUseCase[];
  addUseCase: (useCase: AIUseCase) => void;
  updateUseCase: (id: string, updates: Partial<AIUseCase>) => void;
  updateStatus: (id: string, status: AIUseCaseStatus, changedBy: string) => void;
  applyTriage: (id: string, decision: TriageDecisionInput, triagedBy: string) => void;
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
    },
  ),
);
