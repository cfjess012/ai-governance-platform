'use client';

import type { ReactNode } from 'react';

interface ConditionalFieldProps {
  visible: boolean;
  children: ReactNode;
}

export function ConditionalField({ visible, children }: ConditionalFieldProps) {
  if (!visible) return null;
  return <div className="animate-fade-in">{children}</div>;
}
