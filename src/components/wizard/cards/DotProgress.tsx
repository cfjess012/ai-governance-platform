'use client';

interface DotProgressProps {
  total: number;
  current: number; // 0-based index of the active card
  label?: string;
}

/**
 * Dot-style progress indicator. Three visual states per dot:
 *   - done:   index < current   (filled blue, slightly smaller)
 *   - active: index === current (filled blue, scaled up)
 *   - pending: index > current  (outlined gray)
 */
export function DotProgress({ total, current, label }: DotProgressProps) {
  const safeTotal = Math.max(total, 1);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={safeTotal}
      >
        {Array.from({ length: safeTotal }, (_, i) => i).map((i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'pending';
          return (
            <span
              key={`dot-${i}`}
              aria-hidden
              className={
                state === 'active'
                  ? 'h-2 w-6 rounded-full bg-blue-500 transition-all duration-300'
                  : state === 'done'
                    ? 'h-2 w-2 rounded-full bg-blue-400 transition-all duration-300'
                    : 'h-2 w-2 rounded-full border border-slate-300 bg-white transition-all duration-300'
              }
            />
          );
        })}
      </div>
      {label && <div className="text-xs text-slate-500">{label}</div>}
    </div>
  );
}
