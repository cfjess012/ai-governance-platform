'use client';

import { useEffect, useMemo, useRef } from 'react';
import { intakeQuestions } from '@/config/questions';
import { getInlineBanners } from '@/lib/questions/branching-rules';
import { useAiStore } from '@/lib/store/ai-store';
import { AiSuggestionsCard } from './AiSuggestionsCard';
import { AiValueCoachField } from './AiValueCoachField';
import { ConditionalField } from './ConditionalField';
import { ConsistencyWarnings } from './ConsistencyWarnings';
import { QuestionRenderer } from './QuestionRenderer';

interface WizardStepProps {
  stepId: string;
  title: string;
  sections: string[];
  visibleQuestionIds: Set<string>;
  errors: Record<string, string>;
  values: Record<string, unknown>;
  onFieldChange: (field: string, value: unknown) => void;
  aiEnabled?: boolean;
}

export function WizardStep({
  stepId,
  sections,
  visibleQuestionIds,
  errors,
  values,
  onFieldChange,
  aiEnabled,
}: WizardStepProps) {
  const stepQuestions = intakeQuestions.filter((q) => sections.includes(q.section));
  const inlineBanners = useMemo(() => getInlineBanners(values), [values]);

  const businessPurposeResult = useAiStore((s) => s.businessPurposeResult);
  const businessPurposeLoading = useAiStore((s) => s.businessPurposeLoading);

  const bannerMap = useMemo(() => {
    const map = new Map<string, typeof inlineBanners>();
    for (const banner of inlineBanners) {
      const existing = map.get(banner.afterQuestionId) ?? [];
      existing.push(banner);
      map.set(banner.afterQuestionId, existing);
    }
    return map;
  }, [inlineBanners]);

  const isStageB = stepId === 'section-b';
  const isStageC = stepId === 'section-c';

  const leversPrepopulated = useRef(false);
  useEffect(() => {
    if (!isStageC || !aiEnabled || !businessPurposeResult || leversPrepopulated.current) return;
    const currentLevers = Array.isArray(values.valueCreationLevers)
      ? values.valueCreationLevers
      : [];
    if (currentLevers.length > 0) return;

    const suggested = businessPurposeResult.suggestedValueLevers;
    if (suggested.length === 0) return;

    const leverQuestion = intakeQuestions.find((q) => q.field === 'valueCreationLevers');
    const allOptions = leverQuestion?.options ?? [];
    const matched = allOptions
      .filter((opt) =>
        suggested.some((s) =>
          opt.label
            .toLowerCase()
            .includes(
              s.toLowerCase().replace('bv - ', '').replace('em - ', '').replace('vp - ', ''),
            ),
        ),
      )
      .map((opt) => opt.value);

    if (matched.length > 0) {
      leversPrepopulated.current = true;
      onFieldChange('valueCreationLevers', matched);
    }
  }, [isStageC, aiEnabled, businessPurposeResult, values.valueCreationLevers, onFieldChange]);

  return (
    <div className="space-y-7">
      {stepQuestions.map((question) => {
        const isVisible = visibleQuestionIds.has(question.id);
        const bannersAfter = bannerMap.get(question.id);
        const showBannersHere = isVisible && bannersAfter && bannersAfter.length > 0;

        if (question.field === 'valueDescription' && isStageC && aiEnabled) {
          return (
            <div key={question.id}>
              <ConditionalField visible={isVisible}>
                <AiValueCoachField
                  question={question}
                  value={values[question.field]}
                  error={errors[question.field]}
                  onChange={onFieldChange}
                  formData={values}
                />
              </ConditionalField>
            </div>
          );
        }

        return (
          <div key={question.id}>
            <ConditionalField visible={isVisible}>
              <QuestionRenderer
                question={question}
                value={values[question.field]}
                error={errors[question.field]}
                onChange={onFieldChange}
              />

              {question.field === 'businessProblem' &&
                aiEnabled &&
                (businessPurposeResult || businessPurposeLoading) && (
                  <AiSuggestionsCard
                    result={businessPurposeResult}
                    loading={businessPurposeLoading}
                    onUseBusinessArea={(value) => onFieldChange('businessArea', value)}
                  />
                )}
            </ConditionalField>
            {showBannersHere &&
              bannersAfter.map((banner) => (
                <div
                  key={banner.id}
                  className={`mt-3 px-3 py-2.5 rounded-lg border text-xs animate-fade-in ${
                    banner.severity === 'warning'
                      ? 'border-amber-200 text-amber-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {banner.message}
                </div>
              ))}
          </div>
        );
      })}

      {isStageB && <ConsistencyWarnings formData={values} />}
    </div>
  );
}
