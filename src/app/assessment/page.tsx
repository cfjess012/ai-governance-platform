'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConditionalField } from '@/components/wizard/ConditionalField';
import { QuestionRenderer } from '@/components/wizard/QuestionRenderer';
import { assessmentQuestions, assessmentSections } from '@/config/questions';
import {
  type AssessmentSectionId,
  calculatePathBasedVisibility,
  deriveAssessmentValuesFromIntake,
  getPrePopulatedFields,
} from '@/lib/assessment/section-visibility';
import type { EuAssessmentInput } from '@/lib/classification/eu-ai-act-assessment';
import { classifyEuAiActAssessment } from '@/lib/classification/eu-ai-act-assessment';
import type { SevenDimensionInput } from '@/lib/classification/seven-dimension-scoring';
import { calculateSevenDimensionScore } from '@/lib/classification/seven-dimension-scoring';
import {
  getVisibleAssessmentQuestions,
  getVisibleAssessmentSections,
  shouldShowFriaBanner,
} from '@/lib/questions/assessment-branching';
import { useAssessmentStore } from '@/lib/store/assessment-store';
import { useInventoryStore } from '@/lib/store/inventory-store';
import type { GovernancePath } from '@/types/inventory';

function buildScoringInput(formData: Record<string, unknown>): SevenDimensionInput {
  return {
    deploymentRegions: (formData.deploymentRegions as string[]) ?? ['us'],
    businessActivities: (formData.businessActivities as string[]) ?? ['none'],
    vendorAuditScope: (formData.vendorAuditScope as string) ?? 'no',
    dataClassification: (formData.dataClassification as string) ?? 'public',
    interactsWithPii: (formData.interactsWithPii as string) ?? 'no',
    unstructuredDataDev: (formData.unstructuredDataDev as string) ?? 'no',
    unstructuredDataProd: (formData.unstructuredDataProd as string) ?? 'no',
    dataProcessingRegions: (formData.dataProcessingRegions as string[]) ?? ['us'],
    aiModelsUsed: (formData.aiModelsUsed as string) ?? '',
    usesGenAi: (formData.usesGenAi as string) ?? 'no',
    usesClassicalModels: (formData.usesClassicalModels as string) ?? 'no',
    driftMonitoring: (formData.driftMonitoring as string) ?? '',
    failureRisks: (formData.failureRisks as string) ?? 'other',
    incidentResponsePlan: (formData.incidentResponsePlan as string) ?? 'no',
    dataAccessible: (formData.dataAccessible as string) ?? 'no',
    replacesHumanDecisions: (formData.replacesHumanDecisions as string) ?? 'no',
    automatesExternalDecisions: (formData.automatesExternalDecisions as string) ?? 'no',
    humanValidatesOutputs: (formData.humanValidatesOutputs as string) ?? 'yes',
    biasFairnessTesting: (formData.biasFairnessTesting as string) ?? '',
    customerFacingOutputs: (formData.customerFacingOutputs as string) ?? 'no',
    hasExternalUsers: (formData.hasExternalUsers as string) ?? 'no',
    monitorsHumanActivity: (formData.monitorsHumanActivity as string) ?? 'no',
    involvesThirdParty: (formData.involvesThirdParty as string) ?? 'no',
    vendorIso42001: (formData.vendorIso42001 as string) ?? 'no',
    dataUsedForTraining: (formData.dataUsedForTraining as string) ?? 'no',
  };
}

export default function AssessmentPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
          Loading assessment...
        </div>
      }
    >
      <AssessmentPage />
    </Suspense>
  );
}

function AssessmentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const useCaseIdParam = searchParams.get('useCaseId');

  const {
    formData,
    useCaseId,
    currentSectionIndex,
    isSaving,
    isSubmitted,
    updateField,
    setUseCaseId,
    setCurrentSection,
    setSaving,
    setSubmitted,
    prePopulate,
    reset,
  } = useAssessmentStore();

  const useCases = useInventoryStore((s) => s.useCases);
  const updateUseCase = useInventoryStore((s) => s.updateUseCase);
  const updateStatus = useInventoryStore((s) => s.updateStatus);

  const [submitResult, setSubmitResult] = useState<{ id: string } | null>(null);
  const [showAllSections, setShowAllSections] = useState(false);

  // Look up the linked case (used for triage decision and intake-driven derivations)
  const linkedCase = useMemo(
    () => useCases.find((uc) => uc.id === (useCaseIdParam ?? useCaseId)),
    [useCases, useCaseIdParam, useCaseId],
  );

  const governancePath: GovernancePath = linkedCase?.triage?.governancePath ?? 'standard';
  const linkedIntake = linkedCase?.intake;

  // Pre-populate from intake on first load.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only runs once on mount
  useEffect(() => {
    if (useCaseIdParam && !useCaseId) {
      setUseCaseId(useCaseIdParam);
      updateField('associatedUseCaseId', useCaseIdParam);

      const uc = useCases.find((u) => u.id === useCaseIdParam);
      if (uc) {
        const stage = uc.intake.lifecycleStage;
        // Lifecycle/timeline derivation (existing)
        const lifecycleDerived = {
          currentStage:
            stage === 'development_poc'
              ? 'poc'
              : stage === 'testing_pilot'
                ? 'in_development'
                : stage === 'idea_planning'
                  ? 'ideation'
                  : stage === 'in_use_seeking_approval'
                    ? 'in_development'
                    : 'backlog',
          plannedPocDate: uc.intake.targetPocQuarter,
          plannedProductionDate: uc.intake.targetProductionQuarter,
        };
        // New: derive overlapping fields from intake (data classification, vendor, GenAI, etc.)
        const intakeDerived = deriveAssessmentValuesFromIntake(uc.intake);
        prePopulate({ ...lifecycleDerived, ...intakeDerived } as never);
        updateStatus(useCaseIdParam, 'assessment_in_progress', 'mock-user@example.com');
      }
    }
  }, []);

  // Redirect lightweight cases to the lightweight review form
  useEffect(() => {
    if (linkedCase?.triage?.governancePath === 'lightweight') {
      router.replace(`/review/lightweight/${linkedCase.id}`);
    }
  }, [linkedCase, router]);

  // Compute pre-populated field set (for read-only display)
  const prePopulatedFields = useMemo(
    () => (linkedIntake ? getPrePopulatedFields(linkedIntake) : new Set<string>()),
    [linkedIntake],
  );

  const visibleQuestionIds = useMemo(() => getVisibleAssessmentQuestions(formData), [formData]);

  // Path-based visibility (uses intake + governance path)
  const pathVisibility = useMemo(() => {
    if (!linkedIntake) {
      // No linked case yet — show every section (backwards compatible)
      return {
        visible: assessmentSections.map((s) => s.id) as AssessmentSectionId[],
        skipped: [],
      };
    }
    return calculatePathBasedVisibility(linkedIntake, governancePath);
  }, [linkedIntake, governancePath]);

  // Combine path-based gating with the existing answer-based branching
  const branchingVisibleSectionIds = useMemo(
    () => getVisibleAssessmentSections(formData),
    [formData],
  );

  const visibleSections = useMemo(() => {
    const pathSet = new Set<string>(pathVisibility.visible);
    return assessmentSections.filter((s) => {
      // Always show review section
      if (s.id === 'assessment-review') return true;
      // The "view all" toggle bypasses path-based gating
      if (showAllSections) return branchingVisibleSectionIds.includes(s.id);
      // Otherwise: must be visible in BOTH path-based and answer-based branching
      return pathSet.has(s.id) && branchingVisibleSectionIds.includes(s.id);
    });
  }, [pathVisibility.visible, branchingVisibleSectionIds, showAllSections]);

  const showFria = useMemo(() => shouldShowFriaBanner(formData), [formData]);

  const currentSection = visibleSections[currentSectionIndex] ?? visibleSections[0];
  const isReview = currentSection?.id === 'assessment-review';
  const isLastSection = currentSectionIndex === visibleSections.length - 1;

  const sectionQuestions = useMemo(() => {
    if (!currentSection || isReview) return [];
    return assessmentQuestions.filter(
      (q) => q.stage === currentSection.id && visibleQuestionIds.has(q.id),
    );
  }, [currentSection, isReview, visibleQuestionIds]);

  const useCaseOptions = useMemo(
    () => useCases.map((uc) => ({ value: uc.id, label: uc.intake.useCaseName ?? uc.id })),
    [useCases],
  );

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => updateField(field, value),
    [updateField],
  );

  const handleNext = useCallback(() => {
    if (currentSectionIndex < visibleSections.length - 1) {
      setCurrentSection(currentSectionIndex + 1);
    }
  }, [currentSectionIndex, visibleSections.length, setCurrentSection]);

  const handlePrev = useCallback(() => {
    if (currentSectionIndex > 0) setCurrentSection(currentSectionIndex - 1);
  }, [currentSectionIndex, setCurrentSection]);

  const handleSubmit = useCallback(() => {
    setSaving(true);
    try {
      const assessmentId = `assess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const scoringInput = buildScoringInput(formData);
      const scoring = calculateSevenDimensionScore(scoringInput);

      const euInput: EuAssessmentInput = {
        deploymentRegions: scoringInput.deploymentRegions,
        businessActivities: scoringInput.businessActivities,
        replacesHumanDecisions: scoringInput.replacesHumanDecisions,
        automatesExternalDecisions: scoringInput.automatesExternalDecisions,
        monitorsHumanActivity: scoringInput.monitorsHumanActivity,
        usesGenAi: scoringInput.usesGenAi,
        customerFacingOutputs: scoringInput.customerFacingOutputs,
        hasExternalUsers: scoringInput.hasExternalUsers,
        interactsWithPii: scoringInput.interactsWithPii,
        dataClassification: scoringInput.dataClassification,
      };
      const euClassification = classifyEuAiActAssessment(euInput);

      const targetId = (formData.associatedUseCaseId as string) ?? useCaseId;
      if (targetId) {
        updateUseCase(targetId, {
          assessment: formData as never,
          scoring,
          euAiActDetail: euClassification,
          classification: {
            euAiActTier: euClassification.tier,
            riskTier: scoring.riskTier,
            overrideTriggered: scoring.overrideTriggered,
            explanation: scoring.dimensions
              .filter((d) => d.score >= 4)
              .map((d) => `${d.name}: ${d.explanation}`),
          },
        });
        updateStatus(targetId, 'approved', 'mock-user@example.com');
      }

      setSubmitted(true);
      setSubmitResult({ id: assessmentId });
    } finally {
      setSaving(false);
    }
  }, [formData, useCaseId, setSaving, setSubmitted, updateUseCase, updateStatus]);

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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Assessment Complete</h1>
        <p className="text-slate-600 mb-1">
          Risk scoring and EU AI Act classification have been applied.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Assessment ID: <span className="font-mono text-slate-700">{submitResult.id}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setSubmitResult(null);
            }}
          >
            New Assessment
          </Button>
          <Button
            onClick={() => {
              const targetId = (formData.associatedUseCaseId as string) ?? useCaseId;
              window.location.href = targetId ? `/inventory/${targetId}` : '/inventory';
            }}
          >
            View Results
          </Button>
        </div>
      </div>
    );
  }

  const pathLabels: Record<GovernancePath, { label: string; classes: string }> = {
    lightweight: { label: 'Lightweight Review', classes: 'bg-cyan-50 text-cyan-700' },
    standard: { label: 'Standard Assessment', classes: 'bg-blue-50 text-blue-700' },
    full: { label: 'Full Assessment + Committee', classes: 'bg-purple-50 text-purple-700' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Pre-Production Risk Assessment</h1>
          <p className="text-sm text-slate-500">
            {visibleSections.length - 1} sections &middot;{' '}
            {linkedCase ? (
              <>
                Linked to{' '}
                <Link
                  href={`/inventory/${linkedCase.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {linkedCase.intake.useCaseName}
                </Link>
              </>
            ) : (
              'Adaptive assessment based on your answers'
            )}
          </p>
        </div>
        {linkedCase?.triage && (
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pathLabels[governancePath].classes}`}
            >
              {pathLabels[governancePath].label}
            </span>
            <button
              type="button"
              onClick={() => setShowAllSections((v) => !v)}
              className="text-xs text-slate-500 hover:text-blue-600 underline-offset-2 hover:underline"
            >
              {showAllSections ? 'Apply path filter' : 'View all sections'}
            </button>
          </div>
        )}
      </div>

      {/* Skipped sections summary (only shown when path filter is active) */}
      {linkedCase?.triage && !showAllSections && pathVisibility.skipped.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            {pathVisibility.skipped.length}{' '}
            {pathVisibility.skipped.length === 1 ? 'section' : 'sections'} auto-skipped based on
            intake and governance path
          </p>
          <ul className="space-y-1">
            {pathVisibility.skipped.map((s) => {
              const sect = assessmentSections.find((sec) => sec.id === s.sectionId);
              return (
                <li key={s.sectionId} className="text-xs text-slate-500 flex items-start gap-1.5">
                  <span className="text-slate-300 mt-px">&bull;</span>
                  <span>
                    <strong className="text-slate-600">{sect?.title ?? s.sectionId}:</strong>{' '}
                    {s.reason}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showFria && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">
            This use case likely qualifies as High Risk under EU AI Act Annex III. A Fundamental
            Rights Impact Assessment may be required.
          </p>
        </div>
      )}

      <div className="flex gap-1.5 mb-8 overflow-x-auto pb-1">
        {visibleSections.map((section, index) => {
          const isCurrent = index === currentSectionIndex;
          const isPast = index < currentSectionIndex;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                if (index <= currentSectionIndex) setCurrentSection(index);
              }}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                isCurrent
                  ? 'bg-[#00539B] text-white shadow-sm'
                  : isPast
                    ? 'bg-[#00539B]/10 text-[#00539B] hover:bg-[#00539B]/20'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {section.subtitle || section.title}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-4xl">
        {isReview ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>
            <p className="text-sm text-slate-500">
              Review your assessment, then submit to generate risk scoring and EU AI Act
              classification.
            </p>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                <strong>
                  {
                    Object.keys(formData).filter(
                      (k) => formData[k as keyof typeof formData] !== undefined,
                    ).length
                  }
                </strong>{' '}
                questions answered across {visibleSections.length - 1} sections
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{currentSection?.title}</h2>
              {currentSection?.subtitle && (
                <p className="text-xs text-slate-500">{currentSection.subtitle}</p>
              )}
            </div>
            <div className="space-y-6">
              {sectionQuestions.map((q) => {
                const question = q.id === 'assess-q1' ? { ...q, options: useCaseOptions } : q;
                const isPrePopulated = prePopulatedFields.has(q.field);
                const fieldValue = formData[q.field as keyof typeof formData];

                if (isPrePopulated && linkedCase) {
                  return (
                    <ConditionalField key={q.id} visible={true}>
                      <PrePopulatedDisplay
                        label={q.label}
                        value={fieldValue}
                        options={q.options}
                        useCaseId={linkedCase.id}
                      />
                    </ConditionalField>
                  );
                }

                return (
                  <ConditionalField key={q.id} visible={true}>
                    <QuestionRenderer
                      question={question}
                      value={fieldValue}
                      onChange={handleFieldChange}
                    />
                  </ConditionalField>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={handlePrev} disabled={currentSectionIndex === 0}>
            Previous
          </Button>
          <div className="flex gap-3 items-center">
            {isSaving && <span className="text-xs text-slate-400">Processing...</span>}
            {isLastSection ? (
              <Button onClick={handleSubmit} disabled={isSaving}>
                Submit Assessment
              </Button>
            ) : (
              <Button onClick={handleNext}>Next Section</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only display for fields that were pre-populated from intake.
 * Shows the value, a "from intake" badge, and a link to edit in intake.
 */
function PrePopulatedDisplay({
  label,
  value,
  options,
  useCaseId,
}: {
  label: string;
  value: unknown;
  options?: { value: string; label: string }[];
  useCaseId: string;
}) {
  const formatted = (() => {
    if (value === undefined || value === null || value === '') return '\u2014';
    if (Array.isArray(value)) {
      if (options) {
        return value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ');
      }
      return value.join(', ');
    }
    if (options) {
      return options.find((o) => o.value === value)?.label ?? String(value);
    }
    return String(value);
  })();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-500">
          From intake
        </span>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
        {formatted}
      </div>
      <p className="text-xs text-slate-400">
        This value was captured at intake.{' '}
        <Link href={`/inventory/${useCaseId}`} className="text-blue-600 hover:underline">
          Edit in intake
        </Link>
      </p>
    </div>
  );
}
