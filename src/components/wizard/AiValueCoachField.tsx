'use client';

import { useCallback } from 'react';
import type { QuestionDefinition } from '@/config/questions';
import { useAiAnalysis } from '@/lib/ai/use-ai-analysis';
import { useAiStore } from '@/lib/store/ai-store';
import { AiCoachingSuggestion } from './AiCoachingSuggestion';
import { QuestionRenderer } from './QuestionRenderer';

interface AiValueCoachFieldProps {
  question: QuestionDefinition;
  value: unknown;
  error?: string;
  onChange: (field: string, value: unknown) => void;
  formData: Record<string, unknown>;
}

export function AiValueCoachField({
  question,
  value,
  error,
  onChange,
  formData,
}: AiValueCoachFieldProps) {
  const { analyzeValueDescription } = useAiAnalysis();
  const valueCoachResult = useAiStore((s) => s.valueCoachResult);
  const valueCoachLoading = useAiStore((s) => s.valueCoachLoading);
  const setValueCoachResult = useAiStore((s) => s.setValueCoachResult);

  const handleBlur = useCallback(() => {
    const text = typeof value === 'string' ? value : '';
    if (text.length > 0 && text.length < 50) {
      analyzeValueDescription(text, formData);
    }
  }, [value, formData, analyzeValueDescription]);

  return (
    <fieldset className="border-none p-0 m-0" onBlur={handleBlur}>
      <QuestionRenderer question={question} value={value} error={error} onChange={onChange} />
      {(valueCoachResult || valueCoachLoading) && (
        <AiCoachingSuggestion
          result={valueCoachResult}
          loading={valueCoachLoading}
          onUseSuggestion={(text) => {
            onChange(question.field, text);
            setValueCoachResult(null);
          }}
          onDismiss={() => setValueCoachResult(null)}
        />
      )}
    </fieldset>
  );
}
