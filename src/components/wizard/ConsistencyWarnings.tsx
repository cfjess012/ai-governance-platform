'use client';

interface ConsistencyWarning {
  id: string;
  message: string;
}

/** Business areas and triggers that imply external financial impact */
const FINANCIAL_IMPACT_AREAS = new Set([
  'actuarial',
  'claims',
  'investments',
  'underwriting',
  'finance',
]);
const FINANCIAL_IMPACT_TRIGGERS = new Set([
  'insurance_pricing',
  'investment_advice',
  'credit_lending',
  'financial_info_retrieval',
]);

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

  // Cross-validation: worst outcome vs business area, triggers, and affected population
  const worstOutcome = formData.worstOutcome as string | undefined;
  const businessArea = formData.businessArea as string | undefined;
  const triggers = Array.isArray(formData.highRiskTriggers)
    ? (formData.highRiskTriggers as string[])
    : [];
  const whoAffected = formData.whoAffected as string | undefined;
  const peopleCount = formData.peopleAffectedCount as string | undefined;

  if (worstOutcome && worstOutcome === 'minor') {
    const isFinancialArea = FINANCIAL_IMPACT_AREAS.has(businessArea ?? '');
    const hasFinancialTrigger = triggers.some((t) => FINANCIAL_IMPACT_TRIGGERS.has(t));
    const affectsExternalPeople =
      whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';
    const largeScale = peopleCount === '10000_100000' || peopleCount === 'over_100000';

    if ((isFinancialArea || hasFinancialTrigger) && affectsExternalPeople) {
      warnings.push({
        id: 'outcome-mismatch-financial',
        message:
          'Impact may be understated: this system operates in a financial services area and affects external people, but worst outcome is set to "mildly inconvenienced." Consider whether incorrect outputs could lead someone to make a financial decision they otherwise wouldn\'t.',
      });
    } else if (affectsExternalPeople && largeScale) {
      warnings.push({
        id: 'outcome-mismatch-scale',
        message:
          'Impact may be understated: this system affects a large external population (10,000+) but worst outcome is set to "mildly inconvenienced." Consider the cumulative impact at scale.',
      });
    }
  }

  if (worstOutcome === 'moderate') {
    const hasHighTrigger = triggers.some((t) =>
      [
        'insurance_pricing',
        'investment_advice',
        'credit_lending',
        'hiring_workforce',
        'code_to_production',
        'security_vulnerability_risk',
      ].includes(t),
    );
    if (hasHighTrigger) {
      warnings.push({
        id: 'outcome-mismatch-trigger',
        message:
          'You selected a high-risk trigger but set impact to "wrong information." Systems that influence financial decisions, generate production code, or could create security vulnerabilities typically have at least "significant impact" level risk. Please review.',
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
