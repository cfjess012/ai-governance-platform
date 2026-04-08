'use client';

import type { SelectHTMLAttributes } from 'react';

interface FloatingSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

/**
 * Floating-label select. The label sits pre-floated above the control
 * (not animated upward) since native selects don't have a meaningful
 * empty-state placeholder to hide behind. The underline bar still
 * animates on focus to match the rest of the form.
 */
export function FloatingSelect({
  label,
  error,
  options,
  id,
  className,
  value,
  onChange,
  ...rest
}: FloatingSelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);
  const isEmpty = !value;

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative">
        <label
          htmlFor={selectId}
          className={`pointer-events-none absolute left-0 top-1 origin-left scale-[0.78] transition-colors
            ${hasError ? 'text-red-500' : 'text-slate-500'}`}
        >
          {label}
        </label>
        <select
          {...rest}
          id={selectId}
          value={value ?? ''}
          onChange={onChange}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${selectId}-error` : undefined}
          className={`peer block w-full cursor-pointer appearance-none rounded-none border-0 border-b bg-transparent px-0 pt-6 pb-2 text-[15px] outline-none transition-colors
            ${isEmpty ? 'text-slate-400' : 'text-slate-900'}
            ${hasError ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'}`}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-6 text-slate-400 transition-colors peer-focus:text-blue-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <title>Chevron</title>
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        {/* Animated underline bar */}
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0
            transition-transform duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)]
            peer-focus:scale-x-100
            ${hasError ? 'bg-red-400' : 'bg-blue-500'}`}
        />
      </div>
      {hasError && (
        <p id={`${selectId}-error`} className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
