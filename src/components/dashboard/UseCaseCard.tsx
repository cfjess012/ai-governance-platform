'use client';

import { RiskScoreBadge } from './RiskScoreBadge';
import { StatusTimeline } from './StatusTimeline';

interface UseCaseCardProps {
  id: string;
  name: string;
  description: string;
  status: string;
  riskScore: number | null;
  euAiActTier: string | null;
  agentTier: string | null;
  solutionType: string;
  updatedAt: string;
}

export function UseCaseCard({
  id,
  name,
  description,
  status,
  riskScore,
  euAiActTier,
  agentTier,
  solutionType,
  updatedAt,
}: UseCaseCardProps) {
  return (
    <div className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        </div>
        <RiskScoreBadge score={riskScore} tier={euAiActTier} />
      </div>

      <div className="flex items-center justify-between mt-4">
        <StatusTimeline status={status} />
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="capitalize">{solutionType}</span>
          {agentTier && agentTier !== 'low' && (
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
              Agent: {agentTier}
            </span>
          )}
          <span>{new Date(updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
