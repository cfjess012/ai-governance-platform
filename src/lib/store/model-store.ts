import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelRecord } from '@/types/model';

interface ModelRegistryState {
  models: ModelRecord[];
  isLoaded: boolean;
  isLoading: boolean;

  fetchModels: () => Promise<void>;
  addModel: (model: ModelRecord) => void;
  updateModel: (id: string, updates: Partial<ModelRecord>) => void;
  removeModel: (id: string) => void;
  getModel: (id: string) => ModelRecord | undefined;
  getActiveModels: () => ModelRecord[];
}

export const useModelStore = create<ModelRegistryState>()(
  persist(
    (set, get) => ({
      models: [],
      isLoaded: false,
      isLoading: false,

      fetchModels: async () => {
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const response = await fetch('/api/models');
          const result = await response.json();
          if (result.data) {
            set({ models: result.data, isLoaded: true, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      addModel: (model) => set((state) => ({ models: [model, ...state.models] })),

      updateModel: (id, updates) =>
        set((state) => ({
          models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      removeModel: (id) =>
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
        })),

      getModel: (id) => get().models.find((m) => m.id === id),

      getActiveModels: () => get().models.filter((m) => m.data.status === 'active'),
    }),
    {
      name: 'ai-governance-model-registry',
      partialize: (state) => ({
        models: state.models,
        isLoaded: state.isLoaded,
      }),
    },
  ),
);
