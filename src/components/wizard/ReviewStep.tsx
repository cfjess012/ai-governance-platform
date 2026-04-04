'use client';

import { intakeQuestions } from '@/config/questions';
import { useAiStore } from '@/lib/store/ai-store';
import { useModelStore } from '@/lib/store/model-store';
import { AiConsistencyCheck } from './AiConsistencyCheck';

interface ReviewStepProps {
  values: Record<string, unknown>;
  visibleQuestionIds: Set<string>;
  onEditStep: (stepIndex: number) => void;
}

const sectionToStageIndex: Record<string, number> = {
  'Tell Us About Your AI Use Case': 0,
  'Additional Details for ERAI': 1,
  'Portfolio Alignment': 2,
};

const fieldToStageIndex: Record<string, number> = {};
for (const q of intakeQuestions) {
  const idx = sectionToStageIndex[q.section];
  if (idx !== undefined) {
    fieldToStageIndex[q.field] = idx;
  }
}

function formatValue(
  value: unknown,
  questionId: string,
  modelLookup?: (id: string) => string,
): string {
  if (value === undefined || value === null || value === '') return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '\u2014';
    // Model registry field — resolve IDs to names
    const q = intakeQuestions.find((q) => q.id === questionId);
    if (q?.dataSource === 'model-registry' && modelLookup) {
      return value.map((v) => modelLookup(v)).join(', ');
    }
    if (q?.options) {
      return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(', ');
    }
    return value.join(', ');
  }
  const q = intakeQuestions.find((q) => q.id === questionId);
  if (q?.options) {
    const opt = q.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return String(value);
}

export function ReviewStep({ values, visibleQuestionIds, onEditStep }: ReviewStepProps) {
  const visibleQuestions = intakeQuestions.filter((q) => visibleQuestionIds.has(q.id));
  const consistencyResult = useAiStore((s) => s.consistencyResult);
  const consistencyLoading = useAiStore((s) => s.consistencyLoading);
  const aiEnabled = useAiStore((s) => s.enabled);
  const getModel = useModelStore((s) => s.getModel);
  const modelLookup = (id: string) => getModel(id)?.data.name ?? id;

  const sections = new Map<string, typeof visibleQuestions>();
  for (const q of visibleQuestions) {
    if (!sections.has(q.section)) {
      sections.set(q.section, []);
    }
    sections.get(q.section)?.push(q);
  }

  const handleFixField = (field: string) => {
    const stageIndex = fieldToStageIndex[field] ?? 0;
    onEditStep(stageIndex);
    setTimeout(() => {
      const el = document.getElementById(field);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Review your answers below. Click edit to make changes.
      </p>

      {aiEnabled && (
        <AiConsistencyCheck
          result={consistencyResult}
          loading={consistencyLoading}
          onFixField={handleFixField}
        />
      )}

      {Array.from(sections.entries()).map(([sectionName, questions]) => (
        <div key={sectionName}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {sectionName}
            </h3>
            <button
              type="button"
              onClick={() => onEditStep(sectionToStageIndex[sectionName] ?? 0)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Edit
            </button>
          </div>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            {questions.map((q) => {
              const val = values[q.field];
              const isEmpty =
                val === undefined ||
                val === null ||
                val === '' ||
                (Array.isArray(val) && val.length === 0);
              return (
                <div key={q.id} className="px-4 py-3">
                  <dt className="text-xs text-slate-400">{q.label}</dt>
                  <dd
                    className={`mt-0.5 text-sm ${isEmpty ? 'text-slate-300 italic' : 'text-slate-700'}`}
                  >
                    {formatValue(val, q.id, modelLookup)}
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
