/**
 * Unified intake submission.
 *
 * Every intake flow (full guided, card flip, single-page, Layer 1 register)
 * should call this one function to submit a case. It's the only place that:
 *
 *   1. Validates the full IntakeFormData via Zod
 *   2. Runs the Layer 1 router if a router input is available, to tag the
 *      case with regulatory flags and record the lane decision
 *   3. Computes inherent risk via the 5-tier scoring engine
 *   4. Creates the AIUseCase record with correct initial status
 *   5. Persists via the inventory store
 *
 * Before this existed, each intake form had its own slightly-different
 * version of this pipeline, which meant a case submitted via the card flow
 * looked different from one submitted via the guided wizard. One pipeline,
 * one code path.
 *
 * This is a pure function — it does NOT write to the store itself. It
 * returns a complete AIUseCase that the caller (the intake form) passes to
 * `useInventoryStore.addUseCase`. That keeps side effects out of the pure
 * layer so this is unit-testable.
 */

import { classifyIntake } from '@/lib/classification/intake-classifier';
import type { RouterDecision } from '@/lib/classification/intake-router';
import { routeIntake } from '@/lib/classification/intake-router';
import type {
  IntakeLayer1Data,
  Layer1AiType,
  Layer1BusinessArea,
  Layer1LifecycleStage,
  Layer1RiskTouchpoint,
} from '@/lib/questions/intake-layer1-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';
import { intakeSchema } from '@/lib/questions/intake-schema';
import { calculateInherentRisk } from '@/lib/risk/inherent-risk';
import type { AIUseCase, AIUseCaseStatus } from '@/types/inventory';

export interface SubmitIntakeInput {
  /** Fully-validated intake answers. */
  formData: IntakeFormData;
  /**
   * Optional Layer 1 data — only set when the user came through the
   * `/intake/register` flow. When present, the router is run over the
   * Layer 1 answers and the decision is persisted on the case.
   */
  layer1?: IntakeLayer1Data;
  /**
   * Whoever's on the record for this submission. For the POC this is a
   * mock string; in production it comes from SSO.
   */
  submittedBy: string;
  /** Current clock — injectable for deterministic tests. */
  now?: Date;
  /** Optional id suffix — injectable for deterministic tests. */
  idSuffix?: string;
}

export type SubmitIntakeResult =
  | { ok: true; useCase: AIUseCase; routerDecision?: RouterDecision }
  | { ok: false; errors: Record<string, string> };

// ─────────────────────────────────────────────────────────────────────────────
// Derive Layer 1 input from a full IntakeFormData
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map full intake AI types → Layer 1 AI types. Layer 1 has fewer options,
 * so some are lossy. `rag` and `other_not_sure` are unmapped (no Layer 1
 * equivalent) — they just drop.
 */
const AI_TYPE_MAP: Record<string, Layer1AiType | undefined> = {
  generative_ai: 'generative_ai',
  predictive_classification: 'predictive_ml',
  ai_agent: 'ai_agent',
  rpa_with_ai: 'rpa_with_ai',
  computer_vision: 'computer_vision',
  // rag and other_not_sure have no Layer 1 equivalent
};

/**
 * Map full intake high-risk triggers to Layer 1 risk touchpoints.
 * The Layer 1 model uses 8 plain-language options; the full schema has 14
 * technical triggers. This mapping is lossy by design — the router
 * evaluates the plain-language set, not the technical one.
 */
function mapTriggersToTouchpoints(
  triggers: string[],
  dataSensitivity: string[],
): Layer1RiskTouchpoint[] {
  const touchpoints = new Set<Layer1RiskTouchpoint>();

  for (const t of triggers) {
    switch (t) {
      case 'insurance_pricing':
      case 'investment_advice':
      case 'credit_lending':
      case 'financial_info_retrieval':
        touchpoints.add('financial_decisions');
        break;
      case 'hiring_workforce':
        touchpoints.add('employment_decisions');
        break;
      case 'biometric_id':
      case 'emotion_detection':
        touchpoints.add('health_biometric');
        break;
      case 'external_content_generation':
        touchpoints.add('generates_customer_content');
        break;
      case 'code_to_production':
        touchpoints.add('acts_autonomously');
        break;
      // fraud_detection, fine_tuning_llm, proprietary_ip, security_vulnerability_risk,
      // none_of_above — no direct Layer 1 mapping
    }
  }

  // Data sensitivity → touchpoints
  if (
    dataSensitivity.includes('personal_info') ||
    dataSensitivity.includes('customer_confidential')
  ) {
    touchpoints.add('customer_personal_data');
  }
  if (dataSensitivity.includes('health_info')) {
    touchpoints.add('health_biometric');
  }

  if (touchpoints.size === 0) touchpoints.add('none_of_above');
  return Array.from(touchpoints);
}

/**
 * Map the full intake lifecycle stage → Layer 1 lifecycle stage.
 */
function mapLifecycle(stage: string): Layer1LifecycleStage {
  switch (stage) {
    case 'idea_planning':
      return 'planning';
    case 'development_poc':
      return 'building';
    case 'testing_pilot':
      return 'piloting';
    case 'in_use_seeking_approval':
    case 'in_production':
    case 'being_retired':
      return 'live';
    default:
      return 'planning';
  }
}

/**
 * Derive a Layer 1 input from a full IntakeFormData. This is the bridge
 * that lets the router fire for every intake flow, not just Quick Register.
 *
 * The mapping is deliberately lossy — the router only needs the 7 Layer 1
 * fields, not the full 34. Where the full schema has richer data (e.g., 14
 * high-risk triggers vs 8 touchpoints), we map down.
 *
 * TODO: `ownerName` and `ownerEmail` are derived from the combined
 * `useCaseOwner` field using a heuristic split. In production, SSO
 * would provide these directly.
 */
export function deriveLayer1FromIntake(intake: IntakeFormData): IntakeLayer1Data {
  // Parse "Name <email>" or just "Name"
  const ownerRaw = intake.useCaseOwner ?? '';
  const emailMatch = ownerRaw.match(/<([^>]+)>/);
  const ownerEmail = emailMatch ? emailMatch[1] : 'unknown@example.com';
  const ownerName = ownerRaw.replace(/<[^>]*>/g, '').trim() || 'Unknown';

  // Map AI types
  const aiType = (intake.aiType ?? [])
    .map((t) => AI_TYPE_MAP[t])
    .filter((t): t is Layer1AiType => t !== undefined);
  // Ensure at least one — fall back to generative_ai if nothing mapped
  if (aiType.length === 0) aiType.push('generative_ai');

  return {
    useCaseName: intake.useCaseName,
    ownerName,
    ownerEmail,
    businessArea: intake.businessArea as Layer1BusinessArea,
    description: intake.businessProblem ?? intake.howAiHelps ?? '',
    aiType,
    lifecycleStage: mapLifecycle(intake.lifecycleStage),
    riskTouchpoints: mapTriggersToTouchpoints(
      intake.highRiskTriggers ?? [],
      intake.dataSensitivity ?? [],
    ),
  };
}

/**
 * Map the Layer 1 router lane to the initial status for the case.
 * Lightweight-lane cases skip triage and go directly to the lightweight
 * review queue. Blocked cases go to contact_required. Everything else
 * waits on triage.
 */
function laneToInitialStatus(decision: RouterDecision): AIUseCaseStatus {
  switch (decision.lane) {
    case 'lightweight':
      return 'lightweight_review';
    case 'blocked':
      return 'contact_required';
    case 'standard':
    case 'enhanced':
      return 'triage_pending';
  }
}

/**
 * Run the unified submission pipeline. Returns either the fully-built
 * AIUseCase (for the caller to write into the store) or a map of field
 * errors if validation fails.
 */
export function submitIntake(input: SubmitIntakeInput): SubmitIntakeResult {
  const parsed = intakeSchema.safeParse(input.formData);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '');
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { ok: false, errors };
  }

  const data = parsed.data;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const id = `intake-${now.getTime()}-${input.idSuffix ?? Math.random().toString(36).slice(2, 7)}`;

  // Always run the Layer 1 router. If layer1 data was provided directly
  // (Quick Register path), use it. Otherwise, derive it from the full
  // intake — the mapping is lossy but sufficient for lane assignment.
  const layer1 = input.layer1 ?? deriveLayer1FromIntake(data);
  const routerDecision = routeIntake(layer1);

  // Intake-time classification — coarse EU AI Act indicator + risk signals.
  // This is the "preview" classifier, used by the sidebar and persisted
  // on the case so it's visible in the inventory.
  const intakeClass = classifyIntake({
    businessProblem: data.businessProblem,
    howAiHelps: data.howAiHelps,
    businessArea: data.businessArea,
    aiType: data.aiType,
    buildOrAcquire: data.buildOrAcquire,
    highRiskTriggers: data.highRiskTriggers,
    deploymentRegions: data.deploymentRegions,
    worstOutcome: data.worstOutcome,
    humanOversight: data.humanOversight,
  });

  const euAiActTier: AIUseCase['classification']['euAiActTier'] =
    intakeClass.euAiAct.indicator === 'potentially_high_or_prohibited' ||
    intakeClass.euAiAct.indicator === 'likely_high_financial' ||
    intakeClass.euAiAct.indicator === 'likely_high_employment'
      ? 'high'
      : 'pending';

  // 5-tier inherent risk — canonical for triage routing and the inventory.
  const inherentRisk = calculateInherentRisk(data);

  // Explanation string list — merge router reasons (if any) with the
  // intake classifier's risk signals so the inventory shows one unified
  // "why this case scored this way" list.
  const explanation = [
    ...(routerDecision?.firedRules.map((r) => r.reason) ?? []),
    ...intakeClass.riskSignals.map((s) => s.label),
  ];

  const initialStatus = laneToInitialStatus(routerDecision);

  const useCase: AIUseCase = {
    id,
    intake: data,
    classification: {
      euAiActTier,
      riskTier: 'pending',
      overrideTriggered: false,
      explanation,
    },
    inherentRisk,
    routerDecision,
    status: initialStatus,
    timeline: [
      { status: 'submitted', timestamp: nowIso, changedBy: input.submittedBy },
      { status: initialStatus, timestamp: nowIso, changedBy: 'system' },
    ],
    comments: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    submittedBy: input.submittedBy,
  };

  return { ok: true, useCase, routerDecision };
}
