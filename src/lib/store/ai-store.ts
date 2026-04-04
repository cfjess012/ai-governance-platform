import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BusinessPurposeResult,
  ConsistencyCheckResult,
  ValueCoachResult,
} from '@/app/api/ai/analyze/route';

interface AiState {
  // Toggle
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;

  // Availability — set to false on first connection failure, prevents repeated calls
  available: boolean;
  setAvailable: (available: boolean) => void;
  unavailableToastShown: boolean;
  setUnavailableToastShown: (shown: boolean) => void;

  // Business purpose analysis (cached across navigation)
  businessPurposeResult: BusinessPurposeResult | null;
  businessPurposeLoading: boolean;
  setBusinessPurposeResult: (result: BusinessPurposeResult | null) => void;
  setBusinessPurposeLoading: (loading: boolean) => void;

  // Value description coaching
  valueCoachResult: ValueCoachResult | null;
  valueCoachLoading: boolean;
  setValueCoachResult: (result: ValueCoachResult | null) => void;
  setValueCoachLoading: (loading: boolean) => void;

  // Consistency check
  consistencyResult: ConsistencyCheckResult | null;
  consistencyLoading: boolean;
  setConsistencyResult: (result: ConsistencyCheckResult | null) => void;
  setConsistencyLoading: (loading: boolean) => void;

  // Reset all AI state (on form clear)
  resetResults: () => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),

      available: true,
      setAvailable: (available) => set({ available }),
      unavailableToastShown: false,
      setUnavailableToastShown: (shown) => set({ unavailableToastShown: shown }),

      businessPurposeResult: null,
      businessPurposeLoading: false,
      setBusinessPurposeResult: (result) => set({ businessPurposeResult: result }),
      setBusinessPurposeLoading: (loading) => set({ businessPurposeLoading: loading }),

      valueCoachResult: null,
      valueCoachLoading: false,
      setValueCoachResult: (result) => set({ valueCoachResult: result }),
      setValueCoachLoading: (loading) => set({ valueCoachLoading: loading }),

      consistencyResult: null,
      consistencyLoading: false,
      setConsistencyResult: (result) => set({ consistencyResult: result }),
      setConsistencyLoading: (loading) => set({ consistencyLoading: loading }),

      resetResults: () =>
        set({
          businessPurposeResult: null,
          businessPurposeLoading: false,
          valueCoachResult: null,
          valueCoachLoading: false,
          consistencyResult: null,
          consistencyLoading: false,
          unavailableToastShown: false,
          available: true,
        }),
    }),
    {
      name: 'ai-governance-ai-assistance',
      partialize: (state) => ({
        enabled: state.enabled,
      }),
    },
  ),
);
