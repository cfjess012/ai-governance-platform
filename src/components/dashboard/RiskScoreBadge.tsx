'use client';

interface RiskScoreBadgeProps {
  score: number | null;
  tier?: string | null;
}

export function RiskScoreBadge({ score, tier }: RiskScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Pending
      </span>
    );
  }

  const colors =
    score > 75
      ? 'bg-red-100 text-red-800'
      : score > 50
        ? 'bg-orange-100 text-orange-800'
        : score > 25
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-green-100 text-green-800';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}
      >
        {score}/100
      </span>
      {tier && <span className="text-xs text-gray-500 capitalize">{tier}</span>}
    </div>
  );
}
