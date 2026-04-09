'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { AIUseCase } from '@/types/inventory';

interface ExportReportModalProps {
  useCase: AIUseCase;
  onClose: () => void;
}

/**
 * Modal for exporting the AI Risk Assessment Report in Word or PDF format.
 * Sends the case data to the server-side API route for document generation.
 */
export function ExportReportModal({ useCase, onClose }: ExportReportModalProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'docx' | 'pdf'>('docx');

  const caseName = useCase.intake.useCaseName ?? 'Unknown';
  const hasAssessment = Boolean(useCase.assessment);
  const hasEvidence = (useCase.evidence ?? []).length > 0;
  const hasAttestation = Boolean(useCase.assessorAttestation);
  const hasTriage = Boolean(useCase.triage);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/export/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase, format: selectedFormat }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? `Generation failed (${response.status})`);
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = caseName.replace(/[^a-zA-Z0-9]+/g, '_');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `AI_Risk_Assessment_${safeName}_${date}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h2 className="text-lg font-bold text-slate-900">Export Risk Assessment Report</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate a formal audit-ready report for <strong>{caseName}</strong>
        </p>

        {/* Format selection */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={() => setSelectedFormat('docx')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedFormat === 'docx'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm font-semibold text-slate-900">Word (.docx)</span>
            </div>
            <p className="text-xs text-slate-500">
              Editable format for internal review and annotation.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat('pdf')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedFormat === 'pdf'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              <span className="text-sm font-semibold text-slate-900">PDF</span>
            </div>
            <p className="text-xs text-slate-500">
              Fixed format for regulatory submission and record retention.
            </p>
          </button>
        </div>

        {/* Report will include */}
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Report will include:</p>
          <ul className="space-y-1">
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-emerald-600">&#10003;</span> Executive Summary & System Description
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-emerald-600">&#10003;</span> Risk Classification (7 dimensions)
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              {hasTriage ? <span className="text-emerald-600">&#10003;</span> : <span className="text-amber-500">&#9888;</span>}
              {hasTriage ? 'Confirmed risk tier from triage' : 'Triage not completed — tier is auto-calculated'}
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              {hasAssessment ? <span className="text-emerald-600">&#10003;</span> : <span className="text-amber-500">&#9888;</span>}
              {hasAssessment ? 'Pre-Production Risk Assessment completed' : 'Assessment not completed — Section 5 will note this gap'}
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              {hasAttestation ? <span className="text-emerald-600">&#10003;</span> : <span className="text-amber-500">&#9888;</span>}
              {hasAttestation ? 'Assessor attestation on file' : 'Assessor attestation not completed — Section 5.3 will note this gap'}
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              {hasEvidence ? <span className="text-emerald-600">&#10003;</span> : <span className="text-amber-500">&#9888;</span>}
              {hasEvidence ? `${(useCase.evidence ?? []).length} evidence artifact(s) on file` : 'No evidence uploaded — Section 8 will note this gap'}
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-emerald-600">&#10003;</span> Governance Timeline & Audit Trail
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-emerald-600">&#10003;</span> Full Intake Questionnaire (Appendix A)
            </li>
            <li className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-emerald-600">&#10003;</span> Regulatory Citations (Appendix B)
            </li>
          </ul>
        </div>

        <p className="text-[10px] text-slate-400 mt-3">
          Report date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating report…' : `Generate ${selectedFormat.toUpperCase()}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
