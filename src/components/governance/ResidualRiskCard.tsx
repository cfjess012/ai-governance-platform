'use client';

import type { ResidualRiskResult } from '@/lib/governance/types';
import { TIER_DISPLAY } from '@/lib/risk/types';

interface ResidualRiskCardProps {
  result: ResidualRiskResult;
}

/**
 * Side-by-side display of inherent vs. residual risk with a per-mitigation
 * breakdown of the control credit applied. This is the methodological
 * answer to "controls don't reduce risk in the existing scoring."
 */
export function ResidualRiskCard({ result }: ResidualRiskCardProps) {
  const inherent = TIER_DISPLAY[result.inherentTier];
  const residual = TIER_DISPLAY[result.residualTier];
  const dropped = inherent.ordinal - residual.ordinal;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Inherent vs. Residual Risk</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Inherent risk is the risk before any mitigations. Residual risk reflects credit earned
          from collected evidence and assessment-stated controls.
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Inherent
          </p>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${inherent.badgeClasses}`}
          >
            {inherent.label}
          </span>
          <p className="mt-2 text-xs text-slate-500 leading-snug">Before mitigations</p>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Residual
          </p>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${residual.badgeClasses}`}
          >
            {residual.label}
          </span>
          <p className="mt-2 text-xs text-slate-500 leading-snug">
            {dropped === 0 ? (
              <>No reduction</>
            ) : dropped === 1 ? (
              <>↓ 1 tier from controls</>
            ) : (
              <>↓ {dropped} tiers from controls</>
            )}
          </p>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-700 leading-relaxed">{result.explanation}</p>
      </div>

      {/* Per-mitigation breakdown */}
      <div className="px-5 py-4 border-t border-slate-200">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Mitigation Credit Earned
        </h4>
        <ul className="space-y-2">
          {result.mitigationCredits.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-700">{m.label}</p>
                <p className="text-slate-500 leading-snug">{m.evidenceBasis}</p>
              </div>
              <span
                className={`tabular-nums font-semibold whitespace-nowrap ${
                  m.credit >= 0.8
                    ? 'text-emerald-600'
                    : m.credit >= 0.4
                      ? 'text-amber-600'
                      : 'text-slate-400'
                }`}
              >
                {m.credit.toFixed(1)} / 1.0
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Total credit applied
          </span>
          <span className="text-xs font-bold text-slate-900 tabular-nums">
            {result.controlCreditApplied.toFixed(2)} / {result.controlCreditMax.toFixed(2)} tier
            {result.controlCreditMax === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
