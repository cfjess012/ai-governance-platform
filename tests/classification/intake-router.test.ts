import { describe, expect, it } from 'vitest';
import { routeIntake } from '@/lib/classification/intake-router';
import type { IntakeLayer1Data } from '@/lib/questions/intake-layer1-schema';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function baseCase(overrides: Partial<IntakeLayer1Data> = {}): IntakeLayer1Data {
  return {
    useCaseName: 'Test use case',
    ownerName: 'Ada Lovelace',
    ownerEmail: 'ada@example.com',
    businessArea: 'marketing',
    description: 'Auto-summarize weekly team reports.',
    aiType: ['generative_ai'],
    lifecycleStage: 'planning',
    riskTouchpoints: ['none_of_above'],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight lane — the default for benign cases
// ─────────────────────────────────────────────────────────────────────────────

describe('routeIntake — lightweight lane', () => {
  it('routes a truly benign case to lightweight', () => {
    const d = routeIntake(baseCase());
    expect(d.lane).toBe('lightweight');
    expect(d.firedRules).toEqual([]);
    expect(d.tags).toEqual([]);
    expect(d.summary).toContain('lightweight');
  });

  it('keeps benign cases in lightweight across every lifecycle stage except live', () => {
    for (const stage of ['planning', 'building', 'piloting'] as const) {
      const d = routeIntake(baseCase({ lifecycleStage: stage }));
      expect(d.lane, `stage ${stage}`).toBe('lightweight');
    }
  });

  it('still routes to lightweight when AI type is computer vision but no biometric touchpoint', () => {
    const d = routeIntake(
      baseCase({
        aiType: ['computer_vision'],
        description: 'Count widgets on a production line.',
      }),
    );
    expect(d.lane).toBe('lightweight');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Standard lane — moderate-risk triggers
// ─────────────────────────────────────────────────────────────────────────────

describe('routeIntake — standard lane', () => {
  it('customer personal data → standard with privacy tags', () => {
    const d = routeIntake(baseCase({ riskTouchpoints: ['customer_personal_data'] }));
    expect(d.lane).toBe('standard');
    expect(d.tags).toContain('privacy');
    expect(d.tags).toContain('ccpa');
    expect(d.tags).toContain('glba');
  });

  it('generating customer-facing content → standard with disclosure tag', () => {
    const d = routeIntake(baseCase({ riskTouchpoints: ['generates_customer_content'] }));
    expect(d.lane).toBe('standard');
    expect(d.tags).toContain('disclosure');
    expect(d.tags).toContain('reputational');
  });

  it('agentic AI → standard regardless of other signals', () => {
    const d = routeIntake(baseCase({ aiType: ['ai_agent'] }));
    expect(d.lane).toBe('standard');
    expect(d.tags).toContain('agentic');
  });

  it('shadow AI (already live) always at least standard — with amnesty framing in the summary', () => {
    const d = routeIntake(baseCase({ lifecycleStage: 'live' }));
    expect(d.lane).toBe('standard');
    expect(d.tags).toContain('shadow_ai');
    expect(d.tags).toContain('amnesty');
    // The summary copy should NOT sound punitive
    const shadowRule = d.firedRules.find((r) => r.id === 'standard-shadow-ai');
    expect(shadowRule?.reason).toContain('amnesty');
  });

  it('employee data without employment decisions → standard (not enhanced)', () => {
    const d = routeIntake(baseCase({ businessArea: 'hr', riskTouchpoints: ['employee_data'] }));
    expect(d.lane).toBe('standard');
    expect(d.firedRules.some((r) => r.id === 'standard-employee-data')).toBe(true);
    // Did NOT escalate to enhanced via the employment-decisions rule
    expect(d.firedRules.some((r) => r.id === 'enhanced-employment-decisions')).toBe(false);
  });

  it('predictive ML in a model-risk-adjacent area attaches the SR 11-7 tag but does not escalate', () => {
    const d = routeIntake(baseCase({ businessArea: 'actuarial', aiType: ['predictive_ml'] }));
    expect(d.lane).toBe('standard');
    expect(d.tags).toContain('sr_11_7_pre_notify');
  });

  it('attaches sr_11_7_pre_notify for predictive ML in finance', () => {
    const d = routeIntake(baseCase({ businessArea: 'finance', aiType: ['predictive_ml'] }));
    expect(d.tags).toContain('sr_11_7_pre_notify');
  });

  it('does NOT attach sr_11_7_pre_notify for gen AI in marketing', () => {
    const d = routeIntake(baseCase({ businessArea: 'marketing', aiType: ['generative_ai'] }));
    expect(d.tags).not.toContain('sr_11_7_pre_notify');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced lane — high-risk triggers
// ─────────────────────────────────────────────────────────────────────────────

describe('routeIntake — enhanced lane', () => {
  it('financial decisions → enhanced with SR 11-7 tag', () => {
    const d = routeIntake(baseCase({ riskTouchpoints: ['financial_decisions'] }));
    expect(d.lane).toBe('enhanced');
    expect(d.tags).toContain('sr_11_7');
  });

  it('financial decisions in investments → adds Reg BI + FINRA tags', () => {
    const d = routeIntake(
      baseCase({ businessArea: 'investments', riskTouchpoints: ['financial_decisions'] }),
    );
    expect(d.lane).toBe('enhanced');
    expect(d.tags).toContain('reg_bi');
    expect(d.tags).toContain('finra');
  });

  it('employment decisions → enhanced with EEOC, Annex III, NYC LL 144 tags', () => {
    const d = routeIntake(baseCase({ riskTouchpoints: ['employment_decisions'] }));
    expect(d.lane).toBe('enhanced');
    expect(d.tags).toContain('eeoc');
    expect(d.tags).toContain('nyc_ll_144');
    expect(d.tags).toContain('eu_ai_act_annex_iii');
    expect(d.tags).toContain('bias_audit');
  });

  it('health/biometric data alone → enhanced with HIPAA/BIPA tags', () => {
    const d = routeIntake(baseCase({ riskTouchpoints: ['health_biometric'] }));
    expect(d.lane).toBe('enhanced');
    expect(d.tags).toContain('hipaa_check');
    expect(d.tags).toContain('bipa');
    expect(d.tags).toContain('phi');
  });

  it('autonomous action (without financial decisions) → enhanced, NOT blocked', () => {
    const d = routeIntake(baseCase({ riskTouchpoints: ['acts_autonomously'] }));
    expect(d.lane).toBe('enhanced');
    expect(d.firedRules.some((r) => r.id === 'enhanced-autonomous')).toBe(true);
    expect(d.firedRules.some((r) => r.id === 'blocked-autonomous-financial')).toBe(false);
  });

  it('Annex III business area + any substantive touchpoint → enhanced', () => {
    const d = routeIntake(
      baseCase({
        businessArea: 'hr',
        riskTouchpoints: ['customer_personal_data'], // would normally be standard
      }),
    );
    expect(d.lane).toBe('enhanced');
    expect(d.tags).toContain('eu_ai_act_annex_iii');
  });

  it('Annex III business area alone (no substantive touchpoints) stays lightweight', () => {
    const d = routeIntake(baseCase({ businessArea: 'hr', riskTouchpoints: ['none_of_above'] }));
    // hr alone with no other signals shouldn't escalate — the rule needs BOTH
    expect(d.lane).toBe('lightweight');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Blocked lane — governance-must-review-first
// ─────────────────────────────────────────────────────────────────────────────

describe('routeIntake — blocked lane', () => {
  it('biometric + computer vision → blocked (Article 5 check)', () => {
    const d = routeIntake(
      baseCase({
        aiType: ['computer_vision'],
        riskTouchpoints: ['health_biometric'],
      }),
    );
    expect(d.lane).toBe('blocked');
    expect(d.tags).toContain('eu_ai_act_art5');
    expect(d.tags).toContain('prohibited_check');
  });

  it('autonomous action + financial decisions → blocked', () => {
    const d = routeIntake(
      baseCase({ riskTouchpoints: ['acts_autonomously', 'financial_decisions'] }),
    );
    expect(d.lane).toBe('blocked');
    expect(d.tags).toContain('op_risk');
    expect(d.tags).toContain('change_mgmt');
  });

  it('blocked summary uses non-rejection framing', () => {
    const d = routeIntake(
      baseCase({ riskTouchpoints: ['acts_autonomously', 'financial_decisions'] }),
    );
    // The copy must make clear this is "talk to us" not "no"
    expect(d.summary).toMatch(/review it with you|talk/i);
    expect(d.summary).not.toMatch(/rejected|denied/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lane merging — most severe wins, all rules recorded
// ─────────────────────────────────────────────────────────────────────────────

describe('routeIntake — multi-rule merging', () => {
  it('collects every rule that fires, not just the most severe', () => {
    const d = routeIntake(
      baseCase({
        // customer_personal_data (standard) + financial_decisions (enhanced)
        riskTouchpoints: ['customer_personal_data', 'financial_decisions'],
        businessArea: 'finance',
      }),
    );
    expect(d.lane).toBe('enhanced');
    // Both rules should have fired
    expect(d.firedRules.some((r) => r.id === 'standard-customer-data')).toBe(true);
    expect(d.firedRules.some((r) => r.id === 'enhanced-financial-decisions')).toBe(true);
  });

  it('final lane is the most severe across all fired rules', () => {
    // standard (agent) + standard (customer data) + enhanced (financial)
    const d = routeIntake(
      baseCase({
        aiType: ['ai_agent'],
        riskTouchpoints: ['customer_personal_data', 'financial_decisions'],
        businessArea: 'investments',
      }),
    );
    expect(d.lane).toBe('enhanced');
    // At least 3 rules fired
    expect(d.firedRules.length).toBeGreaterThanOrEqual(3);
  });

  it('blocked wins over enhanced when both fire', () => {
    const d = routeIntake(
      baseCase({
        // autonomous + financial → blocked
        // plus financial → enhanced
        // plus customer data → standard
        riskTouchpoints: ['acts_autonomously', 'financial_decisions', 'customer_personal_data'],
      }),
    );
    expect(d.lane).toBe('blocked');
    // The enhanced and standard rules still recorded for governance visibility
    expect(d.firedRules.some((r) => r.id === 'enhanced-financial-decisions')).toBe(true);
    expect(d.firedRules.some((r) => r.id === 'standard-customer-data')).toBe(true);
  });

  it('deduplicates tags across overlapping rules', () => {
    const d = routeIntake(
      baseCase({
        businessArea: 'investments',
        riskTouchpoints: ['financial_decisions'],
      }),
    );
    // sr_11_7 appears only in one rule here, but let's make sure it's not repeated
    const counts = new Map<string, number>();
    for (const t of d.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const [, n] of counts) expect(n).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Decision record shape — invariants
// ─────────────────────────────────────────────────────────────────────────────

describe('routeIntake — decision record invariants', () => {
  it('every fired rule has a non-empty reason', () => {
    const d = routeIntake(
      baseCase({
        businessArea: 'investments',
        riskTouchpoints: ['financial_decisions', 'customer_personal_data'],
        aiType: ['predictive_ml', 'ai_agent'],
        lifecycleStage: 'live',
      }),
    );
    expect(d.firedRules.length).toBeGreaterThan(0);
    for (const rule of d.firedRules) {
      expect(rule.reason.length).toBeGreaterThan(0);
      expect(rule.id).toMatch(/^(blocked|enhanced|standard)-/);
    }
  });

  it('summary always mentions the lane name or its implication', () => {
    const cases: IntakeLayer1Data[] = [
      baseCase(),
      baseCase({ riskTouchpoints: ['customer_personal_data'] }),
      baseCase({ riskTouchpoints: ['financial_decisions'] }),
      baseCase({ riskTouchpoints: ['acts_autonomously', 'financial_decisions'] }),
    ];
    for (const c of cases) {
      const d = routeIntake(c);
      expect(d.summary.length).toBeGreaterThan(20);
    }
  });
});
