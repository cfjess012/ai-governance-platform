'use client';

import { useCallback, useRef } from 'react';
import { useAiStore } from '@/lib/store/ai-store';

async function callAnalyze(
  analysisType: string,
  formData: Record<string, unknown>,
  fieldValue?: string,
): Promise<{ data?: unknown; error?: string; status: number }> {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisType, formData, fieldValue }),
    });
    const json = await response.json();
    return { ...json, status: response.status };
  } catch {
    return { error: 'Network error', status: 0 };
  }
}

export function useAiAnalysis() {
  const enabled = useAiStore((s) => s.enabled);
  const available = useAiStore((s) => s.available);
  const setAvailable = useAiStore((s) => s.setAvailable);

  const setBusinessPurposeResult = useAiStore((s) => s.setBusinessPurposeResult);
  const setBusinessPurposeLoading = useAiStore((s) => s.setBusinessPurposeLoading);
  const setValueCoachResult = useAiStore((s) => s.setValueCoachResult);
  const setValueCoachLoading = useAiStore((s) => s.setValueCoachLoading);
  const setConsistencyResult = useAiStore((s) => s.setConsistencyResult);
  const setConsistencyLoading = useAiStore((s) => s.setConsistencyLoading);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUnavailable = useCallback(
    (status: number) => {
      if (status === 503 || status === 0) {
        setAvailable(false);
      }
    },
    [setAvailable],
  );

  const analyzeBusinessPurpose = useCallback(
    (text: string, formData: Record<string, unknown>) => {
      if (!enabled || !available) return;

      // 2-second debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (text.length < 10) return;
        setBusinessPurposeLoading(true);
        const result = await callAnalyze('business-purpose-analysis', formData, text);
        setBusinessPurposeLoading(false);
        if (result.data) {
          setBusinessPurposeResult(result.data as never);
        } else {
          handleUnavailable(result.status);
        }
      }, 2000);
    },
    [enabled, available, setBusinessPurposeLoading, setBusinessPurposeResult, handleUnavailable],
  );

  const analyzeValueDescription = useCallback(
    async (text: string, formData: Record<string, unknown>) => {
      if (!enabled || !available) return;
      if (text.length >= 50 || text.length === 0) return;

      setValueCoachLoading(true);
      const result = await callAnalyze('value-description-coach', formData, text);
      setValueCoachLoading(false);
      if (result.data) {
        setValueCoachResult(result.data as never);
      } else {
        handleUnavailable(result.status);
      }
    },
    [enabled, available, setValueCoachLoading, setValueCoachResult, handleUnavailable],
  );

  const runConsistencyCheck = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!enabled || !available) return;

      setConsistencyLoading(true);
      const result = await callAnalyze('consistency-check', formData);
      setConsistencyLoading(false);
      if (result.data) {
        setConsistencyResult(result.data as never);
      } else {
        handleUnavailable(result.status);
      }
    },
    [enabled, available, setConsistencyLoading, setConsistencyResult, handleUnavailable],
  );

  return {
    analyzeBusinessPurpose,
    analyzeValueDescription,
    runConsistencyCheck,
  };
}
