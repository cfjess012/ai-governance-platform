'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useModelStore } from '@/lib/store/model-store';

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

interface ModelMultiSelectProps {
  value: string[];
  onChange: (modelIds: string[]) => void;
  error?: string;
}

export function ModelMultiSelect({ value, onChange, error }: ModelMultiSelectProps) {
  const isLoaded = useModelStore((s) => s.isLoaded);
  const isLoading = useModelStore((s) => s.isLoading);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const getActiveModels = useModelStore((s) => s.getActiveModels);

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      fetchModels();
    }
  }, [isLoaded, isLoading, fetchModels]);

  const activeModels = getActiveModels();

  const filtered = search
    ? activeModels.filter((m) => m.data.name.toLowerCase().includes(search.toLowerCase()))
    : activeModels;

  const handleToggle = (id: string) => {
    const next = value.includes(id) ? value.filter((v) => v !== id) : [...value, id];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search models..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white hover:border-slate-400 transition-colors"
      />

      {isLoading ? (
        <p className="text-xs text-slate-400 py-2">Loading models...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          {activeModels.length === 0 ? 'No models registered yet.' : 'No models match your search.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {filtered.map((model) => {
            const isChecked = value.includes(model.id);
            const providerLabel = providerLabels[model.data.provider] ?? model.data.provider;
            return (
              <label
                key={model.id}
                className="flex items-start gap-2.5 text-sm cursor-pointer py-0.5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(model.id)}
                  className="mt-0.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500/10"
                />
                <span className="text-slate-700 leading-snug">
                  {model.data.name} <span className="text-slate-400">({providerLabel})</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-xs">
        <Link
          href="/models/new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Model not listed? Add to registry &rarr;
        </Link>
      </p>
    </div>
  );
}
