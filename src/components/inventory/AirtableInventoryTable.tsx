'use client';

import Link from 'next/link';
import { parseOwner, toTitleCase } from '@/lib/inventory/format';
import type { InherentRiskTier } from '@/lib/risk/types';
import type { AIUseCase, AIUseCaseStatus } from '@/types/inventory';

// ─────────────────────────────────────────────────────────────────────────────
// Color palettes — kept local to the table so changes here don't ripple
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inherent-tier badge palette per the spec:
 *   High → red, Medium-High → amber, Medium → blue, Medium-Low → teal, Low → green
 *
 * Deliberately overrides the existing TIER_DISPLAY.badgeClasses (which uses
 * a different scale) — this table sets its own colors per the spec.
 */
const TIER_BADGE: Record<InherentRiskTier | 'pending', string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium_high: 'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  medium_low: 'bg-teal-50 text-teal-700 border-teal-200',
  low: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
};

const TIER_LABEL: Record<InherentRiskTier | 'pending', string> = {
  high: 'High',
  medium_high: 'Medium-High',
  medium: 'Medium',
  medium_low: 'Medium-Low',
  low: 'Low',
  pending: 'Pending',
};

/**
 * EU AI Act tier → uses the same palette as inherent tier per the spec.
 *   prohibited / high → red,  limited → amber,  minimal → green,  pending → neutral.
 */
const EU_BADGE: Record<string, string> = {
  prohibited: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  limited: 'bg-amber-50 text-amber-700 border-amber-200',
  minimal: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
};

const EU_LABEL: Record<string, string> = {
  prohibited: 'Prohibited',
  high: 'High',
  limited: 'Limited',
  minimal: 'Minimal',
  pending: 'Pending',
};

/**
 * Status badge palette. Spec calls out three explicitly:
 *   Submitted → blue, Assessment Required → amber, Draft → neutral.
 * The other statuses use sensible matching colors.
 */
const STATUS_BADGE: Record<AIUseCaseStatus, string> = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  contact_required: 'bg-red-50 text-red-700 border-red-200',
  triage_pending: 'bg-amber-50 text-amber-700 border-amber-200',
  lightweight_review: 'bg-teal-50 text-teal-700 border-teal-200',
  assessment_required: 'bg-amber-50 text-amber-700 border-amber-200',
  assessment_in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  decision_pending: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  changes_requested: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  in_production: 'bg-green-50 text-green-700 border-green-200',
  decommissioned: 'bg-slate-50 text-slate-500 border-slate-200',
};

const STATUS_LABEL: Record<AIUseCaseStatus, string> = {
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

// ─────────────────────────────────────────────────────────────────────────────
// Risk score dots — 5 squares, filled per tier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-tier dot configuration: how many filled, and what color.
 * Spec:
 *   High        → 4 red
 *   Medium-High → 3 amber
 *   Medium      → 2 blue
 *   Medium-Low  → 1 teal
 *   Low         → 1 green
 */
const DOT_CONFIG: Record<InherentRiskTier, { filled: number; color: string }> = {
  high: { filled: 4, color: 'bg-red-500' },
  medium_high: { filled: 3, color: 'bg-amber-500' },
  medium: { filled: 2, color: 'bg-blue-500' },
  medium_low: { filled: 1, color: 'bg-teal-500' },
  low: { filled: 1, color: 'bg-green-500' },
};

function RiskScoreDots({ tier }: { tier: InherentRiskTier | undefined }) {
  const config = tier ? DOT_CONFIG[tier] : null;
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Risk score: ${tier ? TIER_LABEL[tier] : 'Pending'}`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = config !== null && i < config.filled;
        return (
          <span
            key={`dot-${i}`}
            className={`block h-2.5 w-2.5 rounded-[2px] ${
              filled ? config.color : 'border border-slate-300 bg-transparent'
            }`}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner avatar
// ─────────────────────────────────────────────────────────────────────────────

function OwnerCell({ owner }: { owner: string | undefined }) {
  const parsed = parseOwner(owner);
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700"
        title={parsed.fullName || 'Unknown'}
      >
        {parsed.initials}
      </span>
      <span className="text-sm text-slate-700">{parsed.displayName}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expand button — small square with an arrow icon, navigates to detail view
// ─────────────────────────────────────────────────────────────────────────────

function ExpandButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={`Open ${label}`}
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-slate-300 bg-white text-slate-500 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-2.5 w-2.5"
        aria-hidden
      >
        <title>Open detail view</title>
        <path d="M3 7v2h2M9 5V3H7M3 9l3-3M9 3L6 6" />
      </svg>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier badge (used by both Inherent Tier and EU AI Act columns)
// ─────────────────────────────────────────────────────────────────────────────

function InherentTierBadge({ tier }: { tier: InherentRiskTier | undefined }) {
  const key = tier ?? 'pending';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TIER_BADGE[key]}`}
    >
      {TIER_LABEL[key]}
    </span>
  );
}

function EuAiActBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
        EU_BADGE[tier] ?? EU_BADGE.pending
      }`}
    >
      {EU_LABEL[tier] ?? toTitleCase(tier)}
    </span>
  );
}

function StatusBadge({ status }: { status: AIUseCaseStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function LifecyclePill({ stage }: { stage: string | undefined }) {
  if (!stage) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {toTitleCase(stage)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sort header
// ─────────────────────────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string;
  field: string;
  currentField: string;
  direction: 'asc' | 'desc';
  onSort: (field: string) => void;
}

function SortHeader({ label, field, currentField, direction, onSort }: SortHeaderProps) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-900"
    >
      {label}
      {isActive && <span className="text-slate-400">{direction === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────────────

interface AirtableInventoryTableProps {
  useCases: AIUseCase[];
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
}

const cellBase = 'border-[0.5px] border-slate-200 px-3 py-2.5 text-sm text-slate-700 align-middle';
const headerCellBase =
  'border-[0.5px] border-slate-200 bg-slate-50 px-3 py-2.5 text-left align-middle';

/**
 * Airtable-style inventory table.
 *
 * Layout: every cell has a 0.5px border so the whole grid reads as a
 * spreadsheet. Header row has a subtle slate-50 background. Rows hover
 * to slate-50 as well, with a 150ms transition. The table is wrapped by
 * the parent in a rounded card with `overflow-hidden` so border-radius
 * clips the grid lines at the corners.
 */
export function AirtableInventoryTable({
  useCases,
  sortField,
  sortDir,
  onSort,
}: AirtableInventoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={headerCellBase}>
              <SortHeader
                label="Name"
                field="name"
                currentField={sortField}
                direction={sortDir}
                onSort={onSort}
              />
            </th>
            <th className={headerCellBase}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                AI Type
              </span>
            </th>
            <th className={headerCellBase}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Lifecycle
              </span>
            </th>
            <th className={headerCellBase}>
              <SortHeader
                label="Inherent Tier"
                field="riskTier"
                currentField={sortField}
                direction={sortDir}
                onSort={onSort}
              />
            </th>
            <th className={headerCellBase}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Risk Score
              </span>
            </th>
            <th className={headerCellBase}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Owner
              </span>
            </th>
            <th className={headerCellBase}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                EU AI Act
              </span>
            </th>
            <th className={headerCellBase}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Status
              </span>
            </th>
            <th className={headerCellBase}>
              <SortHeader
                label="Submitted"
                field="createdAt"
                currentField={sortField}
                direction={sortDir}
                onSort={onSort}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {useCases.map((uc) => {
            const detailHref = `/inventory/${uc.id}`;
            const aiType = uc.intake.aiType;
            const aiTypeLabel = (() => {
              if (!aiType) return '';
              const arr = Array.isArray(aiType) ? aiType : [aiType as string];
              return arr.map((t) => toTitleCase(t)).join(', ');
            })();

            return (
              <tr key={uc.id} className="bg-white transition-colors duration-150 hover:bg-slate-50">
                {/* Name */}
                <td className={cellBase}>
                  <div className="flex items-center gap-2.5">
                    <ExpandButton href={detailHref} label={uc.intake.useCaseName ?? 'use case'} />
                    <Link
                      href={detailHref}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {uc.intake.useCaseName || 'Untitled'}
                    </Link>
                  </div>
                </td>

                {/* AI Type */}
                <td className={`${cellBase} text-slate-500`}>{aiTypeLabel}</td>

                {/* Lifecycle */}
                <td className={cellBase}>
                  <LifecyclePill stage={uc.intake.lifecycleStage} />
                </td>

                {/* Inherent Tier */}
                <td className={cellBase}>
                  <InherentTierBadge tier={uc.inherentRisk?.tier} />
                </td>

                {/* Risk Score */}
                <td className={cellBase}>
                  <RiskScoreDots tier={uc.inherentRisk?.tier} />
                </td>

                {/* Owner */}
                <td className={cellBase}>
                  <OwnerCell owner={uc.intake.useCaseOwner} />
                </td>

                {/* EU AI Act */}
                <td className={cellBase}>
                  <EuAiActBadge tier={uc.classification.euAiActTier} />
                </td>

                {/* Status */}
                <td className={cellBase}>
                  <StatusBadge status={uc.status} />
                </td>

                {/* Submitted */}
                <td className={`${cellBase} text-xs text-slate-500`}>
                  {new Date(uc.createdAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
