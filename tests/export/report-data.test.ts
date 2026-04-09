import { describe, expect, it } from 'vitest';
import { assembleReportData } from '@/lib/export/report-data';
import type { AIUseCase } from '@/types/inventory';

const minimalCase: AIUseCase = {
  id: 'test-case-1',
  intake: {
    useCaseName: 'Test AI System',
    businessProblem: 'Automates customer support triage',
    howAiHelps: 'Reduces response time by 50%',
    businessArea: 'customer_experience',
    useCaseOwner: 'Jane Smith',
    aiType: ['predictive_classification'],
    deploymentRegions: ['us_only'],
    dataSensitivity: ['customer_confidential'],
    humanOversight: 'human_reviews',
    highRiskTriggers: ['none_of_above'],
    whoAffected: 'external',
    worstOutcome: 'moderate',
    peopleAffectedCount: '1000_10000',
  } as never,
  classification: {
    euAiActTier: 'pending',
    riskTier: 'pending',
    overrideTriggered: false,
    explanation: [],
  },
  status: 'submitted',
  timeline: [
    { status: 'submitted', timestamp: '2026-04-09T12:00:00Z', changedBy: 'jane@example.com' },
  ],
  comments: [],
  createdAt: '2026-04-09T12:00:00Z',
  updatedAt: '2026-04-09T12:00:00Z',
  submittedBy: 'jane@example.com',
};

describe('assembleReportData', () => {
  it('produces all 14 top-level sections with non-empty content for a minimal case', () => {
    const report = assembleReportData(minimalCase);

    // Meta
    expect(report.meta.caseName).toBe('Test AI System');
    expect(report.meta.reportId).toBe('test-case-1');
    expect(report.meta.fileName).toContain('AI_Risk_Assessment_Test_AI_System');

    // Section 1
    expect(report.executiveSummaryNarrative.length).toBeGreaterThan(50);
    expect(report.summaryTable.length).toBe(12);

    // Section 2
    expect(report.systemOverview).toContain('Automates customer support triage');
    expect(report.aiTechnologyType).toContain('Predictive');
    expect(report.dataSources).toContain('customer confidential');
    expect(report.deploymentScope).toContain('us only');
    expect(report.humanOversightDescription).toContain('human reviews');

    // Section 3 — no inherent risk on minimal case
    expect(report.inherentRiskNarrative).toContain('not been completed');

    // Section 5
    expect(report.assessmentOverview).toContain('No assessment completed');
    expect(report.assessorAttestationText).toContain('has not been completed');

    // Section 6
    expect(report.residualMethodology.length).toBeGreaterThan(100);
    expect(report.residualDetermination).toContain('not been computed');

    // Section 7
    expect(report.complianceOverview).toContain('0 of 0');

    // Section 8
    expect(report.evidenceFallbackText).toContain('No evidence');

    // Section 9
    expect(report.exceptionFallbackText).toContain('No governance exceptions');

    // Section 10
    expect(report.humanOversightDesignText).toContain('narrative form');

    // Section 11
    expect(report.reviewScheduleRows.length).toBeGreaterThan(0);

    // Section 12
    expect(report.timelineTable.length).toBe(1);
    expect(report.timelineTable[0].actor).toBe('jane@example.com');

    // Section 13
    expect(report.intakeGroups.length).toBeGreaterThan(0);

    // All string fields are non-empty (no undefined/null)
    for (const [key, val] of Object.entries(report)) {
      if (typeof val === 'string') {
        expect(val.length, `${key} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it('handles missing assessment with correct fallback text', () => {
    const report = assembleReportData(minimalCase);
    expect(report.assessmentOverview).toBe(
      'No assessment completed as of report date. Pre-production risk assessment is required before governance decision.',
    );
  });

  it('handles missing evidence with correct fallback text', () => {
    const report = assembleReportData(minimalCase);
    expect(report.evidenceFallbackText).toContain('No evidence artifacts');
  });

  it('generates a valid executive summary narrative with real values', () => {
    const report = assembleReportData(minimalCase);
    expect(report.executiveSummaryNarrative).toContain('Test AI System');
    expect(report.executiveSummaryNarrative).toContain('Submitted');
  });

  it('generates 12 summary table rows', () => {
    const report = assembleReportData(minimalCase);
    const labels = report.summaryTable.map((r) => r.label);
    expect(labels).toContain('Use Case Name');
    expect(labels).toContain('Business Area');
    expect(labels).toContain('Compliance Completeness');
    expect(labels).toContain('Assigned Reviewer');
  });

  it('produces framework table when inherent risk has applicable frameworks', () => {
    const caseWithRisk: AIUseCase = {
      ...minimalCase,
      inherentRisk: {
        tier: 'high',
        tierDisplay: { tier: 'high', label: 'High', shortLabel: 'High', description: 'Test', badgeClasses: '', color: '', ordinal: 5 },
        dimensions: [
          { id: 'decision_domain', label: 'Decision Domain', score: 3, weight: 0.25, rationale: 'High stakes' },
        ],
        baseScore: 75,
        firedRules: [],
        firedPatterns: [],
        applicableFrameworks: [
          { framework: 'GDPR', reference: 'Article 22', applicabilityReason: 'Automated decisions', obligationType: 'documentation' },
        ],
        topContributors: [{ label: 'High-stakes decisions', source: 'dimension', severity: 'high' }],
        baseTier: 'high',
        pureBaseScore: true,
        computedAt: '2026-04-09T12:00:00Z',
      },
    };

    const report = assembleReportData(caseWithRisk);
    expect(report.dimensionTable.length).toBe(1);
    expect(report.dimensionTable[0].dimension).toBe('Decision Domain');
    expect(report.inherentRiskNarrative).toContain('High');
  });
});
