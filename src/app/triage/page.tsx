'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TIER_DISPLAY } from '@/lib/risk/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { caseAgeInDays, isAwaitingTriage } from '@/lib/triage/triage-actions';
import type { AIUseCase } from '@/types/inventory';

const PENDING_BADGE = 'bg-slate-50 text-slate-600 border-slate-200';

const euAiActColors: Record<string, string> = {
  prohibited: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  limited: 'bg-amber-50 text-amber-700',
  minimal: 'bg-slate-50 text-slate-600',
  pending: 'bg-slate-50 text-slate-600',
};

function ageBadge(days: number) {
  if (days >= 5) return { label: `${days}d`, classes: 'bg-red-50 text-red-700 border-red-200' };
  if (days >= 3)
    return { label: `${days}d`, classes: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `${days}d`, classes: 'bg-slate-50 text-slate-500 border-slate-200' };
}

function urgencyLabel(useCase: AIUseCase): string | null {
  const urgency = (useCase.intake as Record<string, unknown>).reviewUrgency as string | undefined;
  if (urgency === 'time_sensitive') return 'Time-sensitive';
  if (urgency === 'blocking_deployment') return 'Blocking deployment';
  return null;
}

type RiskFilter = 'all' | 'high' | 'medium' | 'low';

export default function TriagePage() {
  const useCases = useInventoryStore((s) => s.useCases);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  const triageQueue = useMemo(
    () =>
      useCases
        .filter(isAwaitingTriage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [useCases],
  );

  const filtered = useMemo(() => {
    if (riskFilter === 'all') return triageQueue;
    return triageQueue.filter((uc) => {
      const tier = uc.inherentRisk?.tier;
      if (!tier) return false;
      if (riskFilter === 'high') return tier === 'high' || tier === 'medium_high';
      if (riskFilter === 'medium') return tier === 'medium';
      // low: includes both low and medium_low
      return tier === 'low' || tier === 'medium_low';
    });
  }, [triageQueue, riskFilter]);

  const stats = useMemo(() => {
    const total = triageQueue.length;
    const overdue = triageQueue.filter((uc) => caseAgeInDays(uc) >= 3).length;
    const urgent = triageQueue.filter((uc) => urgencyLabel(uc) !== null).length;
    const high = triageQueue.filter((uc) => {
      const t = uc.inherentRisk?.tier;
      return t === 'high' || t === 'medium_high';
    }).length;
    return { total, overdue, urgent, high };
  }, [triageQueue]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Triage Queue</h1>
        <p className="text-sm text-slate-500">
          Review incoming AI use case submissions, confirm risk classification, and assign
          governance path.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400 mb-1">Awaiting triage</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400 mb-1">High-risk</p>
          <p className="text-2xl font-bold text-orange-600 tabular-nums">{stats.high}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400 mb-1">Time-sensitive</p>
          <p className="text-2xl font-bold text-blue-600 tabular-nums">{stats.urgent}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400 mb-1">Overdue (3+ days)</p>
          <p className="text-2xl font-bold text-red-600 tabular-nums">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
        {(['all', 'high', 'medium', 'low'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setRiskFilter(f)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              riskFilter === f
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? `All (${triageQueue.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900 mb-1">No cases awaiting triage</h3>
          <p className="text-xs text-slate-500">
            {triageQueue.length === 0
              ? 'When new use cases are submitted, they will appear here for governance review.'
              : 'Adjust the filter to see more cases.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">
                  Use case
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">
                  Risk tier
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">
                  EU AI Act
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">
                  Submitted by
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Age</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Flags</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((uc) => {
                const days = caseAgeInDays(uc);
                const age = ageBadge(days);
                const urgency = urgencyLabel(uc);
                return (
                  <tr key={uc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/triage/${uc.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-blue-600"
                      >
                        {uc.intake.useCaseName}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {uc.intake.businessArea} · {(() => {
                          const aiType = uc.intake.aiType;
                          if (!aiType) return '';
                          const arr = Array.isArray(aiType) ? aiType : [aiType as string];
                          return arr.map((t) => t.replace(/_/g, ' ')).join(', ');
                        })()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {uc.inherentRisk ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TIER_DISPLAY[uc.inherentRisk.tier].badgeClasses}`}
                        >
                          {TIER_DISPLAY[uc.inherentRisk.tier].label}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PENDING_BADGE}`}
                        >
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${euAiActColors[uc.classification.euAiActTier] ?? euAiActColors.pending}`}
                      >
                        {uc.classification.euAiActTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{uc.submittedBy}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${age.classes}`}
                      >
                        {age.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {urgency && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          <svg
                            aria-hidden="true"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {urgency}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/triage/${uc.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                      >
                        Triage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
