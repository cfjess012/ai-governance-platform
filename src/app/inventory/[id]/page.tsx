'use client';

import Link from 'next/link';
import { use } from 'react';
import { Button } from '@/components/ui/Button';
import { assessmentQuestions, intakeQuestions } from '@/config/questions';
import { useInventoryStore } from '@/lib/store/inventory-store';

const riskTierColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  pending: 'bg-slate-100 text-slate-600',
};

function DimensionBar({
  name,
  score,
  weight,
  explanation,
}: {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}) {
  const barColors = [
    '',
    'bg-green-400',
    'bg-lime-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-red-500',
  ];
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{name}</span>
        <span className="text-xs text-slate-500">
          {score}/5 (weight: {weight}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${barColors[score]}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{explanation}</p>
    </div>
  );
}

function formatFieldValue(
  value: unknown,
  fieldName: string,
  questions: typeof intakeQuestions,
): string {
  if (value === undefined || value === null || value === '') return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '\u2014';
    const q = questions.find((q) => q.field === fieldName);
    if (q?.options) {
      return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(', ');
    }
    return value.join(', ');
  }
  const q = questions.find((q) => q.field === fieldName);
  if (q?.options) {
    return q.options.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const useCase = useInventoryStore((s) => s.useCases.find((uc) => uc.id === id));

  if (!useCase) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Use Case Not Found</h1>
        <p className="text-slate-500 mb-4">The use case with ID &quot;{id}&quot; was not found.</p>
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/inventory"
            className="text-xs text-[#00539B] hover:underline mb-2 inline-block"
          >
            &larr; Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{useCase.intake.useCaseName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {useCase.intake.businessArea} &middot; {useCase.intake.useCaseOwner}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${riskTierColors[useCase.classification.riskTier]}`}
          >
            {useCase.classification.riskTier === 'pending'
              ? 'Risk: Pending'
              : `${useCase.classification.riskTier.charAt(0).toUpperCase()}${useCase.classification.riskTier.slice(1)} Risk`}
          </span>
          {!useCase.assessment && useCase.status === 'submitted' && (
            <Link href={`/assessment?useCaseId=${useCase.id}`}>
              <Button size="sm">Start Risk Assessment</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intake answers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Intake Answers</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {intakeQuestions.map((q) => {
                const val = (useCase.intake as Record<string, unknown>)[q.field];
                if (val === undefined) return null;
                return (
                  <div key={q.id} className="px-6 py-3">
                    <dt className="text-xs font-medium text-slate-500">{q.label}</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">
                      {formatFieldValue(val, q.field, intakeQuestions)}
                    </dd>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assessment answers (if completed) */}
          {useCase.assessment && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">Risk Assessment Answers</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {assessmentQuestions.map((q) => {
                  const val = (useCase.assessment as Record<string, unknown>)?.[q.field];
                  if (val === undefined) return null;
                  return (
                    <div key={q.id} className="px-6 py-3">
                      <dt className="text-xs font-medium text-slate-500">{q.label}</dt>
                      <dd className="mt-0.5 text-sm text-slate-900">
                        {formatFieldValue(val, q.field, assessmentQuestions)}
                      </dd>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Scoring breakdown */}
          {useCase.scoring && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Risk Scoring Breakdown</h3>
              <div className="mb-4 text-center">
                <span className="text-3xl font-bold text-slate-900">
                  {useCase.scoring.compositeScore}
                </span>
                <span className="text-sm text-slate-500 ml-1">/ 5.0</span>
                <div className="mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskTierColors[useCase.scoring.riskTier]}`}
                  >
                    {useCase.scoring.riskTier.charAt(0).toUpperCase() +
                      useCase.scoring.riskTier.slice(1)}
                  </span>
                </div>
              </div>

              {useCase.scoring.overrideTriggered && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-800">
                    Critical dimension override triggered
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">{useCase.scoring.overrideReason}</p>
                </div>
              )}

              <div className="space-y-4">
                {useCase.scoring.dimensions.map((dim) => (
                  <DimensionBar
                    key={dim.name}
                    name={dim.name}
                    score={dim.score}
                    weight={dim.weight}
                    explanation={dim.explanation}
                  />
                ))}
              </div>
            </div>
          )}

          {/* EU AI Act classification */}
          {useCase.euAiActDetail && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                EU AI Act Classification
              </h3>
              <div className="mb-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskTierColors[useCase.euAiActDetail.tier] ?? riskTierColors.pending}`}
                >
                  {useCase.euAiActDetail.tier.toUpperCase()}
                </span>
              </div>
              {useCase.euAiActDetail.triggers.length > 0 && (
                <div className="space-y-2 mb-3">
                  {useCase.euAiActDetail.triggers.map((t, i) => (
                    <div key={i} className="text-xs text-slate-600">
                      <span className="font-medium">{t.annexRef}:</span> {t.reason}
                    </div>
                  ))}
                </div>
              )}
              {useCase.euAiActDetail.obligations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Obligations:</p>
                  <ul className="space-y-0.5">
                    {useCase.euAiActDetail.obligations.map((o, i) => (
                      <li key={i} className="text-xs text-slate-600">
                        &bull; {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-3 italic">
                {useCase.euAiActDetail.disclaimer}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>
            <div className="space-y-3">
              {useCase.timeline.map((change, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <div className="w-2 h-2 mt-1 rounded-full bg-[#00539B] flex-shrink-0" />
                  <div>
                    <p className="text-slate-700 font-medium capitalize">
                      {change.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-slate-500">
                      {new Date(change.timestamp).toLocaleString()} &middot; {change.changedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Governance requirements */}
          {useCase.scoring && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Governance Requirements</h3>
              <ul className="space-y-1.5">
                {useCase.scoring.governanceRequirements.map((req, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-[#00539B] mt-0.5 flex-shrink-0">&bull;</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
