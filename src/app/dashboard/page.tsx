'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UseCaseCard } from '@/components/dashboard/UseCaseCard';
import { Button } from '@/components/ui/Button';

interface UseCaseRecord {
  id: string;
  formData: {
    useCaseName?: string;
    businessPurpose?: string;
    solutionType?: string;
  };
  status: string;
  riskScore: number | null;
  euAiActTier: string | null;
  agentTier: string | null;
  updatedAt: string;
}

const sampleRecords: UseCaseRecord[] = [
  {
    id: 'sample-1',
    formData: {
      useCaseName: 'Customer Service Chatbot',
      businessPurpose:
        'AI-powered chatbot for handling customer inquiries about insurance policies',
      solutionType: 'existing_tool',
    },
    status: 'in_review',
    riskScore: null,
    euAiActTier: 'likely_high_financial',
    agentTier: null,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    formData: {
      useCaseName: 'Claims Fraud Detection',
      businessPurpose: 'ML model to flag potentially fraudulent insurance claims for manual review',
      solutionType: 'custom',
    },
    status: 'submitted',
    riskScore: null,
    euAiActTier: 'likely_high_financial',
    agentTier: null,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sample-3',
    formData: {
      useCaseName: 'Document Summarization Tool',
      businessPurpose: 'Internal tool using LLM to summarize long policy documents for analysts',
      solutionType: 'new_tool',
    },
    status: 'approved',
    riskScore: null,
    euAiActTier: 'to_be_determined',
    agentTier: null,
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export default function DashboardPage() {
  const [records, setRecords] = useState<UseCaseRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setRecords(sampleRecords);
  }, []);

  const filteredRecords = filter === 'all' ? records : records.filter((r) => r.status === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Use Case Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{records.length} use cases registered</p>
        </div>
        <Link href="/intake">
          <Button>New Intake</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'draft', 'submitted', 'in_review', 'approved'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
              filter === status
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.map((record) => (
          <UseCaseCard
            key={record.id}
            id={record.id}
            name={record.formData.useCaseName ?? 'Untitled'}
            description={record.formData.businessPurpose ?? ''}
            status={record.status}
            riskScore={record.riskScore}
            euAiActTier={record.euAiActTier}
            agentTier={record.agentTier}
            solutionType={record.formData.solutionType ?? 'unknown'}
            updatedAt={record.updatedAt}
          />
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No use cases match this filter.</p>
        </div>
      )}
    </div>
  );
}
