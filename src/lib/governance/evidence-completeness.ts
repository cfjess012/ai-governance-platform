/**
 * Evidence completeness checker.
 *
 * Given a use case's applicable controls (from the controls library) and
 * its collected evidence artifacts, determines which controls are:
 *   - satisfied (at least one acceptable, attested artifact)
 *   - partial (at least one collected but not attested)
 *   - missing (no acceptable evidence)
 *   - expired (the evidence existed but is past its validity window)
 *
 * This is what powers the "compliance checklist" view: it's the difference
 * between "we ask the right questions" and "we know whether you've answered
 * them with proof."
 */

import { applicableControls, type Control } from './controls';
import type { EvidenceArtifact } from './types';

export type ControlStatus = 'satisfied' | 'partial' | 'missing' | 'expired';

export interface ControlCompliance {
  control: Control;
  status: ControlStatus;
  /** Evidence artifacts that map to this control */
  evidence: EvidenceArtifact[];
  /** The most recent satisfying artifact, if any */
  latestEvidence?: EvidenceArtifact;
}

export interface ComplianceReport {
  /** Per-control breakdown */
  controls: ControlCompliance[];
  /** Aggregate counts */
  summary: {
    total: number;
    satisfied: number;
    partial: number;
    missing: number;
    expired: number;
    /** Percentage of mandatory controls in 'satisfied' state (0-100) */
    completenessPct: number;
  };
  /** When this report was generated */
  computedAt: string;
}

/**
 * Determine the status of a single control given its evidence pool.
 */
function evaluateControl(control: Control, evidence: EvidenceArtifact[]): ControlCompliance {
  // Find evidence that's tagged for this control OR whose category is
  // accepted for this control (control tagging is preferred but optional).
  const matching = evidence.filter(
    (e) => e.controlIds.includes(control.id) || control.acceptableEvidence.includes(e.category),
  );

  if (matching.length === 0) {
    return { control, status: 'missing', evidence: [] };
  }

  const attested = matching.filter((e) => e.status === 'attested');
  const collected = matching.filter((e) => e.status === 'collected');
  const expired = matching.filter((e) => e.status === 'expired');

  // Sort by uploadedAt descending — most recent first
  const sortedAttested = [...attested].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const sortedCollected = [...collected].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  if (sortedAttested.length > 0) {
    return {
      control,
      status: 'satisfied',
      evidence: matching,
      latestEvidence: sortedAttested[0],
    };
  }

  if (sortedCollected.length > 0) {
    return {
      control,
      status: 'partial',
      evidence: matching,
      latestEvidence: sortedCollected[0],
    };
  }

  if (expired.length > 0) {
    return { control, status: 'expired', evidence: matching };
  }

  return { control, status: 'missing', evidence: [] };
}

/**
 * Build a complete compliance report for a use case.
 *
 * @param frameworkNames    The framework names from inherent risk's
 *                          applicableFrameworks (e.g., ["EU AI Act", "GDPR"])
 * @param euAiActTier       The EU AI Act tier (drives whether high-risk
 *                          obligations or just transparency obligations apply)
 * @param evidence          All evidence artifacts on the use case
 */
export function buildComplianceReport(
  frameworkNames: string[],
  euAiActTier: string | undefined,
  evidence: EvidenceArtifact[],
): ComplianceReport {
  const applicable = applicableControls(frameworkNames, euAiActTier);
  const controls = applicable.map((c) => evaluateControl(c, evidence));

  const mandatory = controls.filter((c) => c.control.severity === 'mandatory');
  const satisfied = mandatory.filter((c) => c.status === 'satisfied').length;
  const partial = mandatory.filter((c) => c.status === 'partial').length;
  const missing = mandatory.filter((c) => c.status === 'missing').length;
  const expired = mandatory.filter((c) => c.status === 'expired').length;
  const total = mandatory.length;
  const completenessPct = total === 0 ? 100 : Math.round((satisfied / total) * 100);

  return {
    controls,
    summary: {
      total,
      satisfied,
      partial,
      missing,
      expired,
      completenessPct,
    },
    computedAt: new Date().toISOString(),
  };
}

/**
 * P10: Determine which evidence categories are required for a use case
 * based on its applicable controls. This drives the upload form filter —
 * analysts only see categories that are relevant to their case's tier.
 */
export function requiredEvidenceCategories(
  frameworkNames: string[],
  euAiActTier: string | undefined,
): Set<string> {
  const applicable = applicableControls(frameworkNames, euAiActTier);
  const categories = new Set<string>();
  for (const c of applicable) {
    for (const cat of c.acceptableEvidence) {
      categories.add(cat);
    }
  }
  // Always allow 'other' and 'attestation' regardless of tier
  categories.add('other');
  categories.add('attestation');
  return categories;
}
