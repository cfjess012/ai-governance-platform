'use client';

import Link from 'next/link';
import { useState } from 'react';

type Status = 'done' | 'in-progress' | 'planned' | 'future';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  competitors: string[];
}

interface Phase {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  gradient: string;
  items: RoadmapItem[];
}

const phases: Phase[] = [
  {
    id: 'foundation',
    name: 'Phase 1',
    subtitle: 'Foundation',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-blue-600',
    items: [
      {
        title: 'Persistent Database',
        description:
          'Migrate from localStorage to Postgres with Prisma ORM. All use cases, models, and assessments persisted server-side.',
        status: 'planned',
        priority: 'P0',
        competitors: ['All competitors'],
      },
      {
        title: 'Authentication & RBAC',
        description:
          'Real SSO/SAML auth with role-specific views: Model Owner, Risk Assessor, Compliance Officer, Executive.',
        status: 'planned',
        priority: 'P0',
        competitors: ['IBM OpenPages', 'ServiceNow', 'OneTrust'],
      },
      {
        title: 'Approval Workflow Engine',
        description:
          'Multi-stage, role-gated approval chains with escalation, delegation, and SLA tracking.',
        status: 'planned',
        priority: 'P0',
        competitors: ['ServiceNow', 'Credo AI', 'IBM OpenPages'],
      },
      {
        title: 'Server-Persisted Audit Trail',
        description:
          'Immutable audit logs with timestamps, user attribution, and tamper-evident evidence packages.',
        status: 'planned',
        priority: 'P1',
        competitors: ['Monitaur', 'Credo AI', 'IBM OpenPages'],
      },
    ],
  },
  {
    id: 'compliance',
    name: 'Phase 2',
    subtitle: 'Compliance & Reporting',
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-violet-600',
    items: [
      {
        title: 'Regulatory Obligation Mapping',
        description:
          'Map controls to specific EU AI Act articles (Art. 6, 9, 52), NIST AI RMF functions, and generate compliance evidence.',
        status: 'planned',
        priority: 'P1',
        competitors: ['Holistic AI', 'Credo AI', 'OneTrust'],
      },
      {
        title: 'Executive Dashboards',
        description:
          'Portfolio-level risk heatmaps, compliance posture summaries, trend charts, and drill-down analytics.',
        status: 'planned',
        priority: 'P1',
        competitors: ['IBM OpenPages', 'ServiceNow', 'ValidMind'],
      },
      {
        title: 'PDF/CSV Export',
        description:
          'Exportable compliance reports, risk assessments, and audit evidence packages for regulators.',
        status: 'planned',
        priority: 'P1',
        competitors: ['All competitors'],
      },
      {
        title: 'Periodic Review Scheduling',
        description:
          'Automated triggers for re-assessment based on risk tier (high-risk = quarterly, low-risk = annual).',
        status: 'planned',
        priority: 'P2',
        competitors: ['Credo AI', 'Holistic AI', 'Monitaur'],
      },
    ],
  },
  {
    id: 'depth',
    name: 'Phase 3',
    subtitle: 'Depth & Intelligence',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-amber-600',
    items: [
      {
        title: 'Model Registry v2',
        description:
          'Model versioning, promotion history, and standardized model cards with auto-generated documentation.',
        status: 'planned',
        priority: 'P2',
        competitors: ['ValidMind', 'IBM OpenPages', 'Credo AI'],
      },
      {
        title: 'Vendor Risk Management',
        description:
          'Dedicated vendor risk module with questionnaires, SLA tracking, contract mapping, and audit rights management.',
        status: 'planned',
        priority: 'P2',
        competitors: ['OneTrust', 'IBM OpenPages', 'ServiceNow'],
      },
      {
        title: 'Bias & Fairness Testing',
        description:
          'Quantitative bias testing against protected attributes with result storage and trending.',
        status: 'planned',
        priority: 'P2',
        competitors: ['Holistic AI', 'Credo AI', 'Fairly AI'],
      },
      {
        title: 'Production Monitoring',
        description:
          'Post-deployment monitoring for model drift, performance degradation, and compliance decay.',
        status: 'planned',
        priority: 'P2',
        competitors: ['Monitaur', 'IBM OpenPages', 'ValidMind'],
      },
    ],
  },
  {
    id: 'ecosystem',
    name: 'Phase 4',
    subtitle: 'Ecosystem & Integrations',
    color: '#10b981',
    gradient: 'from-emerald-500 to-emerald-600',
    items: [
      {
        title: 'ServiceNow Integration (Live)',
        description:
          'Replace mock layer with live ServiceNow Table API integration, OAuth2, and bi-directional sync.',
        status: 'planned',
        priority: 'P3',
        competitors: ['ServiceNow'],
      },
      {
        title: 'MLOps Connectors',
        description:
          'Connect to MLflow, SageMaker, Vertex AI for model lineage and automated registry population.',
        status: 'future',
        priority: 'P3',
        competitors: ['Credo AI', 'ValidMind', 'IBM OpenPages'],
      },
      {
        title: 'Data Catalog Integration',
        description:
          'Link AI use cases to data assets via Atlan, Collibra, or AWS Glue for data lineage visibility.',
        status: 'future',
        priority: 'P3',
        competitors: ['Atlan', 'Securiti AI'],
      },
      {
        title: 'Incident Management',
        description:
          'AI incident tracking tied back to the use case registry with root cause analysis and remediation workflows.',
        status: 'future',
        priority: 'P3',
        competitors: ['ServiceNow', 'IBM OpenPages'],
      },
    ],
  },
];

const currentStrengths = [
  { label: 'AI-Assisted Intake', detail: 'Auto-suggestions, consistency checks, value coaching' },
  { label: 'Real-time Classification', detail: 'Live sidebar showing risk as you answer' },
  { label: 'Transparent Scoring', detail: '7-dimension breakdown with visible weights' },
  { label: 'Interactive Process Guide', detail: 'Branching paths with context and timing' },
  { label: 'Agent Tier Framework', detail: 'Unique AI agent governance classification' },
];

const statusConfig: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  done: { label: 'Done', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'in-progress': {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  planned: { label: 'Planned', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  future: { label: 'Future', bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300' },
};

const priorityConfig: Record<Priority, { bg: string; text: string }> = {
  P0: { bg: 'bg-red-50', text: 'text-red-700' },
  P1: { bg: 'bg-orange-50', text: 'text-orange-700' },
  P2: { bg: 'bg-amber-50', text: 'text-amber-700' },
  P3: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${cfg.bg} ${cfg.text}`}
    >
      {priority}
    </span>
  );
}

function PhaseProgress({ items }: { items: RoadmapItem[] }) {
  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const inProgress = items.filter((i) => i.status === 'in-progress').length;
  const pct = total > 0 ? Math.round(((done + inProgress * 0.5) / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: pct > 0 ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : 'transparent',
          }}
        />
      </div>
      <span className="text-xs text-slate-400 font-medium tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function RoadmapPage() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>('foundation');

  const allItems = phases.flatMap((p) => p.items);
  const totalItems = allItems.length;
  const doneCount = allItems.filter((i) => i.status === 'done').length;
  const inProgressCount = allItems.filter((i) => i.status === 'in-progress').length;
  const plannedCount = allItems.filter((i) => i.status === 'planned').length;
  const futureCount = allItems.filter((i) => i.status === 'future').length;
  const overallPct = Math.round(((doneCount + inProgressCount * 0.5) / totalItems) * 100);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
              Product Roadmap
            </h1>
            <p className="text-sm text-slate-500">
              Feature gaps identified from market analysis against Credo AI, Holistic AI, IBM
              OpenPages, ServiceNow, OneTrust, and others.
            </p>
          </div>
          <Link
            href="/roadmap/audit"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
            Intake Audit Report
          </Link>
        </div>

        {/* Overall Progress */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Overall Progress</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalItems} items across {phases.length} phases
              </p>
            </div>
            <span className="text-3xl font-bold text-slate-900 tabular-nums">{overallPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${overallPct}%`,
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b, #10b981)',
              }}
            />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">
                Done <span className="font-semibold text-slate-700">{doneCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-500">
                In Progress <span className="font-semibold text-slate-700">{inProgressCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs text-slate-500">
                Planned <span className="font-semibold text-slate-700">{plannedCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500">
                Future <span className="font-semibold text-slate-700">{futureCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Current Strengths */}
        <div className="mb-8 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
          <h2 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Current Differentiators
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentStrengths.map((s) => (
              <div
                key={s.label}
                className="bg-white/70 rounded-lg px-3 py-2.5 border border-emerald-100"
              >
                <p className="text-xs font-semibold text-emerald-900">{s.label}</p>
                <p className="text-xs text-emerald-700 mt-0.5">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase) => {
            const isExpanded = expandedPhase === phase.id;
            return (
              <div
                key={phase.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Phase header */}
                <button
                  type="button"
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: phase.color }}
                  >
                    {phase.name.split(' ')[1]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {phase.name} — {phase.subtitle}
                      </h3>
                      <span className="text-xs text-slate-400">{phase.items.length} items</span>
                    </div>
                    <div className="mt-1.5 max-w-xs">
                      <PhaseProgress items={phase.items} />
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Phase items */}
                {isExpanded && (
                  <div className="px-6 pb-5 animate-fade-in">
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      {phase.items.map((item) => (
                        <div
                          key={item.title}
                          className="group rounded-lg border border-slate-100 p-4 hover:border-slate-200 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-medium text-slate-900">{item.title}</h4>
                              <PriorityBadge priority={item.priority} />
                              <StatusBadge status={item.status} />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-2.5">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-400">Market ref:</span>
                            {item.competitors.map((c) => (
                              <span
                                key={c}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-50 text-xs text-slate-500 border border-slate-100"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 font-medium">Priority:</span>
              {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => (
                <div key={p} className="flex items-center gap-1">
                  <PriorityBadge priority={p} />
                  <span className="text-xs text-slate-400">
                    {p === 'P0'
                      ? 'Critical'
                      : p === 'P1'
                        ? 'Important'
                        : p === 'P2'
                          ? 'Valuable'
                          : 'Nice-to-have'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
