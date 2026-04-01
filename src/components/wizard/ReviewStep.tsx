'use client';

import { intakeQuestions } from '@/config/questions';

interface ReviewStepProps {
  values: Record<string, unknown>;
  visibleQuestionIds: Set<string>;
  onEditStep: (stepIndex: number) => void;
}

const sectionToStageIndex: Record<string, number> = {
  'Quick Intake': 0,
  'Strategic Alignment': 1,
  'Value Capture': 2,
};

function formatValue(value: unknown, questionId: string): string {
  if (value === undefined || value === null || value === '') return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '\u2014';
    // Find the question to get option labels
    const q = intakeQuestions.find((q) => q.id === questionId);
    if (q?.options) {
      return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(', ');
    }
    return value.join(', ');
  }
  // For select fields, look up the label
  const q = intakeQuestions.find((q) => q.id === questionId);
  if (q?.options) {
    const opt = q.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return String(value);
}

export function ReviewStep({ values, visibleQuestionIds, onEditStep }: ReviewStepProps) {
  const visibleQuestions = intakeQuestions.filter((q) => visibleQuestionIds.has(q.id));

  // Group by section
  const sections = new Map<string, typeof visibleQuestions>();
  for (const q of visibleQuestions) {
    if (!sections.has(q.section)) {
      sections.set(q.section, []);
    }
    sections.get(q.section)?.push(q);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review your answers below. Click the edit button on any section to make changes.
        </p>
      </div>

      {Array.from(sections.entries()).map(([sectionName, questions]) => (
        <div key={sectionName} className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">{sectionName}</h3>
            <button
              type="button"
              onClick={() => onEditStep(sectionToStageIndex[sectionName] ?? 0)}
              className="text-xs font-medium text-[#00539B] hover:text-[#003d73] transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {questions.map((q) => {
              const val = values[q.field];
              const isEmpty =
                val === undefined ||
                val === null ||
                val === '' ||
                (Array.isArray(val) && val.length === 0);
              return (
                <div key={q.id} className="px-4 py-3">
                  <dt className="text-xs font-medium text-slate-500">{q.label}</dt>
                  <dd
                    className={`mt-0.5 text-sm ${isEmpty ? 'text-slate-400 italic' : 'text-slate-900'}`}
                  >
                    {formatValue(val, q.id)}
                  </dd>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
