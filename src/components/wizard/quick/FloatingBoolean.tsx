'use client';

interface FloatingBooleanProps {
  label: string;
  value?: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  hint?: string;
}

/**
 * Floating-label Yes/No toggle. Matches the rest of the floating form —
 * label sits pre-floated above the control, and the two choices are
 * rounded pills that fill blue when selected.
 */
export function FloatingBoolean({ label, value, onChange, error, hint }: FloatingBooleanProps) {
  const hasError = Boolean(error);
  return (
    <fieldset>
      <legend
        className={`mb-2.5 block origin-left scale-[0.78] text-[15px] transition-colors ${
          hasError ? 'text-red-500' : 'text-slate-500'
        }`}
      >
        {label}
      </legend>
      <div className="flex gap-2">
        {[
          { label: 'Yes', val: true },
          { label: 'No', val: false },
        ].map((opt) => {
          const isSelected = value === opt.val;
          return (
            <button
              key={String(opt.val)}
              type="button"
              onClick={() => onChange(opt.val)}
              aria-pressed={isSelected}
              className={`rounded-full border px-6 py-1.5 text-xs font-medium transition-all duration-200
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {hasError ? (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </fieldset>
  );
}
