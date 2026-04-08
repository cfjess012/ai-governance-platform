'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useModelStore } from '@/lib/store/model-store';
import type { ModelRecord } from '@/types/model';

const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  meta: 'Meta',
  google: 'Google',
  mistral: 'Mistral',
  cohere: 'Cohere',
  amazon: 'Amazon',
  custom: 'Custom',
};

const modelTypeLabels: Record<string, string> = {
  llm: 'LLM',
  image_generation: 'Image Generation',
  embedding: 'Embedding',
  multimodal: 'Multimodal',
  code: 'Code',
  speech: 'Speech',
  other: 'Other',
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-green-100 text-green-700' },
  deprecated: { label: 'Deprecated', classes: 'bg-amber-100 text-amber-700' },
  blocked: { label: 'Blocked', classes: 'bg-red-100 text-red-700' },
  under_review: { label: 'Under Review', classes: 'bg-slate-100 text-slate-600' },
};

const providerColors: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-700',
  anthropic: 'bg-orange-100 text-orange-700',
  meta: 'bg-blue-100 text-blue-700',
  google: 'bg-sky-100 text-sky-700',
  mistral: 'bg-purple-100 text-purple-700',
  cohere: 'bg-pink-100 text-pink-700',
  amazon: 'bg-yellow-100 text-yellow-700',
  custom: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, classes: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const colorClass = providerColors[provider] ?? 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {providerLabels[provider] ?? provider}
    </span>
  );
}

function ModelRow({ model, onDelete }: { model: ModelRecord; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onDelete(model.id);
    setConfirming(false);
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/models/${model.id}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {model.data.name}
        </Link>
        {model.data.version && (
          <span className="ml-1.5 text-xs text-slate-400">{model.data.version}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ProviderBadge provider={model.data.provider} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {modelTypeLabels[model.data.modelType] ?? model.data.modelType}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={model.data.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/models/${model.id}`}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            View
          </Link>
          <Link
            href={`/models/${model.id}/edit`}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              confirming
                ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
                : 'border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
            }`}
          >
            {confirming ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ModelsPage() {
  const models = useModelStore((s) => s.models);
  const isLoaded = useModelStore((s) => s.isLoaded);
  const isLoading = useModelStore((s) => s.isLoading);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const removeModel = useModelStore((s) => s.removeModel);

  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      fetchModels();
    }
  }, [isLoaded, isLoading, fetchModels]);

  const filtered = useMemo(() => {
    let result = [...models];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.data.name.toLowerCase().includes(q));
    }

    if (filterProvider !== 'all') {
      result = result.filter((m) => m.data.provider === filterProvider);
    }

    return result;
  }, [models, search, filterProvider]);

  const stats = useMemo(() => {
    const total = models.length;
    const active = models.filter((m) => m.data.status === 'active').length;
    return { total, active };
  }, [models]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/models/${id}`, { method: 'DELETE' });
      removeModel(id);
    } catch {
      // silently fail — model stays in store
    }
  };

  const uniqueProviders = useMemo(() => [...new Set(models.map((m) => m.data.provider))], [models]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Model Registry</h1>
          <p className="text-sm text-slate-500 mt-1">
            {stats.total} model{stats.total !== 1 ? 's' : ''} registered, {stats.active} active
          </p>
        </div>
        <Link
          href="/models/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Model
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deprecated</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {models.filter((m) => m.data.status === 'deprecated').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Blocked</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {models.filter((m) => m.data.status === 'blocked').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Providers</option>
          {uniqueProviders.map((p) => (
            <option key={p} value={p}>
              {providerLabels[p] ?? p}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">Loading models...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((model) => (
                  <ModelRow key={model.id} model={model} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {models.length === 0 ? (
              <div>
                <p className="mb-2 text-sm">No models registered yet.</p>
                <Link
                  href="/models/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  Add your first model
                </Link>
              </div>
            ) : (
              <p className="text-sm">No models match your filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
