'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useInventoryStore } from '@/lib/store/inventory-store';
import type { AIUseCase, AIUseCaseStatus } from '@/types/inventory';

const statusLabels: Record<AIUseCaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
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

const statusColors: Record<AIUseCaseStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  triage_pending: 'bg-amber-100 text-amber-700',
  lightweight_review: 'bg-cyan-100 text-cyan-700',
  assessment_required: 'bg-orange-100 text-orange-700',
  assessment_in_progress: 'bg-purple-100 text-purple-700',
  decision_pending: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-green-100 text-green-700',
  changes_requested: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  in_production: 'bg-emerald-100 text-emerald-700',
  decommissioned: 'bg-slate-100 text-slate-500',
};

const riskTierColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
};

function RiskBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${riskTierColors[tier] ?? riskTierColors.pending}`}
    >
      {tier === 'pending' ? 'Pending' : tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function UseCaseRow({ useCase }: { useCase: AIUseCase }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/inventory/${useCase.id}`}
          className="text-sm font-medium text-[#00539B] hover:underline"
        >
          {useCase.intake.useCaseName}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {useCase.intake.aiType?.replace('_', ' ')}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {useCase.intake.lifecycleStage?.replace('_', ' ')}
      </td>
      <td className="px-4 py-3">
        <RiskBadge tier={useCase.classification.riskTier} />
      </td>
      <td className="px-4 py-3">
        <RiskBadge tier={useCase.classification.euAiActTier} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{useCase.intake.useCaseOwner}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{useCase.intake.businessArea}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[useCase.status]}`}
        >
          {statusLabels[useCase.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {new Date(useCase.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

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
      result = result.filter((uc) => uc.classification.riskTier === filterRisk);
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
        case 'riskTier':
          aVal = a.classification.riskTier;
          bVal = b.classification.riskTier;
          break;
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
    const byRisk = { low: 0, medium: 0, high: 0, critical: 0, pending: 0 };
    const byStage: Record<string, number> = {};
    let pendingAssessment = 0;

    for (const uc of useCases) {
      const tier = uc.classification.riskTier;
      if (tier in byRisk) byRisk[tier as keyof typeof byRisk]++;
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(stats.byRisk).map(([tier, count]) => (
          <div key={tier} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {tier} Risk
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
          </div>
        ))}
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
          <option value="all">All Risk Tiers</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
          <option value="pending">Pending</option>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                  onClick={() => handleSort('name')}
                >
                  Name {sortField === 'name' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  AI Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Lifecycle
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                  onClick={() => handleSort('riskTier')}
                >
                  Risk Tier {sortField === 'riskTier' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  EU AI Act
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Business Area
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                  onClick={() => handleSort('createdAt')}
                >
                  Submitted {sortField === 'createdAt' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((uc) => (
                <UseCaseRow key={uc.id} useCase={uc} />
              ))}
            </tbody>
          </table>
        </div>
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
