'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ExportPdfButton } from '@/components/models/ExportPdfButton';
import { ModelCardMarkdown } from '@/components/models/ModelCardMarkdown';
import { overallRiskFromFindings } from '@/lib/governance-analysis/parser';
import type { GovernanceAnalysis, RiskLevel } from '@/lib/governance-analysis/types';
import {
  formatContextWindow,
  formatDownloads,
  formatParameters,
} from '@/lib/integrations/huggingface/parser';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useModelStore } from '@/lib/store/model-store';
import type { ModelRecord } from '@/types/model';

// ─── Constants ────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  meta: 'Meta',
  google: 'Google',
  mistral: 'Mistral AI',
  cohere: 'Cohere',
  amazon: 'Amazon',
  custom: 'Custom',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  deprecated: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-slate-50 text-slate-600 border-slate-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  deprecated: 'Deprecated',
  under_review: 'Under Review',
  blocked: 'Blocked',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'model_card', label: 'Model Card' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'files', label: 'Files' },
  { id: 'governance', label: 'Governance' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Sub-components ───────────────────────────────────────────────

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  UNKNOWN: 'bg-slate-50 text-slate-500 border-slate-200',
};

function confidenceColorClass(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  if (score > 0) return 'text-red-600';
  return 'text-slate-400';
}

function StatCard({
  label,
  value,
  hint,
  valueClass = '',
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p
        className={`text-xl font-bold tabular-nums leading-tight ${valueClass || 'text-slate-900'}`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <dt className="w-40 shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-700 min-w-0 flex-1">{value || '—'}</dd>
    </div>
  );
}

function Pill({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'slate';
}) {
  const classes =
    variant === 'blue'
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : variant === 'slate'
        ? 'bg-slate-100 text-slate-600 border-slate-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${classes}`}
    >
      {children}
    </span>
  );
}

function EmptyTabState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-50 flex items-center justify-center">
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-slate-300"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm text-slate-500">{message}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

/**
 * Governance Analysis card — shows the LLM-generated analysis summary on the Overview tab.
 * Includes the verdict, strengths/concerns/recommendations, and risk findings.
 * If no analysis exists yet, shows a "Generate" CTA.
 */
function GovernanceAnalysisCard({
  analysis,
  isGenerating,
  onGenerate,
}: {
  analysis: GovernanceAnalysis | undefined;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  if (!analysis) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1e40af"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          AI-Powered Governance Analysis
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Run an LLM-powered governance audit on this model. The analysis produces a confidence
          score, structured risk findings (hallucination, bias, security, misuse), 11 sections of
          critical assessment, and an explicit list of governance gaps.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <>
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-spin"
              >
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
              </svg>
              Generating analysis…
            </>
          ) : (
            <>
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Generate Analysis
            </>
          )}
        </button>
      </div>
    );
  }

  const overallRisk = overallRiskFromFindings(analysis);
  const findings = [
    analysis.riskAssessment.hallucination,
    analysis.riskAssessment.bias,
    analysis.riskAssessment.security,
    analysis.riskAssessment.misuse,
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header strip with confidence + verdict */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-5 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e40af"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-900">Governance Analysis</h2>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_BADGE_CLASSES[overallRisk]}`}
          >
            Overall Risk: {overallRisk}
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          <strong className="text-slate-900">Verdict:</strong> {analysis.summary}
        </p>
        <p className="text-xs text-slate-400">
          Confidence:{' '}
          <strong className={confidenceColorClass(analysis.confidenceScore)}>
            {analysis.confidenceScore}/100
          </strong>{' '}
          · Generated {new Date(analysis.generatedAt).toLocaleDateString()} by{' '}
          <span className="font-mono">{analysis.generatedBy}</span>
        </p>
      </div>

      {/* Three-column layout: strengths / concerns / recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div className="p-5">
          <h3 className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">
            Strengths
          </h3>
          {analysis.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {analysis.strengths.map((s) => (
                <li key={s} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-px shrink-0">▸</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">None identified</p>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-2">
            Concerns
          </h3>
          {analysis.concerns.length > 0 ? (
            <ul className="space-y-1.5">
              {analysis.concerns.map((c) => (
                <li key={c} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-red-500 mt-px shrink-0">▸</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">None identified</p>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-2">
            Recommendations
          </h3>
          {analysis.recommendations.length > 0 ? (
            <ul className="space-y-1.5">
              {analysis.recommendations.map((r) => (
                <li key={r} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-px shrink-0">▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">None provided</p>
          )}
        </div>
      </div>

      {/* Risk findings strip */}
      <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Risk Findings
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {findings.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  {f.title}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold border ${RISK_BADGE_CLASSES[f.level]}`}
                >
                  {f.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">
                {f.justification}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Open gaps preview */}
      {analysis.openGaps.length > 0 && (
        <div className="border-t border-slate-200 bg-amber-50/40 px-5 py-4">
          <h3 className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-2">
            Open Gaps ({analysis.openGaps.length})
          </h3>
          <ul className="space-y-1.5">
            {analysis.openGaps.slice(0, 3).map((gap) => (
              <li key={gap.title} className="text-xs text-slate-600">
                <strong className="text-slate-800">{gap.title}:</strong> {gap.governanceRisk}
              </li>
            ))}
            {analysis.openGaps.length > 3 && (
              <li className="text-xs text-slate-400 italic">
                + {analysis.openGaps.length - 3} more in the PDF audit
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function ModelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const getModel = useModelStore((s) => s.getModel);
  const removeModel = useModelStore((s) => s.removeModel);
  const fetchHuggingFace = useModelStore((s) => s.fetchHuggingFace);
  const isFetchingHf = useModelStore((s) => s.fetchingHfIds.has(id));
  const generateGovernanceAnalysis = useModelStore((s) => s.generateGovernanceAnalysis);
  const isGeneratingAnalysis = useModelStore((s) => s.generatingAnalysisIds.has(id));

  // Subscribe directly to the model in the store so it re-renders on update
  const model = useModelStore((s) => s.models.find((m) => m.id === id));

  const [notFound, setNotFound] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use cases that reference this model (Governance tab)
  const useCases = useInventoryStore((s) => s.useCases);
  const linkedUseCases = useMemo(
    () => useCases.filter((uc) => uc.intake.whichModels?.includes(id)),
    [useCases, id],
  );

  // Initial load: if not in store, fetch from API
  useEffect(() => {
    if (model) return;
    const fromStore = getModel(id);
    if (fromStore) return;

    setIsLoadingModel(true);
    fetch(`/api/models/${id}`)
      .then((r) => r.json())
      .then((result: { data?: ModelRecord; error?: string }) => {
        if (!result.data) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoadingModel(false));
  }, [id, getModel, model]);

  // Auto-fetch HF data on mount if the model has a HF ID and no data yet
  useEffect(() => {
    if (!model) return;
    const hfId = model.data.huggingFaceModelId;
    if (!hfId) return;
    // Only auto-fetch if we have NO data yet (don't auto-refresh)
    if (model.external?.huggingFace) return;
    if (isFetchingHf) return;
    fetchHuggingFace(id);
  }, [model, id, fetchHuggingFace, isFetchingHf]);

  const handleDelete = async () => {
    try {
      await fetch(`/api/models/${id}`, { method: 'DELETE' });
      removeModel(id);
      router.push('/models');
    } catch {
      // ignore
    }
  };

  const handleRefreshHf = () => {
    if (model?.data.huggingFaceModelId) {
      fetchHuggingFace(id);
    }
  };

  // ─── Loading / not found states ────────────────────────────────

  if (isLoadingModel) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm text-slate-500">Loading model…</p>
      </div>
    );
  }

  if (notFound || !model) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">Model not found.</p>
          <Link href="/models" className="text-sm text-red-700 hover:underline mt-2 inline-block">
            ← Back to Model Registry
          </Link>
        </div>
      </div>
    );
  }

  // ─── Derived display values ────────────────────────────────────

  const { data, external } = model;
  const hf = external?.huggingFace;
  const meta = hf?.metadata;
  const hasHfId = Boolean(data.huggingFaceModelId);
  const hfError = external?.error;

  const parameters = meta ? formatParameters(meta.parametersBillions) : null;
  const contextWindow = meta ? formatContextWindow(meta.contextWindow) : null;
  const downloads = meta ? formatDownloads(meta.downloads) : null;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumbs */}
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/models" className="hover:text-blue-600 transition-colors">
          Model Registry
        </Link>
        <span>/</span>
        <span className="text-slate-600">{data.name}</span>
      </div>

      {/* ── Hero / Header ──────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{data.name}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[data.status]}`}
              >
                {STATUS_LABELS[data.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Pill variant="blue">{PROVIDER_LABELS[data.provider] ?? data.provider}</Pill>
              <Pill>{data.modelType.replace('_', ' ').toUpperCase()}</Pill>
              {data.version && <Pill variant="slate">v{data.version}</Pill>}
              {data.licenseType && (
                <Pill variant="slate">{data.licenseType.replace('_', ' ')}</Pill>
              )}
              {meta?.gated && (
                <Pill variant="slate">
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="mr-1"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Gated
                </Pill>
              )}
            </div>
            {hasHfId && (
              <p className="text-xs text-slate-400 mt-2">
                Linked to Hugging Face:{' '}
                <a
                  href={`https://huggingface.co/${data.huggingFaceModelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono"
                >
                  {data.huggingFaceModelId}
                </a>
              </p>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 shrink-0">
            {hasHfId && (
              <button
                type="button"
                onClick={handleRefreshHf}
                disabled={isFetchingHf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isFetchingHf ? 'animate-spin' : ''}
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {isFetchingHf ? 'Refreshing…' : 'Refresh from HF'}
              </button>
            )}
            <ExportPdfButton model={model} linkedUseCases={linkedUseCases} />
            <Link
              href={`/models/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* HF fetch error banner */}
        {hfError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-800">
              <strong>Could not refresh from Hugging Face:</strong> {hfError}
            </p>
          </div>
        )}

        {/* Loading skeleton when first fetching */}
        {isFetchingHf && !hf && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-800">Fetching live metadata from Hugging Face Hub…</p>
          </div>
        )}
      </div>

      {/* ── Stats grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Parameters"
          value={parameters ?? (hasHfId ? 'Unknown' : 'Proprietary')}
          hint={meta?.architecture ?? (hasHfId ? undefined : 'Not on Hugging Face')}
        />
        <StatCard
          label="Context Window"
          value={contextWindow ?? (hasHfId ? 'Unknown' : 'Proprietary')}
          hint={meta?.modelType ?? (hasHfId ? undefined : 'See vendor docs')}
        />
        <StatCard
          label="Downloads"
          value={downloads ?? '—'}
          hint={meta ? 'last 30 days' : hasHfId ? 'Pending fetch' : 'Closed model'}
        />
        <StatCard
          label="License"
          value={meta?.license ?? data.licenseType.replace('_', ' ')}
          hint={meta?.licenseLink ? 'See HF for details' : undefined}
        />
        <StatCard
          label="AI Confidence"
          value={
            model.governanceAnalysis ? `${model.governanceAnalysis.confidenceScore}/100` : 'Not run'
          }
          hint={
            model.governanceAnalysis
              ? `${overallRiskFromFindings(model.governanceAnalysis)} overall risk`
              : 'Generate analysis below'
          }
          valueClass={
            model.governanceAnalysis
              ? confidenceColorClass(model.governanceAnalysis.confidenceScore)
              : 'text-slate-400'
          }
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-1" aria-label="Tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Governance analysis (full-width, above the fold) */}
          <GovernanceAnalysisCard
            analysis={model.governanceAnalysis}
            isGenerating={isGeneratingAnalysis}
            onGenerate={() => generateGovernanceAnalysis(id, linkedUseCases)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {(data.description || meta) && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Description</h2>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {data.description ??
                      `${data.name} is a ${data.modelType.replace('_', ' ')} provided by ${PROVIDER_LABELS[data.provider] ?? data.provider}.`}
                  </p>
                </div>
              )}

              {/* Known limitations */}
              {data.knownLimitations && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Known Limitations</h2>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {data.knownLimitations}
                  </p>
                </div>
              )}

              {/* Tags from HF */}
              {meta && meta.tags.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {meta.tags.map((tag) => (
                      <Pill key={tag} variant="slate">
                        {tag}
                      </Pill>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right rail: metadata */}
            <div className="space-y-6">
              {/* Linked use cases (prominent on overview) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Linked Use Cases</h2>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {linkedUseCases.length}
                  </span>
                </div>
                {linkedUseCases.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {linkedUseCases.map((uc) => (
                      <li key={uc.id}>
                        <Link
                          href={`/inventory/${uc.id}`}
                          className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-900 group-hover:text-blue-600 truncate">
                              {uc.intake.useCaseName}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {uc.intake.businessArea}
                            </p>
                          </div>
                          <svg
                            aria-hidden="true"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-slate-300 shrink-0 ml-2"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-5 py-4">
                    <p className="text-xs text-slate-400">No use cases reference this model yet.</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Metadata</h2>
                <dl>
                  <MetadataRow
                    label="Provider"
                    value={PROVIDER_LABELS[data.provider] ?? data.provider}
                  />
                  <MetadataRow label="Model Type" value={data.modelType.replace('_', ' ')} />
                  {data.version && <MetadataRow label="Version" value={data.version} />}
                  {data.hosting && (
                    <MetadataRow label="Hosting" value={data.hosting.replace('_', ' ')} />
                  )}
                  {meta?.languages && meta.languages.length > 0 && (
                    <MetadataRow label="Languages" value={meta.languages.join(', ')} />
                  )}
                  {meta?.baseModels && meta.baseModels.length > 0 && (
                    <MetadataRow
                      label="Base Model"
                      value={
                        <div className="flex flex-col gap-1">
                          {meta.baseModels.map((bm) => (
                            <a
                              key={bm}
                              href={`https://huggingface.co/${bm}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-mono text-xs"
                            >
                              {bm}
                            </a>
                          ))}
                        </div>
                      }
                    />
                  )}
                  {meta?.datasets && meta.datasets.length > 0 && (
                    <MetadataRow label="Datasets" value={meta.datasets.join(', ')} />
                  )}
                  {meta?.lastModified && (
                    <MetadataRow
                      label="Last updated"
                      value={new Date(meta.lastModified).toLocaleDateString()}
                    />
                  )}
                  <MetadataRow
                    label="Approved Regions"
                    value={
                      data.approvedRegions && data.approvedRegions.length > 0
                        ? data.approvedRegions.map((r) => r.replace('_', ' ')).join(', ')
                        : '—'
                    }
                  />
                  <MetadataRow
                    label="Data Retention"
                    value={data.dataRetentionPolicy ?? 'Not specified'}
                  />
                </dl>
              </div>

              {!hasHfId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Proprietary model</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This model is not published on Hugging Face. Live metadata, benchmarks, and the
                    model card aren&apos;t available — refer to the vendor&apos;s documentation for
                    technical specs.
                  </p>
                </div>
              )}

              {hf && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Hugging Face</h2>
                  <dl>
                    <MetadataRow
                      label="HF ID"
                      value={
                        <a
                          href={meta?.huggingFaceUrl ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-mono text-xs"
                        >
                          {meta?.modelId}
                        </a>
                      }
                    />
                    <MetadataRow label="Likes" value={String(meta?.likes ?? 0)} />
                    <MetadataRow label="Library" value={meta?.library ?? '—'} />
                    <MetadataRow label="Pipeline" value={meta?.pipelineTag ?? '—'} />
                    <MetadataRow
                      label="Last fetched"
                      value={
                        external?.lastFetchedAt
                          ? new Date(external.lastFetchedAt).toLocaleString()
                          : '—'
                      }
                    />
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'model_card' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          {hf?.modelCardMarkdown ? (
            <ModelCardMarkdown markdown={hf.modelCardMarkdown} />
          ) : hasHfId ? (
            <EmptyTabState
              message="No model card content available yet."
              hint="Try refreshing from Hugging Face."
            />
          ) : (
            <EmptyTabState
              message="This model isn't linked to Hugging Face."
              hint="Edit the model and add a Hugging Face Model ID to fetch the model card."
            />
          )}
        </div>
      )}

      {activeTab === 'benchmarks' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {meta && meta.benchmarks.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Dataset
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meta.benchmarks.map((b) => {
                  // Stable composite key — task+dataset+metric+value uniquely identifies a row.
                  const rowKey = `${b.task}::${b.dataset}::${b.metric}::${b.value}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{b.task}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{b.dataset}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{b.metric}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900 text-right">
                        {String(b.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyTabState
              message="No benchmark data available."
              hint={
                hasHfId
                  ? 'This model card does not include structured benchmark results.'
                  : 'Link to a Hugging Face model to import benchmarks.'
              }
            />
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {meta && meta.files.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 mb-3">
                {meta.files.length} file{meta.files.length === 1 ? '' : 's'} in repository
              </p>
              <ul className="space-y-1">
                {meta.files.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 group"
                  >
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 shrink-0"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <a
                      href={`https://huggingface.co/${meta.modelId}/blob/main/${f}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-slate-700 group-hover:text-blue-600 truncate"
                    >
                      {f}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyTabState
              message="No file listing available."
              hint={
                hasHfId
                  ? 'Refresh from Hugging Face to load the file tree.'
                  : 'Link to a Hugging Face model to see files.'
              }
            />
          )}
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="space-y-6">
          {/* Linked use cases */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Linked AI Use Cases ({linkedUseCases.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Use cases in the inventory that reference this model.
              </p>
            </div>
            {linkedUseCases.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {linkedUseCases.map((uc) => (
                  <li key={uc.id}>
                    <Link
                      href={`/inventory/${uc.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {uc.intake.useCaseName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {uc.intake.businessArea} · {uc.intake.useCaseOwner}
                        </p>
                      </div>
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-300 shrink-0"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6">
                <p className="text-xs text-slate-400 text-center">
                  No use cases reference this model yet.
                </p>
              </div>
            )}
          </div>

          {/* Approved regions card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Approved Deployment Regions
            </h2>
            {data.approvedRegions && data.approvedRegions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.approvedRegions.map((r) => (
                  <Pill key={r} variant="blue">
                    {r.replace('_', ' ')}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No approved regions specified.</p>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete this model?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will remove the model from your registry. Cases that reference it will keep their
              reference but lose the metadata.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
