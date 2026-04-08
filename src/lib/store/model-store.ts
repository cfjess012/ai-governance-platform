import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GovernanceAnalysis } from '@/lib/governance-analysis/types';
import type { HuggingFaceFetchResult } from '@/lib/integrations/huggingface/types';
import type { AIUseCase } from '@/types/inventory';
import type { ModelRecord } from '@/types/model';

interface ModelRegistryState {
  models: ModelRecord[];
  isLoaded: boolean;
  isLoading: boolean;
  /** IDs of models currently fetching from HF */
  fetchingHfIds: Set<string>;
  /** IDs of models currently generating governance analysis */
  generatingAnalysisIds: Set<string>;

  fetchModels: () => Promise<void>;
  addModel: (model: ModelRecord) => void;
  updateModel: (id: string, updates: Partial<ModelRecord>) => void;
  removeModel: (id: string) => void;
  getModel: (id: string) => ModelRecord | undefined;
  getActiveModels: () => ModelRecord[];
  /**
   * Fetch (or refresh) Hugging Face metadata for a model.
   * Updates the model record with the result. No-op if the model has no HF ID.
   */
  fetchHuggingFace: (id: string) => Promise<void>;
  /**
   * Generate (or regenerate) the LLM-powered governance analysis for a model.
   * Sends linked use cases for context.
   */
  generateGovernanceAnalysis: (id: string, linkedUseCases: AIUseCase[]) => Promise<void>;
}

export const useModelStore = create<ModelRegistryState>()(
  persist(
    (set, get) => ({
      models: [],
      isLoaded: false,
      isLoading: false,
      fetchingHfIds: new Set<string>(),
      generatingAnalysisIds: new Set<string>(),

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

      fetchHuggingFace: async (id) => {
        const model = get().models.find((m) => m.id === id);
        if (!model) return;
        const hfId = model.data.huggingFaceModelId;
        if (!hfId) return;

        // Mark as fetching
        set((state) => {
          const next = new Set(state.fetchingHfIds);
          next.add(id);
          return { fetchingHfIds: next };
        });

        const now = new Date().toISOString();

        try {
          const response = await fetch(`/api/integrations/huggingface/${hfId}`);
          const result = (await response.json()) as {
            data?: HuggingFaceFetchResult;
            error?: string;
          };

          if (!response.ok || !result.data) {
            // Persist the error so the UI can show what went wrong
            set((state) => ({
              models: state.models.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      external: {
                        source: 'huggingface' as const,
                        huggingFace: m.external?.huggingFace, // keep old data
                        error: result.error ?? `Fetch failed (${response.status})`,
                        lastFetchedAt: now,
                      },
                    }
                  : m,
              ),
            }));
            return;
          }

          // Successful fetch — store the result and clear any error
          set((state) => ({
            models: state.models.map((m) =>
              m.id === id
                ? {
                    ...m,
                    external: {
                      source: 'huggingface' as const,
                      huggingFace: result.data,
                      lastFetchedAt: now,
                    },
                  }
                : m,
            ),
          }));
        } catch (err) {
          set((state) => ({
            models: state.models.map((m) =>
              m.id === id
                ? {
                    ...m,
                    external: {
                      source: 'huggingface' as const,
                      huggingFace: m.external?.huggingFace,
                      error: err instanceof Error ? err.message : 'Network error',
                      lastFetchedAt: now,
                    },
                  }
                : m,
            ),
          }));
        } finally {
          // Clear fetching flag
          set((state) => {
            const next = new Set(state.fetchingHfIds);
            next.delete(id);
            return { fetchingHfIds: next };
          });
        }
      },

      generateGovernanceAnalysis: async (id, linkedUseCases) => {
        const model = get().models.find((m) => m.id === id);
        if (!model) return;

        // Mark as generating
        set((state) => {
          const next = new Set(state.generatingAnalysisIds);
          next.add(id);
          return { generatingAnalysisIds: next };
        });

        try {
          const response = await fetch(`/api/models/${id}/governance-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              hfData: model.external?.huggingFace,
              linkedUseCases,
            }),
          });

          const result = (await response.json()) as {
            data?: GovernanceAnalysis;
            error?: string;
            fallback?: boolean;
          };

          if (result.data) {
            set((state) => ({
              models: state.models.map((m) =>
                m.id === id ? { ...m, governanceAnalysis: result.data } : m,
              ),
            }));
          }
        } catch (err) {
          console.error('Failed to generate governance analysis:', err);
        } finally {
          set((state) => {
            const next = new Set(state.generatingAnalysisIds);
            next.delete(id);
            return { generatingAnalysisIds: next };
          });
        }
      },
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
