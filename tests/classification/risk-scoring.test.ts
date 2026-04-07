import { describe, expect, it } from 'vitest';
import { calculateRiskScore } from '@/lib/classification/risk-scoring';

const lowRiskInput = {
  dataTypes: ['public'] as const,
  decisionsAboutIndividuals: 'no' as const,
  geographicScope: ['us_only'] as const,
  expectedUserBase: 'internal_small' as const,
  hasAgentCapabilities: false,
  primaryBusinessActivity: 'research' as const,
};

const highRiskInput = {
  dataTypes: ['pii', 'financial'] as const,
  decisionsAboutIndividuals: 'automated' as const,
  geographicScope: ['eu', 'us_only'] as const,
  expectedUserBase: 'external_broad' as const,
  hasAgentCapabilities: true,
  agentAutonomyLevel: 'broad' as const,
  primaryBusinessActivity: 'underwriting' as const,
};

describe('Risk Scoring', () => {
  it('produces low score for minimal-risk input', () => {
    const result = calculateRiskScore(lowRiskInput);
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.level).toBe('low');
  });

  it('produces critical score for maximum-risk input', () => {
    const result = calculateRiskScore(highRiskInput);
    expect(result.score).toBeGreaterThan(75);
    expect(result.level).toBe('critical');
  });

  it('returns breakdown with all 6 factors', () => {
    const result = calculateRiskScore(lowRiskInput);
    expect(result.breakdown).toHaveLength(6);
  });

  it('returns governance requirements matching the level', () => {
    const low = calculateRiskScore(lowRiskInput);
    expect(low.governanceRequirements).toContain('Standard documentation');

    const high = calculateRiskScore(highRiskInput);
    expect(high.governanceRequirements).toContain('Executive review required');
  });

  it('returns top 3 risk factors', () => {
    const result = calculateRiskScore(highRiskInput);
    expect(result.topRiskFactors.length).toBeLessThanOrEqual(3);
  });

  it('uses max data sensitivity when multiple data types selected', () => {
    const result = calculateRiskScore({
      ...lowRiskInput,
      dataTypes: ['public', 'biometric'],
    });
    // biometric = 95, should use that not public's 5
    const dataSensitivity = result.breakdown.find((b) => b.factor === 'Data Sensitivity');
    expect(dataSensitivity?.rawScore).toBe(95);
  });

  it('uses max geographic score when multiple regions selected', () => {
    const result = calculateRiskScore({
      ...lowRiskInput,
      geographicScope: ['us_only', 'eu'],
    });
    const geo = result.breakdown.find((b) => b.factor === 'Geographic Scope');
    expect(geo?.rawScore).toBe(80); // EU = 80
  });

  it('agent autonomy contributes 0 when no agent capabilities', () => {
    const result = calculateRiskScore({
      ...lowRiskInput,
      hasAgentCapabilities: false,
    });
    const agent = result.breakdown.find((b) => b.factor === 'Agent Autonomy');
    expect(agent?.rawScore).toBe(0);
  });

  it('score is always between 0 and 100', () => {
    const results = [calculateRiskScore(lowRiskInput), calculateRiskScore(highRiskInput)];
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
