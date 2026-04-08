'use client';

import type { QuestionOption } from '@/config/questions';

interface CardChoiceListProps {
  options: QuestionOption[];
  value?: string;
  onSelect: (value: string) => void;
  /** When true, clicking a selected option deselects it. */
  allowDeselect?: boolean;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Lettered-badge choice list for single-select questions. Used on cards
 * where the underlying question type is 'select'. Each option is a full-width
 * button with an A/B/C/D badge on the left. Selected state highlights in blue.
 */
export function CardChoiceList({ options, value, onSelect, allowDeselect }: CardChoiceListProps) {
  return (
    <div className="space-y-2.5">
      {options.map((opt, i) => {
        const isSelected = value === opt.value;
        const letter = LETTERS[i] ?? String(i + 1);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (isSelected && allowDeselect) onSelect('');
              else onSelect(opt.value);
            }}
            aria-pressed={isSelected}
            className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all
              ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors
                ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}
            >
              {letter}
            </span>
            <span className="flex-1 pt-0.5">
              <span
                className={`block text-sm font-medium leading-snug ${
                  isSelected ? 'text-blue-900' : 'text-slate-800'
                }`}
              >
                {opt.label}
              </span>
              {opt.helpText && (
                <span className="mt-0.5 block text-xs text-slate-500">{opt.helpText}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
