'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { EvidenceArtifact, EvidenceCategory, EvidenceStatus } from '@/lib/governance/types';
import { useInventoryStore } from '@/lib/store/inventory-store';

const STATUS_BADGES: Record<EvidenceStatus, string> = {
  collected: 'bg-amber-50 text-amber-700 border-amber-200',
  attested: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  collected: 'Collected',
  attested: 'Attested',
  expired: 'Expired',
  rejected: 'Rejected',
};

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  model_card: 'Model card',
  dataset_sheet: 'Dataset sheet',
  bias_audit: 'Bias audit',
  robustness_test: 'Robustness test',
  dpia: 'DPIA',
  fria: 'FRIA',
  risk_management_plan: 'Risk management plan',
  technical_documentation: 'Technical documentation',
  human_oversight_design: 'Human oversight design',
  monitoring_plan: 'Monitoring plan',
  incident_response_plan: 'Incident response plan',
  validation_report: 'Validation report',
  security_assessment: 'Security assessment',
  vendor_dpa: 'Vendor DPA',
  vendor_sla: 'Vendor SLA',
  training_records: 'Training records',
  change_log: 'Change log',
  attestation: 'Attestation',
  other: 'Other',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface EvidenceListProps {
  useCaseId: string;
  evidence: EvidenceArtifact[];
}

export function EvidenceList({ useCaseId, evidence }: EvidenceListProps) {
  const attestEvidence = useInventoryStore((s) => s.attestEvidence);
  const rejectEvidence = useInventoryStore((s) => s.rejectEvidence);
  const removeEvidence = useInventoryStore((s) => s.removeEvidence);

  const [attesting, setAttesting] = useState<string | null>(null);
  const [attesterName, setAttesterName] = useState('');
  const [attesterRole, setAttesterRole] = useState('');

  if (evidence.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">
        No evidence collected yet. Upload artifacts above to satisfy applicable controls.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {evidence.map((e) => (
        <li key={e.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-slate-900 truncate">{e.title}</h4>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_BADGES[e.status]}`}
                >
                  {STATUS_LABELS[e.status]}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span className="font-medium text-slate-600">{CATEGORY_LABELS[e.category]}</span>
                <span>·</span>
                <span className="font-mono">{e.fileName}</span>
                <span>·</span>
                <span>{formatBytes(e.fileSize)}</span>
                <span>·</span>
                <span>uploaded {new Date(e.uploadedAt).toLocaleDateString()}</span>
                {e.expiresAt && (
                  <>
                    <span>·</span>
                    <span>expires {new Date(e.expiresAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
              {e.description && <p className="mt-1.5 text-xs text-slate-600">{e.description}</p>}
              {e.attestation && (
                <p className="mt-1.5 text-xs text-emerald-700">
                  Attested by <strong>{e.attestation.attestedBy}</strong> (
                  {e.attestation.attestedRole}) on{' '}
                  {new Date(e.attestation.attestedAt).toLocaleDateString()}
                  {e.attestation.note && ` — "${e.attestation.note}"`}
                </p>
              )}
              {e.status === 'rejected' && e.rejectionReason && (
                <p className="mt-1.5 text-xs text-red-700">Rejected: {e.rejectionReason}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {e.status === 'collected' && (
                <>
                  <Button size="sm" variant="primary" onClick={() => setAttesting(e.id)}>
                    Attest
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const reason = window.prompt('Rejection reason:');
                      if (reason) rejectEvidence(useCaseId, e.id, reason);
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm('Remove this artifact? This cannot be undone.')) {
                    removeEvidence(useCaseId, e.id);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          </div>

          {/* Inline attestation form */}
          {attesting === e.id && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Attest this evidence as accurate and complete.
              </p>
              <input
                type="text"
                placeholder="Your name"
                value={attesterName}
                onChange={(ev) => setAttesterName(ev.target.value)}
                className="block w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Your role / title"
                value={attesterRole}
                onChange={(ev) => setAttesterRole(ev.target.value)}
                className="block w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (!attesterName.trim() || !attesterRole.trim()) return;
                    attestEvidence(useCaseId, e.id, attesterName.trim(), attesterRole.trim());
                    setAttesting(null);
                    setAttesterName('');
                    setAttesterRole('');
                  }}
                  disabled={!attesterName.trim() || !attesterRole.trim()}
                >
                  Sign attestation
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAttesting(null)}>
                  Cancel
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                By attesting, you confirm this artifact is accurate, complete, and authorized for
                governance use. Attestations are immutable and audit-logged.
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
