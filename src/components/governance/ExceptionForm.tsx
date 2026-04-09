'use client';

import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ExceptionReason } from '@/lib/governance/types';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useSessionStore } from '@/lib/store/session-store';

const REASON_OPTIONS: Array<{ value: ExceptionReason; label: string; description: string }> = [
  {
    value: 'business_critical',
    label: 'Business critical',
    description: 'Material business value justifies the deviation',
  },
  {
    value: 'regulatory_uncertainty',
    label: 'Regulatory uncertainty',
    description: 'Framework requirement is unclear or being interpreted',
  },
  {
    value: 'technical_infeasibility',
    label: 'Technical infeasibility',
    description: 'Required control is not technically achievable yet',
  },
  {
    value: 'temporary_workaround',
    label: 'Temporary workaround',
    description: 'Time-bounded gap during active remediation',
  },
  {
    value: 'inherited_risk',
    label: 'Inherited / grandfathered',
    description: 'Pre-existing system, evaluated under prior policy',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Reason not covered above (provide detail in justification)',
  },
];

interface ExceptionFormProps {
  useCaseId: string;
  onCreated?: () => void;
}

/**
 * Form for requesting a new policy exception. Captures the audit narrative
 * (reason, justification, compensating controls), the named approver, and
 * an explicit expiry date — exceptions cannot be open-ended.
 */
export function ExceptionForm({ useCaseId, onCreated }: ExceptionFormProps) {
  const createException = useInventoryStore((s) => s.createException);
  const sessionUser = useSessionStore((s) => s.user);

  const [policyOrControl, setPolicyOrControl] = useState('');
  const [reason, setReason] = useState<ExceptionReason>('business_critical');
  const [justification, setJustification] = useState('');
  const [compensatingControls, setCompensatingControls] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [approvedByRole, setApprovedByRole] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (
      !policyOrControl.trim() ||
      !justification.trim() ||
      !compensatingControls.trim() ||
      !approvedBy.trim() ||
      !approvedByRole.trim() ||
      !expiresAt
    ) {
      setError('All fields are required for an audit-defensible exception.');
      return;
    }
    setError(null);

    createException({
      useCaseId,
      policyOrControl: policyOrControl.trim(),
      reason,
      justification: justification.trim(),
      compensatingControls: compensatingControls.trim(),
      requestedBy: sessionUser?.name ?? 'Unknown User',
      approvedBy: approvedBy.trim(),
      approvedByRole: approvedByRole.trim(),
      expiresAt: new Date(expiresAt).toISOString(),
    });

    // Reset
    setPolicyOrControl('');
    setJustification('');
    setCompensatingControls('');
    setApprovedBy('');
    setApprovedByRole('');
    setExpiresAt('');
    onCreated?.();
  };

  const inputClass =
    'block w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none';
  const labelClass = 'block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
        <p className="text-xs text-amber-800">
          <strong>Exceptions are audit-tracked.</strong> Every field below is preserved immutably in
          the exception register. Use sparingly, time-bound them, and require executive sign-off.
        </p>
      </div>

      <div>
        <label htmlFor="exc-policy" className={labelClass}>
          Policy or control being waived
        </label>
        <input
          id="exc-policy"
          type="text"
          value={policyOrControl}
          onChange={(e) => setPolicyOrControl(e.target.value)}
          placeholder="e.g., EU AI Act Art. 14 — Human Oversight Design"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="exc-reason" className={labelClass}>
          Reason category
        </label>
        <select
          id="exc-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as ExceptionReason)}
          className={inputClass}
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {REASON_OPTIONS.find((o) => o.value === reason)?.description}
        </p>
      </div>

      <div>
        <label htmlFor="exc-justification" className={labelClass}>
          Business justification
        </label>
        <textarea
          id="exc-justification"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={3}
          placeholder="Why does the business value justify deviating from policy? What harm would denying the exception cause?"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label htmlFor="exc-compensating" className={labelClass}>
          Compensating controls
        </label>
        <textarea
          id="exc-compensating"
          value={compensatingControls}
          onChange={(e) => setCompensatingControls(e.target.value)}
          rows={3}
          placeholder="What alternative safeguards mitigate the risk created by the waiver?"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="exc-approver" className={labelClass}>
            Approver name
          </label>
          <input
            id="exc-approver"
            type="text"
            value={approvedBy}
            onChange={(e) => setApprovedBy(e.target.value)}
            placeholder="e.g., Jane Smith"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="exc-role" className={labelClass}>
            Approver title
          </label>
          <input
            id="exc-role"
            type="text"
            value={approvedByRole}
            onChange={(e) => setApprovedByRole(e.target.value)}
            placeholder="e.g., Chief Risk Officer"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="exc-expires" className={labelClass}>
          Expires on
        </label>
        <input
          id="exc-expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">Required. Exceptions cannot be open-ended.</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" variant="primary">
          Create Exception
        </Button>
      </div>
    </form>
  );
}
