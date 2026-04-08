'use client';

import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  /** Full text to type out. */
  text: string;
  /** Milliseconds per character. */
  speed?: number;
  /** Milliseconds to wait before typing starts. */
  delay?: number;
  /** When true, renders in a monospace font. */
  mono?: boolean;
  className?: string;
}

/**
 * Types `text` one character at a time with a blinking cursor, then
 * removes the cursor when complete.
 *
 * Layout-shift safe: a full-text copy is rendered invisibly to reserve
 * the final dimensions, and the growing substring is overlaid on top
 * via absolute positioning. Because the overlay fills the invisible
 * copy's box exactly (`inset-0`), text wrapping is identical and nothing
 * below the component can jump when typing starts, progresses, or ends.
 *
 * Font and color are inherited from the parent element, so the component
 * is transparent to whatever heading or label it's dropped inside — the
 * only thing `mono` does is add `font-mono` locally.
 */
export function TypewriterText({
  text,
  speed = 55,
  delay = 0,
  mono = false,
  className = '',
}: TypewriterTextProps) {
  const [state, setState] = useState<'idle' | 'typing' | 'done'>('idle');
  const [visibleCount, setVisibleCount] = useState(0);

  // Kick off (or restart) the animation whenever text/delay changes.
  useEffect(() => {
    setState('idle');
    setVisibleCount(0);
    const startTimer = window.setTimeout(() => {
      setState(text.length === 0 ? 'done' : 'typing');
    }, delay);
    return () => window.clearTimeout(startTimer);
  }, [text, delay]);

  // Type one character at a time while in the "typing" state.
  useEffect(() => {
    if (state !== 'typing') return;
    if (visibleCount >= text.length) {
      setState('done');
      return;
    }
    const t = window.setTimeout(() => {
      setVisibleCount((n) => n + 1);
    }, speed);
    return () => window.clearTimeout(t);
  }, [state, visibleCount, text.length, speed]);

  const showCursor = state === 'typing';
  const displayed = text.slice(0, visibleCount);
  const fontClass = mono ? 'font-mono' : '';

  return (
    <span className={`relative inline-block ${fontClass} ${className}`}>
      {/* Screen readers announce the full text immediately — they don't
          need to wait for the typewriter animation to play out. */}
      <span className="sr-only">{text}</span>
      {/* Invisible sizer — reserves the final text's dimensions so there's
          no layout shift when characters start appearing. Hidden from
          screen readers because the sr-only copy above already carries the
          accessible text. */}
      <span aria-hidden="true" className="invisible whitespace-pre-wrap">
        {text}
      </span>
      {/* Visible overlay — positioned to fill the sizer exactly so wrapping
          matches. Purely decorative, so aria-hidden. */}
      <span aria-hidden="true" className="absolute inset-0 whitespace-pre-wrap">
        {displayed}
        {showCursor && (
          <span
            className="typewriter-cursor ml-[1px] inline-block w-[0.09em] align-text-bottom bg-current"
            style={{ height: '1em' }}
          />
        )}
      </span>
    </span>
  );
}
