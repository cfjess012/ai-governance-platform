'use client';

import { useAiStore } from '@/lib/store/ai-store';

export function AiToggle() {
  const enabled = useAiStore((s) => s.enabled);
  const setEnabled = useAiStore((s) => s.setEnabled);

  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-[13px] text-slate-600">AI Assist</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-[20px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </label>
  );
}
