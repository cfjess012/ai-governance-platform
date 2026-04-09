/**
 * Residual risk computation.
 *
 * Inherent risk = the risk of the AI use case BEFORE any mitigations.
 * Residual risk = the risk that REMAINS after applying control credit
 *                 from collected evidence and assessment-stated mitigations.
 *
 * This module is the methodological fix for the most-cited gap in the
 * business-logic audit: a use case with strong controls should score lower
 * residual risk than the same use case with no controls. The previous
 * scoring conflated the two.
 *
 * Design rules:
 *   1. Residual is bounded BELOW by a regulatory floor. You cannot mitigate
 *      yourself out of an EU AI Act high-risk classification. The floor is
 *      derived from inherent rules that are regulatory in origin.
 *   2. Control credit is earned per-mitigation, capped at 2 tiers of
 *      reduction in total. A perfectly mitigated case can drop at most
 *      2 levels (e.g., high → medium).
 *   3. Each mitigation has a stated evidence basis — the user can see
 *      exactly which collected evidence earned the credit. This is what
 *      makes it auditable.
 *   4. The function is pure. No I/O, no React.
 */

import type { AssessmentFormData } from '@/lib/questions/assessment-schema';
import type { InherentRiskTier } from '@/lib/risk/types';
import type { HumanOversightDesign } from '@/types/inventory';
import type { EvidenceArtifact, ResidualRiskResult } from './types';

// Tier order, low → high
const TIER_ORDER: InherentRiskTier[] = ['low', 'medium_low', 'medium', 'medium_high', 'high'];

function tierIndex(tier: InherentRiskTier): number {
  return TIER_ORDER.indexOf(tier);
}

function tierAt(index: number): InherentRiskTier {
  const clamped = Math.max(0, Math.min(TIER_ORDER.length - 1, index));
  return TIER_ORDER[clamped];
}

/** A single mitigation evaluator — returns credit (0-1) and explanation */
type MitigationEvaluator = (
  assessment: AssessmentFormData | undefined,
  evidence: EvidenceArtifact[],
  oversightDesign?: HumanOversightDesign,
) => { credit: number; basis: string };

/**
 * Each mitigation can earn between 0 and 1 control-credit point. The sum
 * is capped at the per-tier maximum (see CONTROL_CREDIT_MAX_BY_TIER below).
 *
 * The mitigations are intentionally biased toward EVIDENCE — a textarea
 * answer earns half-credit at most; a collected and attested artifact earns
 * full credit. This is the change that turns the platform from
 * attestation-only to evidence-driven.
 */
const MITIGATIONS: Array<{ id: string; label: string; evaluate: MitigationEvaluator }> = [
  {
    id: 'human_oversight',
    label: 'Meaningful human oversight',
    evaluate: (assessment, evidence, oversightDesign) => {
      // P5: Full credit (1.0) only for pre-decision review.
      // Partial credit (0.4) for post-decision review WITH documented SLA.
      // Zero for no oversight or undocumented.
      if (oversightDesign?.oversightModel === 'pre_decision_review') {
        return {
          credit: 1.0,
          basis: 'Pre-decision human review — all AI outputs reviewed before action',
        };
      }

      const hasDesignDoc = evidence.some(
        (e) => e.category === 'human_oversight_design' && e.status === 'attested',
      );
      const hasStructuredDesign =
        oversightDesign &&
        oversightDesign.reviewTimeframeSLA &&
        oversightDesign.escalationTriggers &&
        oversightDesign.overrideAuthority;

      if (oversightDesign?.oversightModel === 'post_decision_review' && hasStructuredDesign) {
        return {
          credit: hasDesignDoc ? 0.6 : 0.4,
          basis: hasDesignDoc
            ? 'Post-decision review with documented SLA + attested design doc'
            : 'Post-decision review with documented SLA (design doc not yet attested)',
        };
      }

      if (oversightDesign?.oversightModel === 'spot_check' && hasStructuredDesign) {
        return {
          credit: 0.2,
          basis: 'Spot-check oversight with documented escalation (limited credit)',
        };
      }

      if (assessment?.humanValidatesOutputs === 'yes') {
        return {
          credit: 0.3,
          basis: 'Assessment states humans validate outputs (no structured design)',
        };
      }

      return { credit: 0, basis: 'No meaningful human oversight mechanism in place' };
    },
  },
  {
    id: 'bias_audit',
    label: 'Independent bias / fairness audit',
    evaluate: (assessment, evidence) => {
      const hasAttestedAudit = evidence.some(
        (e) => e.category === 'bias_audit' && e.status === 'attested',
      );
      const hasCollectedAudit = evidence.some(
        (e) => e.category === 'bias_audit' && e.status === 'collected',
      );
      const textOnly =
        !hasAttestedAudit &&
        !hasCollectedAudit &&
        (assessment?.biasFairnessTesting?.length ?? 0) > 50;
      if (hasAttestedAudit) {
        return { credit: 1.0, basis: 'Attested bias / fairness audit report on file' };
      }
      if (hasCollectedAudit) {
        return { credit: 0.6, basis: 'Bias audit collected but not yet attested' };
      }
      if (textOnly) {
        return { credit: 0.2, basis: 'Bias testing described in assessment (no artifact)' };
      }
      return { credit: 0, basis: 'No bias/fairness evaluation evidence' };
    },
  },
  {
    id: 'robustness_testing',
    label: 'Robustness / adversarial testing',
    evaluate: (assessment, evidence) => {
      const hasAttested = evidence.some(
        (e) => e.category === 'robustness_test' && e.status === 'attested',
      );
      const hasCollected = evidence.some(
        (e) => e.category === 'robustness_test' && e.status === 'collected',
      );
      // Note: assessment field for adversarial testing varies; check for any
      // text in the relevant fields. Use a length floor of 50 to avoid the
      // length<10 vibes-check from the original scoring.
      const adversarialDescribed =
        (assessment?.adversarialTesting?.length ?? 0) > 50 ||
        (assessment?.preDeploymentTesting?.length ?? 0) > 100;
      if (hasAttested && adversarialDescribed) {
        return {
          credit: 1.0,
          basis: 'Attested robustness test report + assessment describes adversarial testing',
        };
      }
      if (hasAttested || hasCollected) {
        return { credit: 0.6, basis: 'Robustness test artifact on file' };
      }
      if (adversarialDescribed) {
        return { credit: 0.3, basis: 'Adversarial testing described in assessment (no artifact)' };
      }
      return { credit: 0, basis: 'No robustness or adversarial testing evidence' };
    },
  },
  {
    id: 'monitoring',
    label: 'Drift / performance monitoring',
    evaluate: (assessment, evidence) => {
      const hasMonitoringPlan = evidence.some(
        (e) => e.category === 'monitoring_plan' && e.status === 'attested',
      );
      const driftPlanDescribed = (assessment?.driftMonitoring?.length ?? 0) > 50;
      if (hasMonitoringPlan && driftPlanDescribed) {
        return {
          credit: 1.0,
          basis: 'Attested monitoring plan + assessment describes drift detection',
        };
      }
      if (hasMonitoringPlan) {
        return { credit: 0.6, basis: 'Monitoring plan collected and attested' };
      }
      if (driftPlanDescribed) {
        return { credit: 0.3, basis: 'Drift monitoring described in assessment (no plan doc)' };
      }
      return { credit: 0, basis: 'No drift / monitoring evidence' };
    },
  },
  {
    id: 'incident_response',
    label: 'Documented incident response',
    evaluate: (assessment, evidence) => {
      const hasIRPlan = evidence.some(
        (e) => e.category === 'incident_response_plan' && e.status === 'attested',
      );
      const irExists = assessment?.incidentResponsePlan === 'yes';
      if (hasIRPlan) {
        return { credit: 1.0, basis: 'Attested incident response plan on file' };
      }
      if (irExists) {
        return { credit: 0.3, basis: 'Assessment states an IR plan exists (no document)' };
      }
      return { credit: 0, basis: 'No incident response plan documented' };
    },
  },
  {
    id: 'risk_management',
    label: 'Formal risk management plan',
    evaluate: (_assessment, evidence) => {
      const hasPlan = evidence.some(
        (e) => e.category === 'risk_management_plan' && e.status === 'attested',
      );
      if (hasPlan) {
        return { credit: 1.0, basis: 'Attested risk management plan (EU AI Act Article 9)' };
      }
      return { credit: 0, basis: 'No risk management plan collected' };
    },
  },
  {
    id: 'model_validation',
    label: 'Independent model validation',
    evaluate: (_assessment, evidence) => {
      const hasReport = evidence.some(
        (e) => e.category === 'validation_report' && e.status === 'attested',
      );
      if (hasReport) {
        return { credit: 1.0, basis: 'Attested model validation report (SR 11-7 style)' };
      }
      return { credit: 0, basis: 'No independent validation report' };
    },
  },
];

/**
 * Maximum control credit (in tiers of reduction) by inherent tier.
 *
 * The cap exists because regulators and auditors expect a "floor" that
 * mitigations can't overcome — you cannot make a high-risk Annex III system
 * look low-risk just by collecting evidence.
 */
const CONTROL_CREDIT_MAX_BY_TIER: Record<InherentRiskTier, number> = {
  high: 2, // high → medium minimum
  medium_high: 2, // medium_high → medium_low minimum
  medium: 2, // medium → low minimum
  medium_low: 1, // medium_low → low minimum
  low: 0, // already at the floor
};

/**
 * Determine the regulatory floor — the lowest residual tier the case can
 * legally drop to, given which inherent rules fired.
 *
 * This is intentionally conservative: any rule that came from a regulatory
 * source (EU AI Act, GDPR, NIST, SR 11-7, etc.) sets a floor at one tier
 * below the inherent tier. Non-regulatory rules don't set a floor.
 */
function regulatoryFloor(
  inherentTier: InherentRiskTier,
  regulatoryRulesFired: boolean,
): InherentRiskTier {
  if (!regulatoryRulesFired) {
    // No regulatory rule fired — residual can drop all the way to low.
    return 'low';
  }
  // At most one tier of reduction from a regulatorily-driven case.
  return tierAt(tierIndex(inherentTier) - 1);
}

/**
 * Compute residual risk for a use case.
 *
 * @param inherentTier         The inherent risk tier from the original calculation
 * @param assessment           Optional assessment form data (may be incomplete)
 * @param evidence             All evidence artifacts attached to this case
 * @param regulatoryRulesFired Whether any inherent rule with regulatory origin
 *                             fired (used to compute the floor)
 */
export function calculateResidualRisk(
  inherentTier: InherentRiskTier,
  assessment: AssessmentFormData | undefined,
  evidence: EvidenceArtifact[],
  regulatoryRulesFired: boolean,
  oversightDesign?: HumanOversightDesign,
): ResidualRiskResult {
  const mitigationCredits = MITIGATIONS.map((m) => {
    const result = m.evaluate(assessment, evidence, oversightDesign);
    return {
      id: m.id,
      label: m.label,
      credit: result.credit,
      evidenceBasis: result.basis,
    };
  });

  const totalCredit = mitigationCredits.reduce((sum, m) => sum + m.credit, 0);
  const maxAllowed = CONTROL_CREDIT_MAX_BY_TIER[inherentTier];

  // Each tier of reduction costs ~3.5 credit points (since there are 7
  // mitigations and each can earn up to 1.0 — 7 mitigations averaging 0.5
  // earns ~1 tier; perfect controls earn the full cap of 2 tiers).
  const rawTierReduction = totalCredit / 3.5;
  const cappedTierReduction = Math.min(maxAllowed, rawTierReduction);

  const residualFloor = regulatoryFloor(inherentTier, regulatoryRulesFired);
  const floorIndex = tierIndex(residualFloor);

  // Apply reduction
  const proposedIndex = Math.max(0, Math.round(tierIndex(inherentTier) - cappedTierReduction));
  // Clamp to floor
  const finalIndex = Math.max(proposedIndex, floorIndex);
  const residualTier = tierAt(finalIndex);

  const tiersDropped = tierIndex(inherentTier) - finalIndex;
  const explanation = buildExplanation({
    inherentTier,
    residualTier,
    tiersDropped,
    cappedTierReduction,
    totalCredit,
    maxAllowed,
    residualFloor,
    regulatoryRulesFired,
  });

  return {
    inherentTier,
    residualTier,
    controlCreditApplied: Number.parseFloat(cappedTierReduction.toFixed(2)),
    controlCreditMax: maxAllowed,
    residualFloor,
    mitigationCredits,
    explanation,
    computedAt: new Date().toISOString(),
  };
}

interface ExplainArgs {
  inherentTier: InherentRiskTier;
  residualTier: InherentRiskTier;
  tiersDropped: number;
  cappedTierReduction: number;
  totalCredit: number;
  maxAllowed: number;
  residualFloor: InherentRiskTier;
  regulatoryRulesFired: boolean;
}

function buildExplanation(args: ExplainArgs): string {
  const parts: string[] = [];

  if (args.tiersDropped === 0) {
    parts.push(
      `No control credit applied — residual risk equals inherent risk (${args.inherentTier}).`,
    );
  } else if (args.tiersDropped === 1) {
    parts.push(
      `Control credit reduced residual risk by one tier (${args.inherentTier} → ${args.residualTier}).`,
    );
  } else {
    parts.push(
      `Control credit reduced residual risk by ${args.tiersDropped} tiers (${args.inherentTier} → ${args.residualTier}).`,
    );
  }

  parts.push(
    `Earned ${args.totalCredit.toFixed(1)}/7 mitigation credit (cap of ${args.maxAllowed} tier${args.maxAllowed === 1 ? '' : 's'} reduction at this inherent level).`,
  );

  if (args.regulatoryRulesFired && args.residualTier === args.residualFloor) {
    parts.push(
      `Regulatory floor of "${args.residualFloor}" prevents further reduction — this case has a hard regulatory driver.`,
    );
  }

  return parts.join(' ');
}
