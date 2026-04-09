import { describe, expect, it } from 'vitest';
import { calculateResidualRisk } from '@/lib/governance/residual-risk';
import type { EvidenceArtifact } from '@/lib/governance/types';

function makeEvidence(
  category: EvidenceArtifact['category'],
  status: EvidenceArtifact['status'] = 'attested',
): EvidenceArtifact {
  return {
    id: `evd-${category}-${status}`,
    category,
    title: `${category} doc`,
    fileName: 'doc.pdf',
    fileRef: 'local://x',
    fileSize: 1000,
    mimeType: 'application/pdf',
    status,
    controlIds: [],
    uploadedAt: '2026-04-08T00:00:00.000Z',
    uploadedBy: 'tester',
    attestation:
      status === 'attested'
        ? {
            attestedBy: 'tester',
            attestedRole: 'Risk Officer',
            attestedAt: '2026-04-08T00:00:00.000Z',
          }
        : undefined,
  };
}

describe('calculateResidualRisk', () => {
  it('returns inherent tier with zero credit when no evidence and no assessment', () => {
    const result = calculateResidualRisk('high', undefined, [], false);
    expect(result.inherentTier).toBe('high');
    expect(result.residualTier).toBe('high');
    expect(result.controlCreditApplied).toBe(0);
  });

  it('drops one tier when several mitigations earn partial credit (no regulatory floor)', () => {
    const evidence = [
      makeEvidence('bias_audit'),
      makeEvidence('robustness_test'),
      makeEvidence('monitoring_plan'),
      makeEvidence('incident_response_plan'),
    ];
    const result = calculateResidualRisk('high', undefined, evidence, false);
    // 4 attested categories — should earn enough credit to drop at least one tier
    expect(result.residualTier).not.toBe('high');
    expect(result.controlCreditApplied).toBeGreaterThan(0);
  });

  it('respects the regulatory floor — cannot drop more than one tier when regulatory rules fired', () => {
    // Pile on every mitigation
    const evidence: EvidenceArtifact[] = [
      makeEvidence('bias_audit'),
      makeEvidence('robustness_test'),
      makeEvidence('monitoring_plan'),
      makeEvidence('incident_response_plan'),
      makeEvidence('risk_management_plan'),
      makeEvidence('validation_report'),
      makeEvidence('human_oversight_design'),
    ];
    const result = calculateResidualRisk(
      'high',
      {
        humanValidatesOutputs: 'yes',
        biasFairnessTesting: 'detailed bias testing description with metrics and protected classes',
        adversarialTesting: 'detailed adversarial testing description with edge cases',
        preDeploymentTesting: 'detailed testing description more than fifty characters long here',
        driftMonitoring: 'detailed drift monitoring description more than fifty characters long',
        incidentResponsePlan: 'yes',
      } as never,
      evidence,
      true, // regulatory rule fired
    );
    // High → at most medium_high (one tier reduction is the floor)
    expect(result.residualTier).toBe('medium_high');
    expect(result.residualFloor).toBe('medium_high');
  });

  it('low inherent tier cannot drop further', () => {
    const evidence = [
      makeEvidence('bias_audit'),
      makeEvidence('monitoring_plan'),
      makeEvidence('risk_management_plan'),
    ];
    const result = calculateResidualRisk('low', undefined, evidence, false);
    expect(result.residualTier).toBe('low');
    expect(result.controlCreditMax).toBe(0);
  });

  it('collected (not attested) evidence earns less credit than attested', () => {
    const collectedOnly = calculateResidualRisk(
      'high',
      undefined,
      [makeEvidence('bias_audit', 'collected')],
      false,
    );
    const attested = calculateResidualRisk(
      'high',
      undefined,
      [makeEvidence('bias_audit', 'attested')],
      false,
    );
    expect(attested.controlCreditApplied).toBeGreaterThan(collectedOnly.controlCreditApplied);
  });

  it('mitigation breakdown explains every credit earned', () => {
    const result = calculateResidualRisk('medium', undefined, [makeEvidence('bias_audit')], false);
    const biasMitigation = result.mitigationCredits.find((m) => m.id === 'bias_audit');
    expect(biasMitigation).toBeDefined();
    expect(biasMitigation?.credit).toBeGreaterThan(0);
    expect(biasMitigation?.evidenceBasis).toContain('bias');
  });

  it('explanation describes the tier change in plain language', () => {
    const result = calculateResidualRisk(
      'high',
      undefined,
      [
        makeEvidence('bias_audit'),
        makeEvidence('robustness_test'),
        makeEvidence('monitoring_plan'),
        makeEvidence('risk_management_plan'),
      ],
      false,
    );
    expect(result.explanation).toMatch(/reduce|reduction|tier/);
  });
});
