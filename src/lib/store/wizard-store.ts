import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntakeDraftData } from '@/lib/questions/intake-schema';

interface WizardState {
  // Form data
  formData: Partial<IntakeDraftData>;
  draftId: string | null;

  // Navigation
  currentStepIndex: number;

  // Status
  isDirty: boolean;
  isSaving: boolean;
  isSubmitted: boolean;
  lastSavedAt: string | null;

  // Actions
  updateField: (field: string, value: unknown) => void;
  updateFields: (fields: Partial<IntakeDraftData>) => void;
  setCurrentStep: (index: number) => void;
  setDraftId: (id: string) => void;
  setSaving: (saving: boolean) => void;
  setSubmitted: (submitted: boolean) => void;
  markSaved: () => void;
  reset: () => void;
}

const initialState = {
  formData: {},
  draftId: null,
  currentStepIndex: 0,
  isDirty: false,
  isSaving: false,
  isSubmitted: false,
  lastSavedAt: null,
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initialState,

      updateField: (field, value) =>
        set((state) => ({
          formData: { ...state.formData, [field]: value },
          isDirty: true,
        })),

      updateFields: (fields) =>
        set((state) => ({
          formData: { ...state.formData, ...fields },
          isDirty: true,
        })),

      setCurrentStep: (index) => set({ currentStepIndex: index }),

      setDraftId: (id) => set({ draftId: id }),

      setSaving: (saving) => set({ isSaving: saving }),

      setSubmitted: (submitted) => set({ isSubmitted: submitted }),

      markSaved: () =>
        set({
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date().toISOString(),
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'ai-governance-intake-wizard',
      version: 2,
      partialize: (state) => ({
        formData: state.formData,
        draftId: state.draftId,
        currentStepIndex: state.currentStepIndex,
        lastSavedAt: state.lastSavedAt,
      }),
      migrate: (persistedState: unknown, fromVersion: number) => {
        // v1 → v2: aiType changed from string → string[].
        const state = persistedState as { formData?: Record<string, unknown> } | null;
        if (!state || !state.formData) return state;

        if (fromVersion < 2 && typeof state.formData.aiType === 'string') {
          state.formData = {
            ...state.formData,
            aiType: [state.formData.aiType],
          };
        }

        return state;
      },
    },
  ),
);
