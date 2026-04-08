'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface FloatingFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** When true, forces the label into the floated (shrunk) position even if empty. */
  forceFloat?: boolean;
}

/**
 * Floating-label text input.
 *
 * Technique:
 *   - placeholder=" " makes :placeholder-shown match iff the field is empty
 *   - the <label> is absolute-positioned inside the field, and uses peer
 *     variants to detect empty/focused state
 *   - an animated blue underline bar scales in from 0 → 100% width on focus
 *
 * All motion uses the same cubic-bezier easing for a cohesive feel.
 */
export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(
  function FloatingField(
    { label, error, hint, forceFloat, id, className, onChange, value, ...rest },
    ref,
  ) {
    const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = Boolean(error);

    return (
      <div className={`relative ${className ?? ''}`}>
        <div className="relative">
          <input
            {...rest}
            ref={ref}
            id={inputId}
            value={value ?? ''}
            onChange={onChange}
            placeholder=" "
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={`peer block w-full appearance-none rounded-none border-0 border-b bg-transparent px-0 pt-6 pb-2 text-[15px] text-slate-900 outline-none transition-colors placeholder-shown:text-slate-900
            ${hasError ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'}`}
          />
          <label
            htmlFor={inputId}
            className={`pointer-events-none absolute left-0 origin-left transition-all duration-300
            ease-[cubic-bezier(0.2,0.9,0.3,1)]
            ${forceFloat ? 'top-1 scale-[0.78] text-slate-500' : 'top-6 text-[15px] text-slate-500'}
            peer-focus:top-1 peer-focus:scale-[0.78] peer-focus:text-blue-600
            peer-[:not(:placeholder-shown)]:top-1
            peer-[:not(:placeholder-shown)]:scale-[0.78]
            peer-[:not(:placeholder-shown)]:text-slate-500
            ${hasError ? 'peer-focus:text-red-500' : ''}`}
          >
            {label}
          </label>
          {/* Animated underline bar — scales in on focus */}
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0
            transition-transform duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)]
            peer-focus:scale-x-100
            ${hasError ? 'bg-red-400' : 'bg-blue-500'}`}
          />
        </div>
        {hasError ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-400">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
