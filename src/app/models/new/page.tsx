'use client';

import { useRouter } from 'next/navigation';
import { ModelForm } from '@/components/models/ModelForm';
import { useModelStore } from '@/lib/store/model-store';
import type { ModelRecord } from '@/types/model';

export default function NewModelPage() {
  const router = useRouter();
  const addModel = useModelStore((s) => s.addModel);

  const handleSubmit = async (data: unknown) => {
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as { data?: ModelRecord; error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? 'Failed to create model');
    }

    if (result.data) {
      addModel(result.data);
    }

    router.push('/models');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Add Model</h1>
          <p className="text-sm text-slate-500 mt-1">
            Register a new AI model to the governance registry.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ModelForm onSubmit={handleSubmit} submitLabel="Add Model" />
        </div>
      </div>
    </div>
  );
}
