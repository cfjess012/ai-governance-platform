'use client';

interface StatusTimelineProps {
  status: string;
}

const statusOrder = ['draft', 'submitted', 'in_review', 'approved'];

export function StatusTimeline({ status }: StatusTimelineProps) {
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {statusOrder.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-2 h-2 rounded-full ${i <= currentIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
          {i < statusOrder.length - 1 && (
            <div className={`w-4 h-0.5 ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</span>
    </div>
  );
}
