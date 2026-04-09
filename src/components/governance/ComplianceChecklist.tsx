'use client';

import type { ControlCompliance, ControlStatus } from '@/lib/governance/evidence-completeness';

const STATUS_STYLES: Record<ControlStatus, { badge: string; label: string; icon: string }> = {
  satisfied: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Satisfied',
    icon: '✓',
  },
  partial: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Partial',
    icon: '◐',
  },
  expired: {
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    label: 'Expired',
    icon: '⏰',
  },
  missing: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    label: 'Missing',
    icon: '✗',
  },
};

interface ComplianceChecklistProps {
  controls: ControlCompliance[];
  completenessPct: number;
}

/**
 * The compliance checklist — the operationalization view.
 *
 * For each control derived from the use case's applicable frameworks,
 * shows the requirement, citation, evidence status, and what evidence
 * (if any) currently satisfies it. This is the difference between
 * "we tag relevant frameworks" and "here is exactly what you owe and
 * whether you have it."
 */
export function ComplianceChecklist({ controls, completenessPct }: ComplianceChecklistProps) {
  if (controls.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
        <p className="text-sm text-slate-500">
          No applicable controls — this case did not trigger any framework requirements.
        </p>
      </div>
    );
  }

  // Group controls by framework for display
  const byFramework: Record<string, ControlCompliance[]> = {};
  for (const c of controls) {
    if (!byFramework[c.control.framework]) byFramework[c.control.framework] = [];
    byFramework[c.control.framework].push(c);
  }

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900">Compliance Completeness</h3>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{completenessPct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              completenessPct >= 80
                ? 'bg-emerald-500'
                : completenessPct >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${completenessPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Percentage of mandatory controls with attested evidence on file.
        </p>
      </div>

      {/* Per-framework groups */}
      {Object.entries(byFramework).map(([framework, items]) => (
        <div key={framework}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {framework} <span className="text-slate-400">({items.length})</span>
          </h3>
          <ul className="space-y-2">
            {items.map((item) => {
              const style = STATUS_STYLES[item.status];
              return (
                <li
                  key={item.control.id}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-500">
                          {item.control.citation}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {item.control.title}
                        </h4>
                        {item.control.severity === 'recommended' && (
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            recommended
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {item.control.requirement}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span>
                          <strong className="text-slate-600">Owner:</strong>{' '}
                          {item.control.responsibleRole.replace(/_/g, ' ')}
                        </span>
                        <span>·</span>
                        <span>
                          <strong className="text-slate-600">Refresh:</strong>{' '}
                          {item.control.refreshFrequency.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {item.latestEvidence && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          Latest:{' '}
                          <strong className="text-slate-700">{item.latestEvidence.title}</strong> (
                          {new Date(item.latestEvidence.uploadedAt).toLocaleDateString()})
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${style.badge}`}
                    >
                      <span aria-hidden>{style.icon}</span>
                      {style.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
