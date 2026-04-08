'use client';

interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface PillGroupProps<T extends string> {
  label: string;
  options: PillOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  /** Option value that is mutually exclusive with all others (e.g., "none"). */
  exclusiveValue?: T;
  error?: string;
}

/**
 * Multi-select pill toggle group. Each option is a rounded pill; selected
 * pills fill blue. Supports an optional "exclusive" value (e.g., "none of
 * these") that deselects all others when picked, and is itself deselected
 * by picking any other option.
 */
export function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  exclusiveValue,
  error,
}: PillGroupProps<T>) {
  const hasError = Boolean(error);

  const toggle = (picked: T) => {
    const isSelected = value.includes(picked);
    if (exclusiveValue && picked === exclusiveValue) {
      onChange(isSelected ? [] : [picked]);
      return;
    }
    if (isSelected) {
      onChange(value.filter((v) => v !== picked));
      return;
    }
    // Selecting any real option clears the exclusive option.
    const next = value.filter((v) => v !== exclusiveValue);
    onChange([...next, picked]);
  };

  return (
    <fieldset>
      <legend
        className={`mb-2.5 block scale-[0.78] origin-left text-[15px] transition-colors ${
          hasError ? 'text-red-500' : 'text-slate-500'
        }`}
      >
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={isSelected}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200
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
      {hasError && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </fieldset>
  );
}
