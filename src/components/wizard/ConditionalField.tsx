'use client';

import { type ReactNode, useEffect, useRef } from 'react';

interface ConditionalFieldProps {
  visible: boolean;
  children: ReactNode;
}

/**
 * Wraps a form field that may appear/disappear based on parent answers.
 * When transitioning from hidden→visible (after the initial mount), the field
 * scrolls into view and briefly pulses to draw attention. This prevents users
 * from missing newly-revealed conditional questions.
 */
export function ConditionalField({ visible, children }: ConditionalFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const wasVisibleRef = useRef(visible);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Skip the first render — only scroll when visibility actually changes
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      wasVisibleRef.current = visible;
      return;
    }

    if (!wasVisibleRef.current && visible && ref.current) {
      // Field just appeared — scroll into view and pulse
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.current.classList.add('animate-pulse-once');
      const timer = setTimeout(() => {
        ref.current?.classList.remove('animate-pulse-once');
      }, 1500);
      wasVisibleRef.current = visible;
      return () => clearTimeout(timer);
    }

    wasVisibleRef.current = visible;
  }, [visible]);

  if (!visible) return null;
  return (
    <div ref={ref} className="animate-fade-in">
      {children}
    </div>
  );
}
