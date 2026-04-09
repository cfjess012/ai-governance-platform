import { describe, expect, it } from 'vitest';
import { buildComplianceReport } from '@/lib/governance/evidence-completeness';
import type { EvidenceArtifact } from '@/lib/governance/types';

function makeEvidence(
  category: EvidenceArtifact['category'],
  status: EvidenceArtifact['status'] = 'attested',
): EvidenceArtifact {
  return {
    id: `evd-${category}`,
    category,
    title: 'doc',
    fileName: 'doc.pdf',
    fileRef: 'local://x',
    fileSize: 1000,
    mimeType: 'application/pdf',
    status,
    controlIds: [],
    uploadedAt: '2026-04-08T00:00:00.000Z',
    uploadedBy: 'tester',
  };
}

describe('buildComplianceReport', () => {
  it('returns empty report when no frameworks apply', () => {
    const report = buildComplianceReport([], undefined, []);
    expect(report.controls).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.summary.completenessPct).toBe(100);
  });

  it('marks all controls missing when no evidence collected', () => {
    const report = buildComplianceReport(['EU AI Act'], 'high', []);
    expect(report.controls.length).toBeGreaterThan(0);
    expect(report.controls.every((c) => c.status === 'missing')).toBe(true);
    expect(report.summary.completenessPct).toBe(0);
  });

  it('counts a control as satisfied when an attested evidence in its accepted category exists', () => {
    const report = buildComplianceReport(['EU AI Act'], 'high', [
      makeEvidence('risk_management_plan'),
    ]);
    const art9 = report.controls.find((c) => c.control.id === 'eu-ai-act-art-9');
    expect(art9?.status).toBe('satisfied');
  });

  it('counts a control as partial when only collected (not attested) evidence exists', () => {
    const report = buildComplianceReport(['EU AI Act'], 'high', [
      makeEvidence('risk_management_plan', 'collected'),
    ]);
    const art9 = report.controls.find((c) => c.control.id === 'eu-ai-act-art-9');
    expect(art9?.status).toBe('partial');
  });

  it('only includes EU AI Act Article 50 (transparency) when tier is not high', () => {
    const limitedReport = buildComplianceReport(['EU AI Act'], 'limited', []);
    const ids = limitedReport.controls.map((c) => c.control.id);
    expect(ids).toContain('eu-ai-act-art-50');
    expect(ids).not.toContain('eu-ai-act-art-9');
  });

  it('completeness percentage is computed across mandatory controls only', () => {
    const report = buildComplianceReport(['GDPR'], undefined, [makeEvidence('dpia')]);
    // GDPR has 2 controls (Art 22 + Art 35); dpia satisfies only Art 35
    expect(report.summary.satisfied).toBe(1);
    expect(report.summary.total).toBe(2);
    expect(report.summary.completenessPct).toBe(50);
  });
});
