'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { intakeQuestions, intakeStages } from '@/config/questions';
import { useAiAnalysis } from '@/lib/ai/use-ai-analysis';
import { submitIntake as submitIntakeUnified } from '@/lib/intake/submit';
import {
  calculateProgress,
  getVisibleIntakeQuestions,
  getVisibleIntakeStages,
} from '@/lib/questions/branching-rules';
import { intakeSchema } from '@/lib/questions/intake-schema';
import { useAiStore } from '@/lib/store/ai-store';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useSessionStore } from '@/lib/store/session-store';
import { useWizardStore } from '@/lib/store/wizard-store';
import { AiToggle } from './AiToggle';
import { AiUnavailableToast } from './AiUnavailableToast';
import { ClassificationSidebar } from './ClassificationSidebar';
import { ReviewStep } from './ReviewStep';
import { WizardStep } from './WizardStep';

const stageRequiredFields: Record<string, string[]> = {
  'section-a': [
    'useCaseName',
    'useCaseOwner',
    'executiveSponsor',
    'businessArea',
    'businessProblem',
    'howAiHelps',
    'aiType',
    'buildOrAcquire',
    'thirdPartyInvolved',
    'usesFoundationModel',
    'deploymentRegions',
    'lifecycleStage',
    'previouslyReviewed',
    'highRiskTriggers',
    'whoUsesSystem',
    'whoAffected',
    'worstOutcome',
  ],
  'section-b': [
    'dataSensitivity',
    'humanOversight',
    'differentialTreatment',
    'peopleAffectedCount',
  ],
  'section-c': ['strategicPriority'],
};

const conditionalRequiredFields: Record<string, { parentField: string; parentValue: string }> = {
  vendorName: { parentField: 'thirdPartyInvolved', parentValue: 'yes' },
  auditability: { parentField: 'thirdPartyInvolved', parentValue: 'yes' },
  whichModels: { parentField: 'usesFoundationModel', parentValue: 'yes' },
};

function validateStage(
  stageId: string,
  formData: Record<string, unknown>,
  visibleQuestionIds: Set<string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (stageId === 'review') return errors;
  const fields = stageRequiredFields[stageId] ?? [];
  for (const field of fields) {
    const question = intakeQuestions.find((q) => q.field === field);
    if (!question) continue;
    if (!visibleQuestionIds.has(question.id)) continue;
    if (!question.required) continue;
    const value = formData[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = `${question.label} is required`;
    } else if (typeof value === 'string' && value.trim() === '') {
      errors[field] = `${question.label} is required`;
    } else if (Array.isArray(value) && value.length === 0) {
      errors[field] = `${question.label} is required`;
    }
  }
  if (stageId === 'section-a') {
    for (const [field, condition] of Object.entries(conditionalRequiredFields)) {
      if (formData[condition.parentField] === condition.parentValue) {
        const question = intakeQuestions.find((q) => q.field === field);
        if (!question) continue;
        const value = formData[field];
        if (value === undefined || value === null || value === '') {
          errors[field] = `${question.label} is required`;
        }
      }
    }
    for (const field of ['businessProblem', 'howAiHelps']) {
      if (
        typeof formData[field] === 'string' &&
        (formData[field] as string).length > 0 &&
        (formData[field] as string).length < 10
      ) {
        errors[field] = 'Description must be at least 10 characters';
      }
    }
  }
  return errors;
}

/** Short labels for the middle sidebar */
const stageShortLabels: Record<string, string> = {
  'section-a': 'General',
  'section-b': 'Risk Details',
  'section-c': 'Portfolio',
  review: 'Review & Submit',
};

export function WizardShell() {
  const {
    formData,
    currentStepIndex,
    isDirty,
    isSaving,
    isSubmitted,
    lastSavedAt,
    updateField,
    setCurrentStep,
    setDraftId,
    setSaving,
    setSubmitted,
    markSaved,
    reset,
  } = useWizardStore();
  const sessionId = useWizardStore((s) => s.sessionId);
  const startFresh = useWizardStore((s) => s.startFresh);
  const addUseCase = useInventoryStore((s) => s.addUseCase);
  const sessionEmail = useSessionStore((s) => s.user?.email ?? 'unknown@example.com');

  // P2 fix: clear stale data from a prior completed intake on mount.
  // If sessionId is null but formData has content, it's leftover data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: must run once on mount to detect stale sessions
  useEffect(() => {
    if (!sessionId && Object.keys(formData).length > 0) {
      startFresh();
    }
  }, []);

  const [stageErrors, setStageErrors] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<{ id: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { analyzeBusinessPurpose, runConsistencyCheck } = useAiAnalysis();
  const aiEnabled = useAiStore((s) => s.enabled);
  const resetAiResults = useAiStore((s) => s.resetResults);
  const consistencyRanRef = useRef(false);

  const visibleQuestionIds = useMemo(() => getVisibleIntakeQuestions(formData), [formData]);
  const visibleStageIds = useMemo(() => getVisibleIntakeStages(formData), [formData]);
  const visibleStages = useMemo(
    () => intakeStages.filter((s) => visibleStageIds.includes(s.id)),
    [visibleStageIds],
  );

  const currentStage = visibleStages[currentStepIndex] ?? visibleStages[0];
  const progress = useMemo(() => calculateProgress(formData), [formData]);

  useEffect(() => {
    if (currentStage?.id === 'review' && aiEnabled && !consistencyRanRef.current) {
      consistencyRanRef.current = true;
      runConsistencyCheck(formData);
    }
    if (currentStage?.id !== 'review') {
      consistencyRanRef.current = false;
    }
  }, [currentStage?.id, aiEnabled, formData, runConsistencyCheck]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(async () => {
      try {
        setSaving(true);
        const response = await fetch('/api/intake/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData, draftId: useWizardStore.getState().draftId }),
        });
        const result = await response.json();
        if (result.data?.id) setDraftId(result.data.id);
        markSaved();
      } catch {
        setSaving(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, isDirty, setSaving, markSaved, setDraftId]);

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      updateField(field, value);
      setStageErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (field === 'businessProblem' && typeof value === 'string') {
        analyzeBusinessPurpose(value, { ...formData, [field]: value });
      }
    },
    [updateField, analyzeBusinessPurpose, formData],
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    if (!currentStage) return;
    const errors = validateStage(currentStage.id, formData, visibleQuestionIds);
    if (Object.keys(errors).length > 0) {
      setStageErrors(errors);
      // Find the first error in FORM ORDER (not object key order)
      const stageQuestionsInOrder = intakeQuestions.filter(
        (q) => q.stage === currentStage.id && visibleQuestionIds.has(q.id),
      );
      const firstErrorField = stageQuestionsInOrder.find((q) => errors[q.field])?.field;
      if (firstErrorField) {
        // Defer to next frame so error UI renders first
        requestAnimationFrame(() => {
          const el = document.getElementById(firstErrorField);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Focus the input if it's focusable; for fieldsets, focus the first input inside
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
              (el as HTMLInputElement).focus({ preventScroll: true });
            } else {
              const firstInput = el.querySelector<HTMLElement>('input, select, textarea, button');
              firstInput?.focus({ preventScroll: true });
            }
          }
        });
      }
      return;
    }
    setStageErrors({});
    if (currentStepIndex < visibleStages.length - 1) {
      setCurrentStep(currentStepIndex + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [
    currentStage,
    currentStepIndex,
    visibleStages.length,
    formData,
    visibleQuestionIds,
    setCurrentStep,
  ]);

  const handlePrev = useCallback(() => {
    setStageErrors({});
    if (currentStepIndex > 0) {
      setCurrentStep(currentStepIndex - 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex, setCurrentStep]);

  const handleEditStage = useCallback(
    (stageIndex: number) => {
      setStageErrors({});
      setCurrentStep(stageIndex);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setCurrentStep],
  );

  const handleFormSubmit = useCallback(async () => {
    const parsed = intakeSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') errors[field] = issue.message;
      }
      setStageErrors(errors);
      return;
    }
    try {
      setSaving(true);
      // Use the unified submitIntake pipeline so the Layer 1 router fires
      // consistently for every intake flow (Gap 3 fix).
      const result = submitIntakeUnified({
        formData: parsed.data,
        submittedBy: sessionEmail,
      });
      if (result.ok) {
        addUseCase(result.useCase);
        markSaved();
        setSubmitted(true);
        setSubmitResult({ id: result.useCase.id });
      } else {
        setStageErrors(result.errors);
        setSaving(false);
      }
    } catch {
      setSaving(false);
    }
  }, [formData, setSaving, markSaved, setSubmitted, addUseCase]);

  // Success
  if (isSubmitted && submitResult) {
    const urgency = formData.reviewUrgency as string | undefined;
    const isTimeSensitive = urgency === 'time_sensitive' || urgency === 'blocking_deployment';

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center">
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Intake Submitted</h1>
            <p className="text-xs text-slate-400 font-mono">{submitResult.id}</p>
          </div>

          {/* What happens next */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">What happens next</h2>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">Governance team review</p>
                  <p className="text-xs text-slate-500">
                    {isTimeSensitive
                      ? 'Your submission is flagged as time-sensitive and will be prioritized. Expect initial review within 2\u20133 business days.'
                      : 'The governance team will review your submission within 3\u20135 business days.'}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">Classification & triage</p>
                  <p className="text-xs text-slate-500">
                    Your use case will be classified against the EU AI Act and internal risk
                    frameworks. You&apos;ll receive an email with the result and any required next
                    steps.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">Assessment (if required)</p>
                  <p className="text-xs text-slate-500">
                    High-risk use cases will require a pre-production risk assessment. The
                    governance team will schedule this with you directly.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                reset();
                resetAiResults();
                setSubmitResult(null);
              }}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Submit Another
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/inventory';
              }}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              View in Inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLastStage = currentStepIndex === visibleStages.length - 1;
  const isReviewStage = currentStage?.id === 'review';

  return (
    <>
      {/* Clear dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-4 animate-fade-in">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Clear form?</h3>
            <p className="text-sm text-slate-500 mb-5">This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  resetAiResults();
                  setStageErrors({});
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 h-full overflow-hidden">
        {/* ── Middle sidebar ── */}
        <aside className="w-[220px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
          {/* Title */}
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[13px] font-semibold text-slate-900">New Intake</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{progress.percentage}% complete</p>
          </div>

          {/* Sections nav */}
          <div className="px-3 pb-3">
            <p className="px-2 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Sections
            </p>
            {visibleStages.map((stage, index) => {
              const isCurrent = index === currentStepIndex;
              const isPast = index < currentStepIndex;
              const isClickable = index <= currentStepIndex;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    if (isClickable) {
                      setStageErrors({});
                      setCurrentStep(index);
                    }
                  }}
                  className={`w-full text-left px-3 py-[7px] rounded-lg text-[13px] mb-px transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : isPast
                        ? 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                        : 'text-slate-400 cursor-default'
                  }`}
                >
                  {stageShortLabels[stage.id] ?? stage.title}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 mx-4" />

          {/* Settings */}
          <div className="px-3 py-3">
            <p className="px-2 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Settings
            </p>
            <div className="px-2 py-1">
              <AiToggle />
            </div>
          </div>

          <div className="border-t border-slate-100 mx-4" />

          {/* Classification */}
          <div className="px-3 py-3 flex-1">
            <ClassificationSidebar />
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="shrink-0 h-14 px-8 flex items-center justify-between border-b border-slate-200 bg-white">
            <h1 className="text-lg font-semibold text-slate-900">
              {currentStage?.title ?? 'Intake'}
            </h1>
            <div className="flex items-center gap-4">
              {isSaving && <span className="text-xs text-slate-400">Saving...</span>}
              {lastSavedAt && !isSaving && (
                <span className="text-xs text-slate-400">
                  Saved {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              )}
              {progress.answered > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear form
                </button>
              )}
            </div>
          </header>

          {/* Progress */}
          <div className="h-[2px] bg-slate-100 shrink-0">
            <div
              className="h-[2px] bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* Scrollable form */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50/50">
            <div className="max-w-[640px] mx-auto px-8 py-8">
              {isReviewStage ? (
                <ReviewStep
                  values={formData}
                  visibleQuestionIds={visibleQuestionIds}
                  onEditStep={handleEditStage}
                />
              ) : (
                currentStage && (
                  <WizardStep
                    stepId={currentStage.id}
                    title={currentStage.title}
                    sections={currentStage.sections}
                    visibleQuestionIds={visibleQuestionIds}
                    errors={stageErrors}
                    values={formData}
                    onFieldChange={handleFieldChange}
                    aiEnabled={aiEnabled}
                  />
                )
              )}

              {isReviewStage && Object.keys(stageErrors).length > 0 && (
                <div className="mt-6 p-4 border border-red-200 rounded-lg bg-white">
                  <p className="text-sm font-medium text-red-600 mb-2">
                    Please fix before submitting:
                  </p>
                  <ul className="space-y-1">
                    {Object.entries(stageErrors).map(([field, msg]) => (
                      <li key={field} className="text-sm text-red-500">
                        &bull; {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex justify-between mt-10 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
                >
                  Previous
                </button>
                {isLastStage ? (
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={isSaving}
                    className="px-5 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Submit Intake
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AiUnavailableToast />
    </>
  );
}
