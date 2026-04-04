'use client';

import type { QuestionDefinition } from '@/config/questions';
import { ModelMultiSelect } from './ModelMultiSelect';

interface QuestionRendererProps {
  question: QuestionDefinition;
  value?: unknown;
  error?: string;
  onChange?: (field: string, value: unknown) => void;
}

export function QuestionRenderer({ question, value, error, onChange }: QuestionRendererProps) {
  const handleChange = (newValue: unknown) => {
    onChange?.(question.field, newValue);
  };

  const labelEl = (
    <label htmlFor={question.field} className="block text-sm font-medium text-slate-700">
      {question.label}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const helpEl = question.helpText && !error && (
    <p className="text-xs text-slate-400">{question.helpText}</p>
  );

  const errorEl = error && <p className="text-xs text-red-500">{error}</p>;

  const inputClasses = `block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
    ${error ? 'border-red-300 text-red-900 bg-red-50/50' : 'border-slate-300 text-slate-900 bg-white hover:border-slate-400'}`;

  switch (question.type) {
    case 'text':
      return (
        <div className="space-y-1">
          {labelEl}
          <input
            id={question.field}
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClasses}
          />
          {helpEl}
          {errorEl}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          {labelEl}
          <input
            id={question.field}
            type="number"
            value={
              typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
            }
            onChange={(e) => handleChange(e.target.value)}
            className={inputClasses}
            min="0"
          />
          {helpEl}
          {errorEl}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1">
          {labelEl}
          <textarea
            id={question.field}
            rows={3}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClasses}
          />
          {helpEl}
          {errorEl}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          {labelEl}
          <select
            id={question.field}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(e.target.value || undefined)}
            className={inputClasses}
          >
            <option value="">Select an option...</option>
            {(question.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {helpEl}
          {errorEl}
        </div>
      );

    case 'multiselect': {
      // Dynamic data source — delegate to ModelMultiSelect
      if (question.dataSource === 'model-registry') {
        return (
          <fieldset id={question.field} className="space-y-1">
            <legend className="block text-sm font-medium text-slate-700">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </legend>
            <ModelMultiSelect
              value={Array.isArray(value) ? value : []}
              onChange={(ids: string[]) => handleChange(ids)}
              error={error}
            />
            {helpEl}
            {errorEl}
          </fieldset>
        );
      }

      const exclusiveVal = question.exclusiveOption;
      return (
        <fieldset id={question.field} className="space-y-1">
          <legend className="block text-sm font-medium text-slate-700">
            {question.label}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </legend>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {(question.options ?? []).map((opt) => {
              const currentValue = Array.isArray(value) ? value : [];
              const isChecked = currentValue.includes(opt.value);
              return (
                <div key={opt.value}>
                  <label className="flex items-start gap-2.5 text-sm cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        let newValue: string[];
                        if (exclusiveVal && opt.value === exclusiveVal) {
                          newValue = e.target.checked ? [opt.value] : [];
                        } else if (exclusiveVal && e.target.checked) {
                          newValue = [
                            ...currentValue.filter((v: string) => v !== exclusiveVal),
                            opt.value,
                          ];
                        } else {
                          newValue = e.target.checked
                            ? [...currentValue, opt.value]
                            : currentValue.filter((v: string) => v !== opt.value);
                        }
                        handleChange(newValue);
                      }}
                      className="mt-0.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500/10"
                    />
                    <span className="text-slate-700 leading-snug">{opt.label}</span>
                  </label>
                  {opt.helpText && (
                    <p className="ml-7 text-xs text-slate-400 -mt-0.5 mb-1">{opt.helpText}</p>
                  )}
                </div>
              );
            })}
          </div>
          {helpEl}
          {errorEl}
        </fieldset>
      );
    }

    case 'boolean':
      return (
        <fieldset id={question.field} className="space-y-1">
          <legend className="block text-sm font-medium text-slate-700">
            {question.label}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </legend>
          <div className="flex gap-3">
            {[
              { label: 'Yes', val: true },
              { label: 'No', val: false },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => handleChange(opt.val)}
                className={`px-5 py-2 text-sm font-medium rounded-lg border transition-all
                  ${
                    value === opt.val
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {helpEl}
          {errorEl}
        </fieldset>
      );

    default:
      return null;
  }
}
