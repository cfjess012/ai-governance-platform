import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntakeDraftData } from '@/lib/questions/intake-schema';

interface WizardState {
  // Form data
  formData: Partial<IntakeDraftData>;
  draftId: string | null;
  /**
   * Per-session token. A new one is generated every time `startFresh()` is
   * called. On mount, intake components compare this against a freshly-
   * generated expected value — if they mismatch, the store is stale
   * (leftover from a prior intake) and gets auto-cleared.
   */
  sessionId: string | null;

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
  /**
   * Full reset — clears ALL form state and generates a fresh session ID.
   * Call after successful submission and when starting a new intake.
   */
  reset: () => void;
  /**
   * Start a clean intake session. If the store contains data from a
   * completed or abandoned prior session, it is cleared first.
   * Returns the new session ID.
   */
  startFresh: () => string;
}

function generateSessionId(): string {
  return `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const initialState = {
  formData: {},
  draftId: null,
  sessionId: null,
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

      reset: () => set({ ...initialState, sessionId: null }),

      startFresh: () => {
        const sid = generateSessionId();
        set({ ...initialState, sessionId: sid });
        return sid;
      },
    }),
    {
      name: 'ai-governance-intake-wizard',
      version: 3,
      partialize: (state) => ({
        formData: state.formData,
        draftId: state.draftId,
        sessionId: state.sessionId,
        currentStepIndex: state.currentStepIndex,
        lastSavedAt: state.lastSavedAt,
      }),
      migrate: (persistedState: unknown, fromVersion: number) => {
        const state = persistedState as {
          formData?: Record<string, unknown>;
          sessionId?: string | null;
        } | null;
        if (!state) return state;

        // v1 → v2: aiType changed from string → string[].
        if (fromVersion < 2 && state.formData && typeof state.formData.aiType === 'string') {
          state.formData = {
            ...state.formData,
            aiType: [state.formData.aiType],
          };
        }

        // v2 → v3: clear stale form data from prior sessions (the cross-contamination fix).
        // Any persisted state from v2 has no sessionId and may be from a completed
        // intake — safest to wipe it so the next form load starts clean.
        if (fromVersion < 3) {
          state.formData = {};
          state.sessionId = null;
        }

        return state;
      },
    },
  ),
);
