'use client';

import Link from 'next/link';
import { useState } from 'react';
import { modelSchema } from '@/lib/questions/model-schema';
import type { ModelFormData } from '@/types/model';

interface ModelFormProps {
  initialData?: Partial<ModelFormData>;
  onSubmit: (data: unknown) => Promise<void>;
  submitLabel?: string;
}

type FieldErrors = Partial<Record<keyof ModelFormData, string>>;

const inputClasses =
  'block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white hover:border-slate-400 transition-colors';

const inputErrorClasses =
  'block w-full rounded-lg border border-red-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50 text-red-900';

const labelClasses = 'block text-sm font-medium text-slate-700';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'custom', label: 'Custom' },
] as const;

const MODEL_TYPE_OPTIONS = [
  { value: 'llm', label: 'Large Language Model (LLM)' },
  { value: 'image_generation', label: 'Image Generation' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'multimodal', label: 'Multimodal' },
  { value: 'code', label: 'Code' },
  { value: 'speech', label: 'Speech' },
  { value: 'other', label: 'Other' },
] as const;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'deprecated', label: 'Deprecated' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'blocked', label: 'Blocked' },
] as const;

const LICENSE_OPTIONS = [
  { value: 'proprietary', label: 'Proprietary' },
  { value: 'open_source', label: 'Open Source' },
  { value: 'open_weights', label: 'Open Weights' },
  { value: 'custom_license', label: 'Custom License' },
] as const;

const HOSTING_OPTIONS = [
  { value: 'cloud_api', label: 'Cloud API' },
  { value: 'self_hosted', label: 'Self-Hosted' },
  { value: 'vendor_managed', label: 'Vendor Managed' },
  { value: 'edge', label: 'Edge' },
] as const;

const APPROVED_REGIONS_OPTIONS = [
  { value: 'us_only', label: 'United States Only' },
  { value: 'eu_eea', label: 'EU / EEA' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'canada', label: 'Canada' },
  { value: 'other', label: 'Other' },
] as const;

export function ModelForm({ initialData, onSubmit, submitLabel = 'Save Model' }: ModelFormProps) {
  const [formData, setFormData] = useState<Partial<ModelFormData>>({
    status: 'active',
    approvedRegions: [],
    ...initialData,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof ModelFormData>(key: K, value: ModelFormData[K] | undefined) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleRegionToggle = (region: string) => {
    const current = formData.approvedRegions ?? [];
    const next = current.includes(region as never)
      ? current.filter((r) => r !== region)
      : [...current, region as never];
    setField('approvedRegions', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const parsed = modelSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ModelFormData;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        {/* Model Name */}
        <div className="space-y-1">
          <label htmlFor="name" className={labelClasses}>
            Model Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name ?? ''}
            onChange={(e) => setField('name', e.target.value)}
            className={errors.name ? inputErrorClasses : inputClasses}
            placeholder="e.g. GPT-4o, Claude 3.5 Sonnet"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Provider + Model Type (2 col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="provider" className={labelClasses}>
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              id="provider"
              value={formData.provider ?? ''}
              onChange={(e) =>
                setField('provider', (e.target.value || undefined) as ModelFormData['provider'])
              }
              className={errors.provider ? inputErrorClasses : inputClasses}
            >
              <option value="">Select provider...</option>
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.provider && <p className="text-xs text-red-500">{errors.provider}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="modelType" className={labelClasses}>
              Model Type <span className="text-red-500">*</span>
            </label>
            <select
              id="modelType"
              value={formData.modelType ?? ''}
              onChange={(e) =>
                setField('modelType', (e.target.value || undefined) as ModelFormData['modelType'])
              }
              className={errors.modelType ? inputErrorClasses : inputClasses}
            >
              <option value="">Select type...</option>
              {MODEL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.modelType && <p className="text-xs text-red-500">{errors.modelType}</p>}
          </div>
        </div>

        {/* Version + Status (2 col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="version" className={labelClasses}>
              Version
            </label>
            <input
              id="version"
              type="text"
              value={formData.version ?? ''}
              onChange={(e) => setField('version', e.target.value || undefined)}
              className={errors.version ? inputErrorClasses : inputClasses}
              placeholder="e.g. 2024-11-20, 3.5, latest"
            />
            {errors.version && <p className="text-xs text-red-500">{errors.version}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="status" className={labelClasses}>
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={formData.status ?? 'active'}
              onChange={(e) =>
                setField('status', (e.target.value || undefined) as ModelFormData['status'])
              }
              className={errors.status ? inputErrorClasses : inputClasses}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.status && <p className="text-xs text-red-500">{errors.status}</p>}
          </div>
        </div>

        {/* License Type + Hosting (2 col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="licenseType" className={labelClasses}>
              License Type <span className="text-red-500">*</span>
            </label>
            <select
              id="licenseType"
              value={formData.licenseType ?? ''}
              onChange={(e) =>
                setField(
                  'licenseType',
                  (e.target.value || undefined) as ModelFormData['licenseType'],
                )
              }
              className={errors.licenseType ? inputErrorClasses : inputClasses}
            >
              <option value="">Select license...</option>
              {LICENSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.licenseType && <p className="text-xs text-red-500">{errors.licenseType}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="hosting" className={labelClasses}>
              Hosting
            </label>
            <select
              id="hosting"
              value={formData.hosting ?? ''}
              onChange={(e) =>
                setField('hosting', (e.target.value || undefined) as ModelFormData['hosting'])
              }
              className={errors.hosting ? inputErrorClasses : inputClasses}
            >
              <option value="">Select hosting...</option>
              {HOSTING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.hosting && <p className="text-xs text-red-500">{errors.hosting}</p>}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label htmlFor="description" className={labelClasses}>
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description ?? ''}
            onChange={(e) => setField('description', e.target.value || undefined)}
            className={errors.description ? inputErrorClasses : inputClasses}
            placeholder="Brief description of the model and its intended use..."
          />
          {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
        </div>

        {/* Known Limitations */}
        <div className="space-y-1">
          <label htmlFor="knownLimitations" className={labelClasses}>
            Known Limitations
          </label>
          <textarea
            id="knownLimitations"
            rows={3}
            value={formData.knownLimitations ?? ''}
            onChange={(e) => setField('knownLimitations', e.target.value || undefined)}
            className={errors.knownLimitations ? inputErrorClasses : inputClasses}
            placeholder="Hallucination tendencies, context window limits, bias concerns, etc."
          />
          {errors.knownLimitations && (
            <p className="text-xs text-red-500">{errors.knownLimitations}</p>
          )}
        </div>

        {/* Data Retention Policy */}
        <div className="space-y-1">
          <label htmlFor="dataRetentionPolicy" className={labelClasses}>
            Data Retention Policy
          </label>
          <input
            id="dataRetentionPolicy"
            type="text"
            value={formData.dataRetentionPolicy ?? ''}
            onChange={(e) => setField('dataRetentionPolicy', e.target.value || undefined)}
            className={errors.dataRetentionPolicy ? inputErrorClasses : inputClasses}
            placeholder="e.g. No retention, 30 days, per vendor agreement"
          />
          {errors.dataRetentionPolicy && (
            <p className="text-xs text-red-500">{errors.dataRetentionPolicy}</p>
          )}
        </div>

        {/* Approved Regions */}
        <fieldset className="space-y-2">
          <legend className={labelClasses}>Approved Regions</legend>
          <div className="space-y-2">
            {APPROVED_REGIONS_OPTIONS.map((opt) => {
              const isChecked = (formData.approvedRegions ?? []).includes(opt.value as never);
              return (
                <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleRegionToggle(opt.value)}
                    className="rounded border-slate-300 text-blue-500 focus:ring-blue-500/10"
                  />
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {errors.approvedRegions && (
            <p className="text-xs text-red-500">{errors.approvedRegions}</p>
          )}
        </fieldset>

        {/* Submit error */}
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Link
            href="/models"
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
