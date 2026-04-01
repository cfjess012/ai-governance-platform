import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIUseCase, AIUseCaseStatus, StatusChange } from '@/types/inventory';

interface InventoryState {
  useCases: AIUseCase[];
  addUseCase: (useCase: AIUseCase) => void;
  updateUseCase: (id: string, updates: Partial<AIUseCase>) => void;
  updateStatus: (id: string, status: AIUseCaseStatus, changedBy: string) => void;
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

      getUseCase: (id) => get().useCases.find((uc) => uc.id === id),
    }),
    {
      name: 'ai-governance-inventory',
    },
  ),
);
