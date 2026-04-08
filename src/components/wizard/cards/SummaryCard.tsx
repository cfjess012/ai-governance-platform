'use client';

import type { SummaryEntry } from '@/lib/wizard/card-deck';

interface SummaryCardProps {
  entries: SummaryEntry[];
  onEdit: (questionId: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

/**
 * Final card in the deck — shows every answer grouped by section and lets
 * the user jump back to edit any one of them (reverse flip back through
 * the deck), or submit the intake.
 */
export function SummaryCard({ entries, onEdit, onSubmit, isSubmitting }: SummaryCardProps) {
  const bySection = entries.reduce<Record<string, SummaryEntry[]>>((acc, e) => {
    const bucket = acc[e.section] ?? [];
    bucket.push(e);
    acc[e.section] = bucket;
    return acc;
  }, {});
  const sections = Object.keys(bySection);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Ready to submit
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Review your answers</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tap any row to jump back and edit it. Otherwise, submit below.
        </p>
      </div>

      <div className="max-h-[380px] space-y-5 overflow-y-auto pr-1">
        {sections.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            You haven&apos;t answered anything yet. Flip back to start.
          </p>
        )}

        {sections.map((section) => (
          <div key={section}>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section}
            </h3>
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {bySection[section].map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onEdit(entry.id)}
                  className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-slate-500">{entry.label}</dt>
                    <dd className="mt-0.5 break-words text-sm text-slate-800">
                      {entry.displayValue}
                    </dd>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs text-blue-500">Edit</span>
                </button>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || entries.length === 0}
        className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? 'Submitting…' : 'Submit intake'}
      </button>
    </div>
  );
}
