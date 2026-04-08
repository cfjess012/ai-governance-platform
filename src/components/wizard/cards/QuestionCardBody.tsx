'use client';

import { QuestionRenderer } from '@/components/wizard/QuestionRenderer';
import type { QuestionDefinition } from '@/config/questions';
import { CardChoiceList } from './CardChoiceList';

interface QuestionCardBodyProps {
  question: QuestionDefinition;
  value?: unknown;
  error?: string;
  onChange: (field: string, value: unknown) => void;
}

/**
 * Renders the body of a single question card.
 *
 * For `select` questions we use the lettered A/B/C/D CardChoiceList.
 * For every other type we reuse the existing QuestionRenderer so model
 * registry, multiselect, currency formatting, etc. keep working.
 */
export function QuestionCardBody({ question, value, error, onChange }: QuestionCardBodyProps) {
  const isSelect = question.type === 'select' && Array.isArray(question.options);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
          {question.section}
        </div>
        <h2 className="text-xl font-semibold leading-snug text-slate-900">
          {question.label}
          {question.required && <span className="ml-1 text-red-500">*</span>}
        </h2>
        {question.helpText && <p className="mt-1.5 text-sm text-slate-500">{question.helpText}</p>}
      </div>

      {isSelect ? (
        <CardChoiceList
          options={question.options ?? []}
          value={typeof value === 'string' ? value : undefined}
          onSelect={(v) => onChange(question.field, v || undefined)}
        />
      ) : (
        <div className="[&>div>label]:sr-only [&>fieldset>legend]:sr-only">
          <QuestionRenderer
            question={question}
            value={value}
            error={undefined /* we show error below, outside the renderer */}
            onChange={onChange}
          />
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
