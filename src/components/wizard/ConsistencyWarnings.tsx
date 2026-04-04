'use client';

interface ConsistencyWarning {
  id: string;
  message: string;
}

export function getClientConsistencyWarnings(
  formData: Record<string, unknown>,
): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = [];

  if (formData.lifecycleStage === 'in_production' && formData.previouslyReviewed === 'no') {
    warnings.push({
      id: 'production-not-reviewed',
      message:
        'In Production but not previously reviewed. Consider prioritizing governance review.',
    });
  }

  if (formData.strategicPriority === 'enterprise_strategy' && !formData.executiveSponsor) {
    warnings.push({
      id: 'strategy-no-sponsor',
      message: 'Enterprise Strategy selected without an Executive Sponsor.',
    });
  }

  if (formData.lifecycleStage === 'idea_planning' && formData.targetProductionQuarter) {
    const prodQ = String(formData.targetProductionQuarter).toLowerCase();
    const now = new Date();
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    const currentYear = now.getFullYear();
    const currentQStr = `q${currentQ} ${currentYear}`;
    const nextQ = currentQ === 4 ? 1 : currentQ + 1;
    const nextYear = currentQ === 4 ? currentYear + 1 : currentYear;
    const nextQStr = `q${nextQ} ${nextYear}`;

    if (
      prodQ.includes(currentQStr) ||
      prodQ.includes(nextQStr) ||
      prodQ.includes(`q${currentQ}${currentYear}`) ||
      prodQ.includes(`q${nextQ}${nextYear}`)
    ) {
      warnings.push({
        id: 'ideation-soon-production',
        message: 'Ideation stage with production target within one quarter. Timeline may be tight.',
      });
    }
  }

  return warnings;
}

interface ConsistencyWarningsProps {
  formData: Record<string, unknown>;
}

export function ConsistencyWarnings({ formData }: ConsistencyWarningsProps) {
  const warnings = getClientConsistencyWarnings(formData);

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      {warnings.map((w) => (
        <div
          key={w.id}
          className="flex items-start gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-500 animate-fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
          {w.message}
        </div>
      ))}
    </div>
  );
}
