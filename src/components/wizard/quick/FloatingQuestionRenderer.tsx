'use client';

import { ModelMultiSelect } from '@/components/wizard/ModelMultiSelect';
import type { QuestionDefinition } from '@/config/questions';
import { FloatingBoolean } from './FloatingBoolean';
import { FloatingField } from './FloatingField';
import { FloatingSelect } from './FloatingSelect';
import { FloatingTextarea } from './FloatingTextarea';
import { PillGroup } from './PillGroup';

interface FloatingQuestionRendererProps {
  question: QuestionDefinition;
  value: unknown;
  error?: string;
  onChange: (field: string, value: unknown) => void;
  onBlur?: (field: string) => void;
}

/**
 * Dispatches a `QuestionDefinition` to the appropriate floating-label
 * variant. This is the single-page form's equivalent of QuestionRenderer —
 * every question type is rendered in the same aesthetic (floating labels,
 * animated blue underline bars, pill toggles, character counters) so that
 * the whole intake schema feels native to this flow.
 */
export function FloatingQuestionRenderer({
  question,
  value,
  error,
  onChange,
  onBlur,
}: FloatingQuestionRendererProps) {
  const handleChange = (next: unknown) => onChange(question.field, next);
  const handleBlur = () => onBlur?.(question.field);

  switch (question.type) {
    case 'text':
      return (
        <FloatingField
          label={question.label + (question.required ? ' *' : '')}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          error={error}
          hint={question.helpText}
        />
      );

    case 'number':
      return (
        <FloatingField
          label={question.label + (question.required ? ' *' : '')}
          type="number"
          inputMode="numeric"
          value={typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          error={error}
          hint={question.helpText}
          min="0"
        />
      );

    case 'currency': {
      const rawDigits =
        typeof value === 'string'
          ? value.replace(/[^0-9]/g, '')
          : typeof value === 'number'
            ? String(value)
            : '';
      const displayValue = rawDigits
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(Number(rawDigits))
        : '';
      return (
        <FloatingField
          label={question.label + (question.required ? ' *' : '')}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={handleBlur}
          error={error}
          hint={question.helpText}
        />
      );
    }

    case 'textarea':
      return (
        <FloatingTextarea
          label={question.label + (question.required ? ' *' : '')}
          max={500}
          current={typeof value === 'string' ? value.length : 0}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          error={error}
        />
      );

    case 'select':
      return (
        <FloatingSelect
          label={question.label + (question.required ? ' *' : '')}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value || undefined)}
          onBlur={handleBlur}
          error={error}
          options={question.options ?? []}
        />
      );

    case 'multiselect': {
      // Dynamic data source → delegate to ModelMultiSelect inside a
      // floating-label fieldset so it keeps its rich picker UI.
      if (question.dataSource === 'model-registry') {
        return (
          <fieldset>
            <legend className="mb-2.5 block origin-left scale-[0.78] text-[15px] text-slate-500">
              {question.label}
              {question.required && <span className="ml-1 text-red-500">*</span>}
            </legend>
            <ModelMultiSelect
              value={Array.isArray(value) ? value : []}
              onChange={(ids) => handleChange(ids)}
              error={error}
            />
            {question.helpText && !error && (
              <p className="mt-1.5 text-xs text-slate-400">{question.helpText}</p>
            )}
          </fieldset>
        );
      }

      return (
        <PillGroup
          label={question.label + (question.required ? ' *' : '')}
          options={question.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(next) => handleChange(next)}
          exclusiveValue={question.exclusiveOption}
          error={error}
        />
      );
    }

    case 'boolean':
      return (
        <FloatingBoolean
          label={question.label + (question.required ? ' *' : '')}
          value={typeof value === 'boolean' ? value : undefined}
          onChange={(v) => handleChange(v)}
          error={error}
          hint={question.helpText}
        />
      );

    default:
      return null;
  }
}
