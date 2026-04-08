'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { AIUseCase } from '@/types/inventory';
import type { ModelRecord } from '@/types/model';
import { ModelCardPDF } from './ModelCardPDF';

/**
 * PDFDownloadLink is dynamically imported because @react-pdf/renderer is large
 * and only needs to load when the user actually wants to export.
 */
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="text-xs text-slate-400">Loading PDF…</span> },
);

interface ExportPdfButtonProps {
  model: ModelRecord;
  linkedUseCases?: AIUseCase[];
}

/**
 * "Export PDF" button that lazy-loads the PDF generator and triggers a download.
 * The button is hidden until the user hovers/clicks because the renderer is heavy.
 */
export function ExportPdfButton({ model, linkedUseCases = [] }: ExportPdfButtonProps) {
  const [showLink, setShowLink] = useState(false);

  const safeName = model.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = `${safeName}-governance-audit-${new Date().toISOString().slice(0, 10)}.pdf`;

  if (!showLink) {
    return (
      <button
        type="button"
        onClick={() => setShowLink(true)}
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 18 15 15" />
        </svg>
        Export PDF
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={<ModelCardPDF model={model} linkedUseCases={linkedUseCases} />}
      fileName={fileName}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
    >
      {({ loading, error }) => {
        if (error) return <span>Error generating PDF</span>;
        return (
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {loading ? 'Generating…' : 'Download PDF'}
          </>
        );
      }}
    </PDFDownloadLink>
  );
}
