import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssessmentDraftData } from '@/lib/questions/assessment-schema';

interface AssessmentState {
  formData: Partial<AssessmentDraftData>;
  useCaseId: string | null;
  currentSectionIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  isSubmitted: boolean;
  lastSavedAt: string | null;

  updateField: (field: string, value: unknown) => void;
  setUseCaseId: (id: string) => void;
  setCurrentSection: (index: number) => void;
  setSaving: (saving: boolean) => void;
  setSubmitted: (submitted: boolean) => void;
  markSaved: () => void;
  prePopulate: (data: Partial<AssessmentDraftData>) => void;
  reset: () => void;
}

const initialState = {
  formData: {},
  useCaseId: null,
  currentSectionIndex: 0,
  isDirty: false,
  isSaving: false,
  isSubmitted: false,
  lastSavedAt: null,
};

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set) => ({
      ...initialState,

      updateField: (field, value) =>
        set((state) => ({
          formData: { ...state.formData, [field]: value },
          isDirty: true,
        })),

      setUseCaseId: (id) => set({ useCaseId: id }),

      setCurrentSection: (index) => set({ currentSectionIndex: index }),

      setSaving: (saving) => set({ isSaving: saving }),

      setSubmitted: (submitted) => set({ isSubmitted: submitted }),

      markSaved: () =>
        set({
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date().toISOString(),
        }),

      prePopulate: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'ai-governance-assessment',
      partialize: (state) => ({
        formData: state.formData,
        useCaseId: state.useCaseId,
        currentSectionIndex: state.currentSectionIndex,
        lastSavedAt: state.lastSavedAt,
      }),
    },
  ),
);
