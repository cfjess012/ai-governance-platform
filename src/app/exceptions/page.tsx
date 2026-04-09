'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { daysUntilExpiry } from '@/lib/governance/exceptions';
import type { ExceptionStatus, GovernanceException } from '@/lib/governance/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useSessionStore } from '@/lib/store/session-store';

const STATUS_BADGES: Record<ExceptionStatus, string> = {
  active: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  revoked: 'bg-red-50 text-red-700 border-red-200',
};

const REASON_LABELS: Record<GovernanceException['reason'], string> = {
  business_critical: 'Business critical',
  regulatory_uncertainty: 'Regulatory uncertainty',
  technical_infeasibility: 'Technical infeasibility',
  temporary_workaround: 'Temporary workaround',
  inherited_risk: 'Inherited / grandfathered',
  other: 'Other',
};

export default function ExceptionRegisterPage() {
  const getAllExceptions = useInventoryStore((s) => s.getAllExceptions);
  const sweepExpired = useInventoryStore((s) => s.sweepExpired);
  const revokeException = useInventoryStore((s) => s.revokeException);
  const sessionUser = useSessionStore((s) => s.user);

  const [filter, setFilter] = useState<ExceptionStatus | 'all'>('active');

  // Sweep expired on mount so the register always shows accurate state
  useEffect(() => {
    sweepExpired();
  }, [sweepExpired]);

  const exceptions = getAllExceptions();
  const filtered = useMemo(() => {
    if (filter === 'all') return exceptions;
    return exceptions.filter((e) => e.status === filter);
  }, [exceptions, filter]);

  const counts = useMemo(
    () => ({
      active: exceptions.filter((e) => e.status === 'active').length,
      expired: exceptions.filter((e) => e.status === 'expired').length,
      revoked: exceptions.filter((e) => e.status === 'revoked').length,
    }),
    [exceptions],
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-slate-600">Exception Register</span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Exception Register</h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
          Audit-tracked deviations from policy. Every active exception is time-bound, tied to a
          named approver, and recorded with the business justification and compensating controls.
          This is the register a regulator or internal auditor will ask for first.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`text-left rounded-xl border p-4 transition-colors ${
            filter === 'active'
              ? 'border-amber-300 bg-amber-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Active
          </p>
          <p className="text-2xl font-bold text-amber-600 tabular-nums">{counts.active}</p>
          <p className="text-xs text-slate-400 mt-1">Time-bound, awaiting expiry or revocation</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter('expired')}
          className={`text-left rounded-xl border p-4 transition-colors ${
            filter === 'expired'
              ? 'border-slate-300 bg-slate-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Expired
          </p>
          <p className="text-2xl font-bold text-slate-600 tabular-nums">{counts.expired}</p>
          <p className="text-xs text-slate-400 mt-1">Past expiry — must renew or remediate</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter('revoked')}
          className={`text-left rounded-xl border p-4 transition-colors ${
            filter === 'revoked'
              ? 'border-red-300 bg-red-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Revoked
          </p>
          <p className="text-2xl font-bold text-red-600 tabular-nums">{counts.revoked}</p>
          <p className="text-xs text-slate-400 mt-1">Pulled by approver or remediated</p>
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          {filter === 'all'
            ? 'All exceptions'
            : `${filter[0].toUpperCase()}${filter.slice(1)} exceptions`}
          <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className="text-xs text-blue-600 hover:underline"
        >
          Show all
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">No exceptions in this view.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => {
            const days = e.status === 'active' ? daysUntilExpiry(e) : null;
            return (
              <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${STATUS_BADGES[e.status]}`}
                      >
                        {e.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{e.id}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{e.policyOrControl}</h3>
                    <Link
                      href={`/inventory/${e.useCaseId}`}
                      className="mt-0.5 inline-block text-xs text-blue-600 hover:underline"
                    >
                      {e.useCaseName}
                    </Link>
                  </div>
                  {e.status === 'active' && days !== null && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Expires
                      </p>
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          days < 0
                            ? 'text-red-600'
                            : days < 14
                              ? 'text-amber-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? 'today'
                            : `${days}d`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Reason
                    </p>
                    <p className="text-xs text-slate-700">{REASON_LABELS[e.reason]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Approver
                    </p>
                    <p className="text-xs text-slate-700">
                      {e.approvedBy ?? '—'}
                      {e.approvedByRole && (
                        <span className="text-slate-400"> ({e.approvedByRole})</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Justification
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{e.justification}</p>
                </div>

                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Compensating controls
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{e.compensatingControls}</p>
                </div>

                {e.status === 'revoked' && e.revocationReason && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-red-700">
                      <strong>Revoked:</strong> {e.revocationReason}{' '}
                      <span className="text-slate-400">
                        ({e.revokedBy} on {new Date(e.revokedAt ?? '').toLocaleDateString()})
                      </span>
                    </p>
                  </div>
                )}

                {e.status === 'active' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const reason = window.prompt('Reason for revocation:');
                        if (reason)
                          revokeException(
                            e.useCaseId,
                            e.id,
                            sessionUser?.name ?? 'Unknown',
                            reason,
                          );
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
