'use client';

import { useState } from 'react';
import type { QuestionDefinition } from '@/config/questions';

interface QuestionRendererProps {
  question: QuestionDefinition;
  value?: unknown;
  error?: string;
  onChange?: (field: string, value: unknown) => void;
}

function WhyTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-[#00539B] hover:text-[#003d73] font-medium flex items-center gap-1 transition-colors"
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Why are we asking this?
      </button>
      {open && (
        <p className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-2 border border-slate-100 animate-fade-in">
          {text}
        </p>
      )}
    </div>
  );
}

export function QuestionRenderer({ question, value, error, onChange }: QuestionRendererProps) {
  const handleChange = (newValue: unknown) => {
    onChange?.(question.field, newValue);
  };

  const labelEl = (
    <label htmlFor={question.field} className="block text-sm font-medium text-slate-800">
      {question.label}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const helpEl = question.helpText && !error && (
    <p className="text-xs text-slate-500">{question.helpText}</p>
  );

  const errorEl = error && <p className="text-xs text-red-600">{error}</p>;

  const whyEl = <WhyTooltip text={question.whyWeAsk} />;

  const inputClasses = `block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-[#00539B]/20 focus:border-[#00539B]
    ${error ? 'border-red-300 text-red-900 bg-red-50/50' : 'border-slate-200 text-slate-900 bg-white hover:border-slate-300'}`;

  switch (question.type) {
    case 'text':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <input
            id={question.field}
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClasses}
            placeholder={question.helpText}
          />
          {helpEl}
          {errorEl}
          {whyEl}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <textarea
            id={question.field}
            rows={4}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(e.target.value)}
            className={inputClasses}
            placeholder={question.helpText}
          />
          {helpEl}
          {errorEl}
          {whyEl}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
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
          {whyEl}
        </div>
      );

    case 'multiselect':
      return (
        <fieldset className="space-y-1.5">
          <legend className="block text-sm font-medium text-slate-800">
            {question.label}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </legend>
          <div className="space-y-1.5 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white">
            {(question.options ?? []).map((opt) => {
              const currentValue = Array.isArray(value) ? value : [];
              const isChecked = currentValue.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-start gap-2.5 text-sm cursor-pointer py-1 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newValue = e.target.checked
                        ? [...currentValue, opt.value]
                        : currentValue.filter((v: string) => v !== opt.value);
                      handleChange(newValue);
                    }}
                    className="mt-0.5 rounded border-slate-300 text-[#00539B] focus:ring-[#00539B]/20"
                  />
                  <span className="text-slate-700 leading-snug">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {helpEl}
          {errorEl}
          {whyEl}
        </fieldset>
      );

    case 'boolean':
      return (
        <fieldset className="space-y-1.5">
          <legend className="block text-sm font-medium text-slate-800">
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
                      ? 'bg-[#00539B] text-white border-[#00539B] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {helpEl}
          {errorEl}
          {whyEl}
        </fieldset>
      );

    default:
      return null;
  }
}
