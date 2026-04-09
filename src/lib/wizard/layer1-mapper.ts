/**
 * Layer 1 → full IntakeFormData mapper.
 *
 * Translates the 7-field Layer 1 registration into a full IntakeFormData
 * payload that the existing classifier, inventory store, and inventory
 * views all already understand. This serves two purposes:
 *
 *   1. **Lightweight lane direct submission** — when the router decides
 *      a case is low-risk, we submit it immediately with sensible
 *      defaults for the fields Layer 1 didn't ask about. No second form.
 *
 *   2. **Standard / enhanced lane pre-fill** — when the router pushes
 *      the user into the existing full forms (card flow, single-page,
 *      or guided shell), we pre-fill their answers from Layer 1 so
 *      users don't re-type what they already told us.
 *
 * Pure function, no React, no store access.
 */

import type {
  IntakeLayer1Data,
  Layer1AiType,
  Layer1LifecycleStage,
  Layer1RiskTouchpoint,
} from '@/lib/questions/intake-layer1-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';

// ─────────────────────────────────────────────────────────────────────────────
// Per-field mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Layer 1 collapses 6 lifecycle stages into 4. Map back to the full
 * schema using the most common interpretation of each.
 */
function mapLifecycleStage(stage: Layer1LifecycleStage): IntakeFormData['lifecycleStage'] {
  switch (stage) {
    case 'planning':
      return 'idea_planning';
    case 'building':
      return 'development_poc';
    case 'piloting':
      return 'testing_pilot';
    case 'live':
      // "Live" in Layer 1 means "already running" — the shadow-AI case.
      // The amnesty lane wants to know this is a retroactive registration,
      // not a normal launch, so map to in_use_seeking_approval rather
      // than in_production.
      return 'in_use_seeking_approval';
  }
}

/**
 * Every Layer 1 AI type maps directly to an existing full-schema value.
 * `predictive_ml` is the Layer 1 label for `predictive_classification`.
 */
function mapAiType(types: Layer1AiType[]): IntakeFormData['aiType'] {
  const map: Record<Layer1AiType, IntakeFormData['aiType'][number]> = {
    generative_ai: 'generative_ai',
    predictive_ml: 'predictive_classification',
    ai_agent: 'ai_agent',
    rpa_with_ai: 'rpa_with_ai',
    computer_vision: 'computer_vision',
  };
  // De-dupe in case the same underlying value appears twice.
  return Array.from(new Set(types.map((t) => map[t])));
}

/**
 * Map Layer 1 risk touchpoints into the full schema's `highRiskTriggers`.
 *
 * Context-aware: when `financial_decisions` is picked, we choose the
 * specific trigger (insurance_pricing / credit_lending / investment_advice)
 * based on the business area, rather than the generic
 * `financial_info_retrieval`.
 */
function mapHighRiskTriggers(
  touchpoints: Layer1RiskTouchpoint[],
  businessArea: IntakeFormData['businessArea'],
): IntakeFormData['highRiskTriggers'] {
  const triggers = new Set<IntakeFormData['highRiskTriggers'][number]>();

  for (const tp of touchpoints) {
    switch (tp) {
      case 'financial_decisions':
        if (businessArea === 'investments') triggers.add('investment_advice');
        else if (businessArea === 'actuarial' || businessArea === 'claims')
          triggers.add('insurance_pricing');
        else if (businessArea === 'finance') triggers.add('credit_lending');
        else triggers.add('financial_info_retrieval');
        break;
      case 'employment_decisions':
        triggers.add('hiring_workforce');
        break;
      case 'generates_customer_content':
        triggers.add('external_content_generation');
        break;
      case 'acts_autonomously':
        triggers.add('code_to_production');
        break;
      case 'health_biometric':
        triggers.add('biometric_id');
        break;
      case 'customer_personal_data':
        // P3: customer PII processing IS a high-risk trigger (GDPR Art 35, CCPA)
        triggers.add('processes_customer_pii');
        break;
      case 'employee_data':
      case 'none_of_above':
        // Not a high-risk trigger on its own.
        break;
    }
  }

  if (triggers.size === 0) {
    triggers.add('none_of_above');
  }

  return Array.from(triggers);
}

/**
 * Map Layer 1 risk touchpoints into data sensitivity answers. Defaults to
 * `internal` when nothing sensitive was picked.
 */
function mapDataSensitivity(
  touchpoints: Layer1RiskTouchpoint[],
): IntakeFormData['dataSensitivity'] {
  const sensitivity = new Set<IntakeFormData['dataSensitivity'][number]>();

  for (const tp of touchpoints) {
    switch (tp) {
      case 'customer_personal_data':
        sensitivity.add('personal_info');
        sensitivity.add('customer_confidential');
        break;
      case 'employee_data':
        sensitivity.add('personal_info');
        break;
      case 'financial_decisions':
        sensitivity.add('regulated_financial');
        break;
      case 'health_biometric':
        sensitivity.add('health_info');
        break;
      default:
        break;
    }
  }

  if (sensitivity.size === 0) {
    sensitivity.add('internal');
  }

  return Array.from(sensitivity);
}

/**
 * Infer who's affected from Layer 1 touchpoints. Customer data or
 * customer-facing content → external. Employee data without customer
 * touch → internal_only. Default: internal_only.
 */
function mapWhoAffected(touchpoints: Layer1RiskTouchpoint[]): IntakeFormData['whoAffected'] {
  if (
    touchpoints.includes('customer_personal_data') ||
    touchpoints.includes('generates_customer_content')
  ) {
    return 'external';
  }
  return 'internal_only';
}

function mapWhoUses(touchpoints: Layer1RiskTouchpoint[]): IntakeFormData['whoUsesSystem'] {
  // If it touches customer data or generates customer-facing content,
  // it's probably used externally too. Conservative default otherwise.
  if (touchpoints.includes('generates_customer_content')) return 'external_only';
  if (touchpoints.includes('customer_personal_data')) return 'both';
  return 'internal_only';
}

/**
 * Infer worst-case outcome from risk touchpoints. The more serious the
 * touchpoints, the higher the default — but only the classifier's
 * baseline. Users on the enhanced path will revisit this in Layer 2.
 */
function mapWorstOutcome(touchpoints: Layer1RiskTouchpoint[]): IntakeFormData['worstOutcome'] {
  if (
    touchpoints.includes('financial_decisions') ||
    touchpoints.includes('employment_decisions') ||
    touchpoints.includes('health_biometric') ||
    touchpoints.includes('acts_autonomously')
  ) {
    return 'significant';
  }
  if (
    touchpoints.includes('customer_personal_data') ||
    touchpoints.includes('generates_customer_content')
  ) {
    return 'moderate';
  }
  return 'minor';
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Produce a full IntakeFormData from a Layer 1 registration. Fields that
 * Layer 1 didn't ask about are filled with conservative defaults. The
 * result passes `intakeSchema.safeParse` so it can be submitted via the
 * existing `/api/intake/submit` endpoint.
 */
export function mapLayer1ToIntake(input: IntakeLayer1Data): IntakeFormData {
  const description = input.description.trim();
  const paddedDescription =
    description.length >= 10
      ? description
      : `${description} (registered via Layer 1 quick register).`;

  return {
    useCaseName: input.useCaseName.trim(),
    useCaseOwner: `${input.ownerName.trim()} <${input.ownerEmail.trim()}>`,
    executiveSponsor: 'Pending — to be confirmed at triage',
    businessArea: input.businessArea,
    businessProblem: paddedDescription,
    howAiHelps: paddedDescription,
    aiType: mapAiType(input.aiType),
    buildOrAcquire: 'not_sure_yet',
    thirdPartyInvolved: 'no',
    usesFoundationModel: input.aiType.includes('generative_ai') ? 'yes' : 'dont_know',
    deploymentRegions: ['us_only'],
    lifecycleStage: mapLifecycleStage(input.lifecycleStage),
    previouslyReviewed: 'no',
    highRiskTriggers: mapHighRiskTriggers(input.riskTouchpoints, input.businessArea),
    whoUsesSystem: mapWhoUses(input.riskTouchpoints),
    whoAffected: mapWhoAffected(input.riskTouchpoints),
    worstOutcome: mapWorstOutcome(input.riskTouchpoints),
    dataSensitivity: mapDataSensitivity(input.riskTouchpoints),
    humanOversight: input.riskTouchpoints.includes('acts_autonomously')
      ? 'fully_autonomous'
      : 'human_reviews',
    differentialTreatment: 'dont_know',
    peopleAffectedCount: 'under_100',
    additionalNotes: `Registered via Layer 1 quick register on ${new Date().toISOString().slice(0, 10)}. Owner: ${input.ownerName.trim()} (${input.ownerEmail.trim()}).`,
  };
}
