'use client';

import type { TextareaHTMLAttributes } from 'react';

interface FloatingTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'> {
  label: string;
  error?: string;
  max: number;
  /** Current character count (so the counter can color by proximity to max). */
  current: number;
}

/**
 * Floating-label textarea with a live character counter below the field.
 * The counter shifts color as the user approaches the max.
 */
export function FloatingTextarea({
  label,
  error,
  max,
  current,
  id,
  className,
  value,
  onChange,
  ...rest
}: FloatingTextareaProps) {
  const fieldId = id ?? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);
  const ratio = current / max;
  const counterClass =
    current > max
      ? 'text-red-500'
      : ratio > 0.9
        ? 'text-amber-500'
        : ratio > 0.75
          ? 'text-slate-500'
          : 'text-slate-400';

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative">
        <textarea
          {...rest}
          id={fieldId}
          value={value ?? ''}
          onChange={onChange}
          placeholder=" "
          rows={4}
          aria-invalid={hasError || undefined}
          aria-describedby={`${fieldId}-counter${hasError ? ` ${fieldId}-error` : ''}`}
          className={`peer block w-full resize-none appearance-none rounded-none border-0 border-b bg-transparent px-0 pt-6 pb-2 text-[15px] text-slate-900 outline-none transition-colors
            ${hasError ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'}`}
        />
        <label
          htmlFor={fieldId}
          className={`pointer-events-none absolute left-0 origin-left transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)]
            top-6 text-[15px] text-slate-500
            peer-focus:top-1 peer-focus:scale-[0.78] peer-focus:text-blue-600
            peer-[:not(:placeholder-shown)]:top-1
            peer-[:not(:placeholder-shown)]:scale-[0.78]
            peer-[:not(:placeholder-shown)]:text-slate-500
            ${hasError ? 'peer-focus:text-red-500' : ''}`}
        >
          {label}
        </label>
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)] peer-focus:scale-x-100
            ${hasError ? 'bg-red-400' : 'bg-blue-500'}`}
        />
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-xs text-red-500">
          {hasError && <span id={`${fieldId}-error`}>{error}</span>}
        </p>
        <p id={`${fieldId}-counter`} className={`shrink-0 text-xs tabular-nums ${counterClass}`}>
          {current} / {max}
        </p>
      </div>
    </div>
  );
}
