'use client';

import { useEffect, useState } from 'react';
import { useAiStore } from '@/lib/store/ai-store';

export function AiUnavailableToast() {
  const available = useAiStore((s) => s.available);
  const toastShown = useAiStore((s) => s.unavailableToastShown);
  const setToastShown = useAiStore((s) => s.setUnavailableToastShown);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!available && !toastShown) {
      setVisible(true);
      setToastShown(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [available, toastShown, setToastShown]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 text-sm text-slate-500 rounded-lg shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        AI assist unavailable
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-1 text-slate-300 hover:text-slate-500 text-base leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
