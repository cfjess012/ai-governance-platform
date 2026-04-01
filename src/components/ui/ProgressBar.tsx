'use client';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ percentage, label, showPercentage = true }: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
        {showPercentage && <span className="text-sm text-gray-500">{clampedPercentage}%</span>}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
