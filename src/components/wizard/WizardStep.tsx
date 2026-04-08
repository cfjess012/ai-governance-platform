'use client';

import { useCallback, useMemo, useState } from 'react';
import { intakeQuestions } from '@/config/questions';
import { getInlineBanners, isFastTrackEligible } from '@/lib/questions/branching-rules';
import { useAiStore } from '@/lib/store/ai-store';
import { AiSuggestionsCard } from './AiSuggestionsCard';
import { AiValueCoachField } from './AiValueCoachField';
import { ConditionalField } from './ConditionalField';
import { ConsistencyWarnings } from './ConsistencyWarnings';
import { QuestionRenderer } from './QuestionRenderer';
import { SparkleIcon } from './SparkleIcon';

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

/** Match AI-suggested lever names to the option values in the question registry */
function matchSuggestedLevers(suggestedNames: string[]): { value: string; label: string }[] {
  const leverQuestion = intakeQuestions.find((q) => q.field === 'valueCreationLevers');
  const allOptions = leverQuestion?.options ?? [];
  return allOptions.filter((opt) =>
    suggestedNames.some((s) =>
      opt.label
        .toLowerCase()
        .includes(s.toLowerCase().replace('bv - ', '').replace('em - ', '').replace('vp - ', '')),
    ),
  );
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

  // ── Fast-track eligibility (only relevant on section-c entry) ──
  const fastTrackEligible = useMemo(() => isFastTrackEligible(values), [values]);
  const fastTrackDecided = values.fastTrackOptIn !== undefined;
  const showFastTrackBanner = isStageC && fastTrackEligible && !fastTrackDecided;

  const handleFastTrackOptIn = useCallback(() => {
    onFieldChange('fastTrackOptIn', true);
    // After opting in, the user will end up at section-c briefly until the parent re-renders
    // and removes section-c from visible stages. They'll auto-advance to review.
  }, [onFieldChange]);

  const handleFastTrackDecline = useCallback(() => {
    onFieldChange('fastTrackOptIn', false);
  }, [onFieldChange]);

  // ── AI suggested value levers (suggest-and-confirm, not auto-populate) ──
  const [leverSuggestionDismissed, setLeverSuggestionDismissed] = useState(false);

  const suggestedLevers = useMemo(() => {
    if (!isStageC || !aiEnabled || !businessPurposeResult) return [];
    return matchSuggestedLevers(businessPurposeResult.suggestedValueLevers);
  }, [isStageC, aiEnabled, businessPurposeResult]);

  const currentLevers = Array.isArray(values.valueCreationLevers)
    ? (values.valueCreationLevers as string[])
    : [];
  const hasUnappliedSuggestions =
    suggestedLevers.length > 0 && !leverSuggestionDismissed && currentLevers.length === 0;

  const handleApplySuggestedLevers = useCallback(() => {
    onFieldChange(
      'valueCreationLevers',
      suggestedLevers.map((l) => l.value),
    );
    setLeverSuggestionDismissed(true);
  }, [suggestedLevers, onFieldChange]);

  return (
    <div className="space-y-7">
      {showFastTrackBanner && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <SparkleIcon />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Skip Portfolio Alignment?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Based on your answers, this looks like a low-risk individual productivity use case
                (third-party SaaS, public data only, internal use, no high-risk triggers). You can
                skip the Portfolio Alignment section and jump straight to Review &amp; Submit.
              </p>
              <p className="text-xs text-slate-500 mb-4">
                You can always come back and add portfolio details later if needed.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFastTrackOptIn}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Yes, skip this section
                </button>
                <button
                  type="button"
                  onClick={handleFastTrackDecline}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  No, I want to fill it out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {question.field === 'valueCreationLevers' && hasUnappliedSuggestions && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                      <SparkleIcon />
                      AI suggested {suggestedLevers.length} value levers
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLeverSuggestionDismissed(true)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={handleApplySuggestedLevers}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Apply all
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {suggestedLevers.map((lever) => (
                      <li
                        key={lever.value}
                        className="text-xs text-blue-600 flex items-start gap-1.5"
                      >
                        <span className="text-blue-300 mt-px">&bull;</span>
                        {lever.label}
                      </li>
                    ))}
                  </ul>
                </div>
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
