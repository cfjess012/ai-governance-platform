'use client';

import { useState } from 'react';
import type { BusinessPurposeResult } from '@/app/api/ai/analyze/route';
import { SparkleIcon } from './SparkleIcon';

interface AiSuggestionsCardProps {
  result: BusinessPurposeResult | null;
  loading: boolean;
  onUseBusinessArea: (value: string) => void;
}

const BUSINESS_AREA_MAP: Record<string, string> = {
  actuarial: 'actuarial',
  claims: 'claims',
  compliance: 'compliance',
  'corporate services': 'corporate_services',
  'customer experience': 'customer_experience',
  'data & analytics': 'data_analytics',
  'data analytics': 'data_analytics',
  finance: 'finance',
  'human resources': 'hr',
  hr: 'hr',
  investments: 'investments',
  'information technology': 'it',
  it: 'it',
  legal: 'legal',
  marketing: 'marketing',
  operations: 'operations',
  product: 'product',
  'risk management': 'risk_management',
  risk: 'risk_management',
  sales: 'sales',
  underwriting: 'underwriting',
};

function mapBusinessArea(suggested: string): string | null {
  const lower = suggested.toLowerCase().trim();
  if (BUSINESS_AREA_MAP[lower]) return BUSINESS_AREA_MAP[lower];
  for (const [key, value] of Object.entries(BUSINESS_AREA_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return null;
}

export function AiSuggestionsCard({ result, loading, onUseBusinessArea }: AiSuggestionsCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 px-1 py-2 text-xs text-slate-400">
        <div className="w-3 h-3 border-[1.5px] border-slate-300 border-t-transparent rounded-full animate-spin" />
        Analyzing...
      </div>
    );
  }

  if (!result) return null;

  const mappedArea = result.suggestedBusinessArea
    ? mapBusinessArea(result.suggestedBusinessArea)
    : null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white animate-fade-in">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50/50 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <SparkleIcon />
          AI Analysis
        </span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-3 border-t border-slate-100">
          {result.riskSignals.length > 0 && (
            <div className="pt-3">
              <p className="text-xs text-slate-400 mb-1.5">Risk signals</p>
              <ul className="space-y-1">
                {result.riskSignals.map((signal) => (
                  <li key={signal} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-slate-300 mt-px">&bull;</span>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestedBusinessArea && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-500">
                Business area:{' '}
                <span className="text-slate-700">{result.suggestedBusinessArea}</span>
              </p>
              {mappedArea && (
                <button
                  type="button"
                  onClick={() => onUseBusinessArea(mappedArea)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  Apply
                </button>
              )}
            </div>
          )}

          {result.suggestedEuAiActCategory && (
            <p className="text-xs text-slate-500">
              EU AI Act: <span className="text-slate-700">{result.suggestedEuAiActCategory}</span>
            </p>
          )}

          {result.suggestedValueLevers.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-1.5">Suggested value levers</p>
              <ul className="space-y-1">
                {result.suggestedValueLevers.map((lever) => (
                  <li key={lever} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-slate-300 mt-px">&bull;</span>
                    {lever}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
