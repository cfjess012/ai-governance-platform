'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { intakeQuestions, intakeStages } from '@/config/questions';
import {
  calculateProgress,
  getVisibleIntakeQuestions,
  getVisibleIntakeStages,
  getWarningBanners,
} from '@/lib/questions/branching-rules';
import { intakeSchema } from '@/lib/questions/intake-schema';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useWizardStore } from '@/lib/store/wizard-store';
import { ClassificationSidebar } from './ClassificationSidebar';
import { ReviewStep } from './ReviewStep';
import { WizardStep } from './WizardStep';

/** Map stage to required fields for per-stage validation */
const stageRequiredFields: Record<string, string[]> = {
  'quick-intake': [
    'useCaseName',
    'solutionType',
    'businessPurpose',
    'businessArea',
    'useCaseOwner',
    'ethicalAiAligned',
    'prohibitedPractices',
  ],
  'strategic-alignment': ['lifecycleStage', 'useStatus', 'strategicPriority'],
  'value-capture': ['valueDescription'],
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
    }
  }

  // Min-length checks
  if (
    stageId === 'quick-intake' &&
    typeof formData.businessPurpose === 'string' &&
    formData.businessPurpose.length > 0 &&
    formData.businessPurpose.length < 10
  ) {
    errors.businessPurpose = 'Description must be at least 10 characters';
  }
  if (
    stageId === 'value-capture' &&
    typeof formData.valueDescription === 'string' &&
    formData.valueDescription.length > 0 &&
    formData.valueDescription.length < 10
  ) {
    errors.valueDescription = 'Value description must be at least 10 characters';
  }

  return errors;
}

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
  const addUseCase = useInventoryStore((s) => s.addUseCase);

  const [stageErrors, setStageErrors] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<{ id: string } | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  const visibleQuestionIds = useMemo(() => getVisibleIntakeQuestions(formData), [formData]);
  const visibleStageIds = useMemo(() => getVisibleIntakeStages(formData), [formData]);
  const visibleStages = useMemo(
    () => intakeStages.filter((s) => visibleStageIds.includes(s.id)),
    [visibleStageIds],
  );
  const warningBanners = useMemo(() => getWarningBanners(formData), [formData]);

  const currentStage = visibleStages[currentStepIndex] ?? visibleStages[0];
  const progress = useMemo(() => calculateProgress(formData), [formData]);

  // Welcome-back detection
  useEffect(() => {
    const hasData = Object.keys(formData).length > 0;
    const isReturning = hasData && currentStepIndex > 0;
    if (isReturning && !isSubmitted) {
      setShowWelcomeBack(true);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft
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
        if (result.data?.id) {
          setDraftId(result.data.id);
        }
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
    },
    [updateField],
  );

  const handleNext = useCallback(() => {
    if (!currentStage) return;
    const errors = validateStage(currentStage.id, formData, visibleQuestionIds);
    if (Object.keys(errors).length > 0) {
      setStageErrors(errors);
      return;
    }
    setStageErrors({});
    if (currentStepIndex < visibleStages.length - 1) {
      setCurrentStep(currentStepIndex + 1);
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
    }
  }, [currentStepIndex, setCurrentStep]);

  const handleEditStage = useCallback(
    (stageIndex: number) => {
      setStageErrors({});
      setCurrentStep(stageIndex);
    },
    [setCurrentStep],
  );

  const handleFormSubmit = useCallback(async () => {
    const parsed = intakeSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          errors[field] = issue.message;
        }
      }
      setStageErrors(errors);
      return;
    }
    try {
      setSaving(true);
      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData }),
      });
      const result = await response.json();
      if (result.data) {
        // Add to inventory store
        const now = new Date().toISOString();
        addUseCase({
          id: result.data.id,
          intake: result.data.intake,
          classification: result.data.classification,
          status: 'submitted',
          timeline: [{ status: 'submitted', timestamp: now, changedBy: 'mock-user@example.com' }],
          createdAt: now,
          updatedAt: now,
          submittedBy: 'mock-user@example.com',
        });
        markSaved();
        setSubmitted(true);
        setSubmitResult({ id: result.data.id });
      } else {
        setSaving(false);
      }
    } catch {
      setSaving(false);
    }
  }, [formData, setSaving, markSaved, setSubmitted, addUseCase]);

  // Submitted confirmation
  if (isSubmitted && submitResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            aria-hidden="true"
            width="32"
            height="32"
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Intake Submitted Successfully</h1>
        <p className="text-slate-600 mb-1">
          Your AI use case intake has been submitted for review.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Reference ID: <span className="font-mono text-slate-700">{submitResult.id}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setSubmitResult(null);
            }}
          >
            Submit Another
          </Button>
          <Button
            onClick={() => {
              window.location.href = '/inventory';
            }}
          >
            Go to Inventory
          </Button>
        </div>
      </div>
    );
  }

  const isLastStage = currentStepIndex === visibleStages.length - 1;
  const isReviewStage = currentStage?.id === 'review';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome back prompt */}
      {showWelcomeBack && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between animate-fade-in">
          <div>
            <p className="text-sm font-medium text-blue-900">Welcome back!</p>
            <p className="text-xs text-blue-700">
              You have an in-progress intake. Continue where you left off?
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reset();
                setShowWelcomeBack(false);
              }}
            >
              Start Fresh
            </Button>
            <Button size="sm" onClick={() => setShowWelcomeBack(false)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Warning banners from Stage 1 triggers */}
      {warningBanners.map((banner) => (
        <div
          key={banner.id}
          className={`mb-4 px-4 py-3 rounded-lg border text-sm font-medium ${
            banner.severity === 'red'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {banner.message}
        </div>
      ))}

      {/* Header + Progress */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">AI Use Case Intake</h1>
        <p className="text-sm text-slate-500 mb-4">
          {progress.answered} of {progress.total} questions answered
          {progress.percentage < 100 && (
            <span className="text-slate-400">
              {' '}
              &middot; ~{progress.estimatedMinutes} min remaining
            </span>
          )}
        </p>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-[#00539B] h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Stage navigation pills */}
      <div className="flex gap-1.5 mb-8 overflow-x-auto pb-1">
        {visibleStages.map((stage, index) => {
          const isCurrent = index === currentStepIndex;
          const isPast = index < currentStepIndex;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                if (index <= currentStepIndex) {
                  setStageErrors({});
                  setCurrentStep(index);
                }
              }}
              className={`
                px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all
                ${
                  isCurrent
                    ? 'bg-[#00539B] text-white shadow-sm'
                    : isPast
                      ? 'bg-[#00539B]/10 text-[#00539B] hover:bg-[#00539B]/20 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-default'
                }
              `}
            >
              <span className="mr-1.5">{index + 1}.</span>
              {stage.title}
              {stage.subtitle && <span className="ml-1.5 opacity-70">{stage.subtitle}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Main form area */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
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
                />
              )
            )}

            {isReviewStage && Object.keys(stageErrors).length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following before submitting:
                </p>
                <ul className="space-y-1">
                  {Object.entries(stageErrors).map(([field, msg]) => (
                    <li key={field} className="text-sm text-red-700">
                      &bull; {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
              <Button variant="outline" onClick={handlePrev} disabled={currentStepIndex === 0}>
                Previous
              </Button>
              <div className="flex gap-3 items-center">
                {isSaving && <span className="text-xs text-slate-400">Saving...</span>}
                {lastSavedAt && !isSaving && (
                  <span className="text-xs text-slate-400">
                    Saved {new Date(lastSavedAt).toLocaleTimeString()}
                  </span>
                )}
                {isLastStage ? (
                  <Button onClick={handleFormSubmit} disabled={isSaving}>
                    Submit Intake
                  </Button>
                ) : (
                  <Button onClick={handleNext}>Next</Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Classification sidebar */}
        <div className="lg:col-span-3">
          <div className="sticky top-20">
            <ClassificationSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
