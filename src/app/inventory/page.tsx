'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AirtableInventoryTable } from '@/components/inventory/AirtableInventoryTable';
import { Button } from '@/components/ui/Button';
import { type InherentRiskTier, TIER_DISPLAY } from '@/lib/risk/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import type { AIUseCaseStatus } from '@/types/inventory';

const statusLabels: Record<AIUseCaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  contact_required: 'Contact Required',
  triage_pending: 'Triage Pending',
  lightweight_review: 'Lightweight Review',
  assessment_required: 'Assessment Required',
  assessment_in_progress: 'Assessment In Progress',
  decision_pending: 'Decision Pending',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
  rejected: 'Rejected',
  in_production: 'In Production',
  decommissioned: 'Decommissioned',
};

export default function InventoryPage() {
  const useCases = useInventoryStore((s) => s.useCases);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = [...useCases];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (uc) =>
          uc.intake.useCaseName?.toLowerCase().includes(q) ||
          uc.intake.businessProblem?.toLowerCase().includes(q) ||
          uc.intake.businessArea?.toLowerCase().includes(q),
      );
    }

    if (filterRisk !== 'all') {
      result = result.filter((uc) => uc.inherentRisk?.tier === filterRisk);
    }

    if (filterStatus !== 'all') {
      result = result.filter((uc) => uc.status === filterStatus);
    }

    result.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortField) {
        case 'name':
          aVal = a.intake.useCaseName ?? '';
          bVal = b.intake.useCaseName ?? '';
          break;
        case 'riskTier': {
          // Sort by tier ordinal (numeric) so Low < Medium-Low < Medium < Medium-High < High
          const aOrd = a.inherentRisk ? TIER_DISPLAY[a.inherentRisk.tier].ordinal : 0;
          const bOrd = b.inherentRisk ? TIER_DISPLAY[b.inherentRisk.tier].ordinal : 0;
          return sortDir === 'asc' ? aOrd - bOrd : bOrd - aOrd;
        }
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [useCases, search, filterRisk, filterStatus, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const byRisk: Record<InherentRiskTier | 'pending', number> = {
      low: 0,
      medium_low: 0,
      medium: 0,
      medium_high: 0,
      high: 0,
      pending: 0,
    };
    const byStage: Record<string, number> = {};
    let pendingAssessment = 0;

    for (const uc of useCases) {
      const tier = uc.inherentRisk?.tier;
      if (tier && tier in byRisk) byRisk[tier]++;
      else byRisk.pending++;
      const stage = uc.intake.lifecycleStage ?? 'unknown';
      byStage[stage] = (byStage[stage] ?? 0) + 1;
      if (uc.status === 'assessment_required') pendingAssessment++;
    }

    return { byRisk, byStage, pendingAssessment, total: useCases.length };
  }, [useCases]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Use Case Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">{stats.total} use cases registered</p>
        </div>
        <Link href="/intake">
          <Button>New Intake</Button>
        </Link>
      </div>

      {/* Stats cards — 5 inherent risk tiers */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {(['low', 'medium_low', 'medium', 'medium_high', 'high'] as InherentRiskTier[]).map(
          (tier) => {
            const display = TIER_DISPLAY[tier];
            return (
              <div key={tier} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {display.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.byRisk[tier]}</p>
              </div>
            );
          },
        )}
      </div>

      {stats.pendingAssessment > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">
            {stats.pendingAssessment} use case{stats.pendingAssessment > 1 ? 's' : ''} pending risk
            assessment
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, purpose, or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#00539B]/20 focus:border-[#00539B]"
        />
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00539B]/20"
        >
          <option value="all">All Inherent Tiers</option>
          {(['low', 'medium_low', 'medium', 'medium_high', 'high'] as InherentRiskTier[]).map(
            (tier) => (
              <option key={tier} value={tier}>
                {TIER_DISPLAY[tier].label}
              </option>
            ),
          )}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00539B]/20"
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusLabels).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Airtable-style table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <AirtableInventoryTable
          useCases={filtered}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {useCases.length === 0 ? (
              <div>
                <p className="mb-2">No use cases registered yet.</p>
                <Link href="/intake">
                  <Button size="sm">Submit Your First Intake</Button>
                </Link>
              </div>
            ) : (
              <p>No use cases match your filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
