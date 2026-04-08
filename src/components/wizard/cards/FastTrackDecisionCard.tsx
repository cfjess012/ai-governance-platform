'use client';

interface FastTrackDecisionCardProps {
  onDecide: (optIn: boolean) => void;
  decision?: boolean;
}

/**
 * Standalone decision card shown when the user becomes eligible for
 * fast-track (lightweight intake). Skipping Section C (Portfolio Alignment).
 */
export function FastTrackDecisionCard({ onDecide, decision }: FastTrackDecisionCardProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Fast-track eligible
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          Skip the portfolio alignment section?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Based on your answers, this use case qualifies for our lightweight intake path. You can
          skip the final 8 portfolio questions and submit now. Governance will still review the case
          — you just won&apos;t be asked to complete strategic-value fields that don&apos;t apply to
          low-risk cases.
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => onDecide(true)}
          aria-pressed={decision === true}
          className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
            decision === true
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
              decision === true ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            A
          </span>
          <span className="flex-1 pt-0.5">
            <span className="block text-sm font-medium text-slate-800">
              Yes, skip Portfolio Alignment
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Fastest path. Recommended for low-risk, already-available tools.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDecide(false)}
          aria-pressed={decision === false}
          className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
            decision === false
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
              decision === false ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            B
          </span>
          <span className="flex-1 pt-0.5">
            <span className="block text-sm font-medium text-slate-800">
              No, I&apos;ll fill out the full intake
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Useful if you want the case captured in portfolio planning.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
