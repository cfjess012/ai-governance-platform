import { describe, expect, it } from 'vitest';
import {
  buildFallbackAnalysis,
  normalizeAnalysis,
  overallRiskFromFindings,
} from '@/lib/governance-analysis/parser';

describe('normalizeAnalysis', () => {
  it('returns an all-UNKNOWN structure when given empty input', () => {
    const result = normalizeAnalysis({}, 'test');
    expect(result.confidenceScore).toBe(0);
    expect(result.summary).toBe('No summary provided by the analysis.');
    expect(result.strengths).toEqual([]);
    expect(result.concerns).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.intendedUse.primaryUseCases).toBe('UNKNOWN');
    expect(result.riskAssessment.hallucination.level).toBe('UNKNOWN');
    expect(result.riskAssessment.bias.level).toBe('UNKNOWN');
    expect(result.riskAssessment.security.level).toBe('UNKNOWN');
    expect(result.riskAssessment.misuse.level).toBe('UNKNOWN');
    expect(result.openGaps).toEqual([]);
    expect(result.generatedBy).toBe('test');
    expect(result.generatedAt).toBeTruthy();
  });

  it('preserves valid string fields and trims whitespace', () => {
    const result = normalizeAnalysis(
      {
        summary: '  This is the verdict.  ',
        intendedUse: { primaryUseCases: 'Customer support chat' },
      },
      'qwen',
    );
    expect(result.summary).toBe('This is the verdict.');
    expect(result.intendedUse.primaryUseCases).toBe('Customer support chat');
  });

  it('clamps confidence score to 0-100 and rounds floats', () => {
    expect(normalizeAnalysis({ confidenceScore: 150 }).confidenceScore).toBe(100);
    expect(normalizeAnalysis({ confidenceScore: -20 }).confidenceScore).toBe(0);
    expect(normalizeAnalysis({ confidenceScore: 73.6 }).confidenceScore).toBe(74);
    expect(normalizeAnalysis({ confidenceScore: 'not a number' }).confidenceScore).toBe(0);
  });

  it('filters non-string entries from string arrays', () => {
    const result = normalizeAnalysis({
      strengths: ['valid', 42, null, '  ', 'another'],
      concerns: 'not an array',
    });
    expect(result.strengths).toEqual(['valid', 'another']);
    expect(result.concerns).toEqual([]);
  });

  it('normalizes risk levels case-insensitively and rejects invalid values', () => {
    const result = normalizeAnalysis({
      riskAssessment: {
        hallucination: { level: 'high', justification: 'Frequent fabrications.' },
        bias: { level: 'Medium', justification: 'Skewed corpus.' },
        security: { level: 'NUCLEAR', justification: 'Bad value.' },
        misuse: { title: 'Misuse risk', level: 'low', justification: 'Sandboxed.' },
      },
    });
    expect(result.riskAssessment.hallucination.level).toBe('HIGH');
    expect(result.riskAssessment.bias.level).toBe('MEDIUM');
    expect(result.riskAssessment.security.level).toBe('UNKNOWN');
    expect(result.riskAssessment.misuse.level).toBe('LOW');
    expect(result.riskAssessment.misuse.title).toBe('Misuse risk');
  });

  it('extracts open gaps and skips malformed entries', () => {
    const result = normalizeAnalysis({
      openGaps: [
        { title: 'Missing eval', governanceRisk: 'No public benchmarks.' },
        null,
        'string entry',
        { title: 'Unclear retention' },
      ],
    });
    expect(result.openGaps).toHaveLength(2);
    expect(result.openGaps[0]).toEqual({
      title: 'Missing eval',
      governanceRisk: 'No public benchmarks.',
    });
    expect(result.openGaps[1].title).toBe('Unclear retention');
    expect(result.openGaps[1].governanceRisk).toBe('No explanation provided.');
  });

  it('handles non-object top-level input gracefully', () => {
    expect(normalizeAnalysis(null).summary).toBe('No summary provided by the analysis.');
    expect(normalizeAnalysis('garbage').confidenceScore).toBe(0);
    expect(normalizeAnalysis(42).strengths).toEqual([]);
  });
});

describe('buildFallbackAnalysis', () => {
  it('produces a complete UNKNOWN-shaped analysis', () => {
    const fallback = buildFallbackAnalysis('offline');
    expect(fallback.generatedBy).toBe('offline');
    expect(fallback.confidenceScore).toBe(0);
    expect(fallback.intendedUse.primaryUseCases).toBe('UNKNOWN');
    expect(fallback.compliance.frameworkAlignment).toBe('UNKNOWN');
  });
});

describe('overallRiskFromFindings', () => {
  it('returns the highest severity across the four findings', () => {
    const analysis = normalizeAnalysis({
      riskAssessment: {
        hallucination: { level: 'low', justification: 'x' },
        bias: { level: 'medium', justification: 'x' },
        security: { level: 'high', justification: 'x' },
        misuse: { level: 'low', justification: 'x' },
      },
    });
    expect(overallRiskFromFindings(analysis)).toBe('HIGH');
  });

  it('returns UNKNOWN when all findings are unassessed', () => {
    expect(overallRiskFromFindings(buildFallbackAnalysis('test'))).toBe('UNKNOWN');
  });

  it('treats LOW as the floor when no MEDIUM/HIGH present', () => {
    const analysis = normalizeAnalysis({
      riskAssessment: {
        hallucination: { level: 'low', justification: 'x' },
        bias: { level: 'low', justification: 'x' },
        security: { level: 'low', justification: 'x' },
        misuse: { level: 'low', justification: 'x' },
      },
    });
    expect(overallRiskFromFindings(analysis)).toBe('LOW');
  });
});
