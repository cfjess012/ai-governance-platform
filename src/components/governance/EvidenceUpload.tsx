'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { EvidenceCategory } from '@/lib/governance/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useSessionStore } from '@/lib/store/session-store';

const CATEGORY_OPTIONS: Array<{ value: EvidenceCategory; label: string; group: string }> = [
  { value: 'model_card', label: 'Model card', group: 'Documentation' },
  { value: 'dataset_sheet', label: 'Dataset sheet', group: 'Documentation' },
  {
    value: 'technical_documentation',
    label: 'Technical documentation (Annex IV)',
    group: 'Documentation',
  },
  { value: 'change_log', label: 'Change log', group: 'Documentation' },
  { value: 'bias_audit', label: 'Bias / fairness audit', group: 'Evaluation' },
  { value: 'robustness_test', label: 'Robustness / adversarial test', group: 'Evaluation' },
  { value: 'validation_report', label: 'Independent validation report', group: 'Evaluation' },
  { value: 'security_assessment', label: 'Security assessment', group: 'Evaluation' },
  {
    value: 'risk_management_plan',
    label: 'Risk management plan (EU AI Act Art. 9)',
    group: 'Risk Management',
  },
  {
    value: 'dpia',
    label: 'Data Protection Impact Assessment (GDPR Art. 35)',
    group: 'Risk Management',
  },
  {
    value: 'fria',
    label: 'Fundamental Rights Impact Assessment (EU AI Act Art. 27)',
    group: 'Risk Management',
  },
  {
    value: 'human_oversight_design',
    label: 'Human oversight design (EU AI Act Art. 14)',
    group: 'Operations',
  },
  { value: 'monitoring_plan', label: 'Drift / monitoring plan', group: 'Operations' },
  { value: 'incident_response_plan', label: 'Incident response plan', group: 'Operations' },
  { value: 'vendor_dpa', label: 'Vendor DPA', group: 'Vendor' },
  { value: 'vendor_sla', label: 'Vendor SLA', group: 'Vendor' },
  { value: 'training_records', label: 'Training records', group: 'Other' },
  { value: 'attestation', label: 'Signed attestation', group: 'Other' },
  { value: 'other', label: 'Other', group: 'Other' },
];

interface EvidenceUploadProps {
  useCaseId: string;
  /** Called after a successful upload — typically to dismiss the form */
  onUploaded?: () => void;
}

/**
 * Form for collecting a new evidence artifact. The actual file upload is
 * a stub for the POC — we capture filename, size, MIME type and store a
 * synthetic file reference. In a real deployment this hits S3 (or
 * equivalent) and stores the returned key.
 */
export function EvidenceUpload({ useCaseId, onUploaded }: EvidenceUploadProps) {
  const addEvidence = useInventoryStore((s) => s.addEvidence);
  const sessionUser = useSessionStore((s) => s.user);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<EvidenceCategory>('model_card');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !title) {
      // Pre-fill title from filename (strip extension)
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError('Title and file are required');
      return;
    }
    setError(null);
    setSubmitting(true);

    // POC: synthetic file reference. Production would upload to S3 here
    // and store the returned key on `fileRef`.
    const fileRef = `local://${file.name}-${Date.now()}`;

    addEvidence(useCaseId, {
      category,
      title: title.trim(),
      fileName: file.name,
      fileRef,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      description: description.trim() || undefined,
      controlIds: [], // Tagged later via the Evidence list
      uploadedBy: sessionUser?.name ?? 'Unknown User',
      expiresAt: expiresAt || undefined,
    });

    setSubmitting(false);
    setFile(null);
    setTitle('');
    setDescription('');
    setExpiresAt('');
    onUploaded?.();
  };

  // Group categories for the dropdown
  const grouped = CATEGORY_OPTIONS.reduce<Record<string, typeof CATEGORY_OPTIONS>>((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="evidence-file"
          className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
        >
          File
        </label>
        <input
          id="evidence-file"
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:bg-white file:text-slate-700 file:text-xs file:font-medium file:hover:bg-slate-50"
        />
        {file && (
          <p className="mt-1 text-xs text-slate-500">
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="evidence-category"
          className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
        >
          Category
        </label>
        <select
          id="evidence-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
          className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
        >
          {Object.entries(grouped).map(([group, opts]) => (
            <optgroup key={group} label={group}>
              {opts.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Drives which controls this evidence can satisfy in the compliance checklist.
        </p>
      </div>

      <div>
        <label
          htmlFor="evidence-title"
          className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
        >
          Title
        </label>
        <input
          id="evidence-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Q1 2026 Bias Audit Report"
          className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="evidence-description"
          className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
        >
          Description <span className="font-normal text-slate-400 normal-case">(optional)</span>
        </label>
        <textarea
          id="evidence-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief context for the auditor: scope, methodology, key findings"
          className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="evidence-expires"
          className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
        >
          Expires <span className="font-normal text-slate-400 normal-case">(optional)</span>
        </label>
        <input
          id="evidence-expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          Defaults to no expiry. Bias audits and DPIAs typically expire after 12 months.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" variant="primary" disabled={submitting || !file}>
          {submitting ? 'Uploading…' : 'Upload Evidence'}
        </Button>
      </div>
    </form>
  );
}
