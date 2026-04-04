'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ModelForm } from '@/components/models/ModelForm';
import { useModelStore } from '@/lib/store/model-store';
import type { ModelRecord } from '@/types/model';

export default function EditModelPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const getModel = useModelStore((s) => s.getModel);
  const updateModel = useModelStore((s) => s.updateModel);

  const [model, setModel] = useState<ModelRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  useEffect(() => {
    const fromStore = getModel(id);
    if (fromStore) {
      setModel(fromStore);
      return;
    }

    // Not in store — fetch from API directly
    setIsLoadingModel(true);
    fetch(`/api/models/${id}`)
      .then((r) => r.json())
      .then((result: { data?: ModelRecord; error?: string }) => {
        if (result.data) {
          setModel(result.data);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoadingModel(false));
  }, [id, getModel]);

  const handleSubmit = async (data: unknown) => {
    const response = await fetch(`/api/models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as { data?: ModelRecord; error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? 'Failed to update model');
    }

    if (result.data) {
      updateModel(id, result.data);
    }

    router.push('/models');
  };

  if (isLoadingModel) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-sm text-slate-500">Loading model...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">Model not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Edit Model</h1>
          <p className="text-sm text-slate-500 mt-1">Update the model registration details.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {model ? (
            <ModelForm
              initialData={model.data}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
            />
          ) : (
            <p className="text-sm text-slate-500">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
