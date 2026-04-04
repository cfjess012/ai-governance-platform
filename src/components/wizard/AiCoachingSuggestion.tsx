'use client';

import type { ValueCoachResult } from '@/app/api/ai/analyze/route';

interface AiCoachingSuggestionProps {
  result: ValueCoachResult | null;
  loading: boolean;
  onUseSuggestion: (text: string) => void;
  onDismiss: () => void;
}

export function AiCoachingSuggestion({
  result,
  loading,
  onUseSuggestion,
  onDismiss,
}: AiCoachingSuggestionProps) {
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 px-1 py-1.5 text-xs text-slate-400">
        <div className="w-3 h-3 border-[1.5px] border-slate-300 border-t-transparent rounded-full animate-spin" />
        Thinking...
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 animate-fade-in">
      <p className="text-sm text-slate-700 leading-relaxed">{result.suggestion}</p>
      <p className="text-xs text-slate-400 mt-1.5">{result.reason}</p>
      <div className="flex gap-3 mt-2.5">
        <button
          type="button"
          onClick={() => onUseSuggestion(result.suggestion)}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
        >
          Use this
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
