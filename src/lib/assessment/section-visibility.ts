/**
 * Path-based section visibility for the pre-production assessment.
 *
 * The triage decision picks a governance path (lightweight | standard | full).
 * - lightweight: never reaches this form (uses /review/lightweight)
 * - standard:    skip sections the intake risk profile makes irrelevant
 * - full:        every section is required (no skipping)
 *
 * These are pure functions with no side effects.
 */
import type { IntakeFormData } from '@/lib/questions/intake-schema';
import type { GovernancePath } from '@/types/inventory';

/** All assessment section IDs in order. */
export const ASSESSMENT_SECTION_IDS = [
  'section-a', // Core use case & governance
  'section-b', // Deployment, users & exposure
  'section-c', // Data, privacy & geography
  'section-d', // Decisioning, monitoring & scope
  'section-e', // Security, models & operations
  'section-f', // Testing & monitoring
  'section-g', // Emerging AI risks
  'section-h', // Explainability & transparency
  'section-i', // Third-party vendor assessment
  'assessment-review',
] as const;

export type AssessmentSectionId = (typeof ASSESSMENT_SECTION_IDS)[number];

/** Why a section was hidden — used for the audit trail. */
export interface SectionSkipReason {
  sectionId: AssessmentSectionId;
  reason: string;
}

export interface PathBasedVisibility {
  /** Sections the user must complete. */
  visible: AssessmentSectionId[];
  /** Sections that were auto-skipped, with the reason. */
  skipped: SectionSkipReason[];
}

/**
 * Calculate which assessment sections should be shown for a given intake +
 * governance path. Returns both visible and skipped sections (with reasons)
 * so the audit trail records what was deliberately hidden.
 */
export function calculatePathBasedVisibility(
  intake: Partial<IntakeFormData>,
  governancePath: GovernancePath,
): PathBasedVisibility {
  const visible: AssessmentSectionId[] = [];
  const skipped: SectionSkipReason[] = [];

  const include = (id: AssessmentSectionId) => visible.push(id);
  const skip = (id: AssessmentSectionId, reason: string) => skipped.push({ sectionId: id, reason });

  // ── Section A: Core Use Case & Governance ─ ALWAYS SHOWN ──
  include('section-a');

  // ── Section B: Deployment, Users & Exposure ─ ALWAYS SHOWN ──
  include('section-b');

  // ── Section C: Data, Privacy & Geography ──
  // Always shown — every AI system processes some data and we need to confirm.
  include('section-c');

  // ── Section D: Decisioning, Monitoring & Business Scope ──
  // Skip on standard path if intake says human decides everything AND no high-risk triggers.
  if (governancePath === 'standard') {
    const humanDecidesEverything = intake.humanOversight === 'human_decides';
    const triggers = intake.highRiskTriggers ?? [];
    const noHighRiskTriggers =
      triggers.length === 0 ||
      triggers.every((t) => t === 'none_of_above' || t === 'financial_info_retrieval');
    if (humanDecidesEverything && noHighRiskTriggers) {
      skip(
        'section-d',
        'Skipped on standard path: intake reports human decides everything and no high-risk decision triggers.',
      );
    } else {
      include('section-d');
    }
  } else {
    include('section-d');
  }

  // ── Section E: Security, Models & Operations ─ ALWAYS SHOWN ──
  include('section-e');

  // ── Section F: Testing & Monitoring ──
  // Always shown — testing applies to every model.
  include('section-f');

  // ── Section G: Emerging AI Risks (GenAI, agentic) ──
  // Skip if intake says no foundation model AND ai type does not include generative_ai/ai_agent/rag.
  if (governancePath === 'standard') {
    const usesFoundationModel =
      intake.usesFoundationModel === 'yes' || intake.usesFoundationModel === 'yes_vendor_managed';
    const aiTypes = intake.aiType ?? [];
    const isEmergingType = aiTypes.some(
      (t) => t === 'generative_ai' || t === 'ai_agent' || t === 'rag',
    );
    if (!usesFoundationModel && !isEmergingType) {
      skip(
        'section-g',
        'Skipped on standard path: intake reports no foundation model and AI type is not generative/agent/RAG.',
      );
    } else {
      include('section-g');
    }
  } else {
    include('section-g');
  }

  // ── Section H: Explainability & Transparency ──
  // Skip on standard path if internal-only AND no external impact AND no decision triggers.
  if (governancePath === 'standard') {
    const internalOnly =
      intake.whoUsesSystem === 'internal_only' && intake.whoAffected === 'internal_only';
    const triggers = intake.highRiskTriggers ?? [];
    const noDecisionTriggers = triggers.every(
      (t) =>
        t === 'none_of_above' ||
        t === 'financial_info_retrieval' ||
        t === 'fraud_detection' || // listed as high-risk but not user-facing
        t === 'fine_tuning_llm',
    );
    if (internalOnly && noDecisionTriggers) {
      skip(
        'section-h',
        'Skipped on standard path: system is internal-only with no external impact and no consequential decision triggers.',
      );
    } else {
      include('section-h');
    }
  } else {
    include('section-h');
  }

  // ── Section I: Third-Party Vendor Assessment ──
  // Skip if intake says no third party.
  if (intake.thirdPartyInvolved === 'no') {
    skip('section-i', 'Skipped: intake reports no third-party vendor involvement.');
  } else {
    include('section-i');
  }

  // ── Review section is always last ──
  include('assessment-review');

  return { visible, skipped };
}

/**
 * Convenience: returns just the visible section IDs as a Set for fast lookup.
 */
export function getVisibleSectionSet(
  intake: Partial<IntakeFormData>,
  governancePath: GovernancePath,
): Set<AssessmentSectionId> {
  return new Set(calculatePathBasedVisibility(intake, governancePath).visible);
}

/**
 * Returns true if an assessment section should be shown for the given context.
 */
export function isSectionVisible(
  sectionId: AssessmentSectionId,
  intake: Partial<IntakeFormData>,
  governancePath: GovernancePath,
): boolean {
  return getVisibleSectionSet(intake, governancePath).has(sectionId);
}

/**
 * Map from intake field names to assessment field names where the data is the same.
 * Used to pre-populate assessment with intake answers and mark them read-only.
 *
 * Format: assessmentField -> intakeField
 */
export const INTAKE_TO_ASSESSMENT_FIELD_MAP: Record<string, keyof IntakeFormData> = {
  // Section B - Deployment
  customerFacingOutputs: 'whoAffected', // mapped via deriveCustomerFacing
  hasInternalUsers: 'whoUsesSystem', // mapped via deriveInternalUsers
  hasExternalUsers: 'whoUsesSystem', // mapped via deriveExternalUsers

  // Section C - Data
  // dataClassification: derived from intake.dataSensitivity
  // deploymentRegions: same field name, copy directly
  deploymentRegions: 'deploymentRegions',

  // Section E - Security/Models
  usesGenAi: 'usesFoundationModel', // approximate mapping

  // Section I - Vendor
  involvesThirdParty: 'thirdPartyInvolved',
  thirdPartyName: 'vendorName',
};

/**
 * Derive assessment-shape values from intake answers.
 * Returns a partial assessment formData object that can be merged.
 */
export function deriveAssessmentValuesFromIntake(
  intake: Partial<IntakeFormData>,
): Record<string, unknown> {
  const derived: Record<string, unknown> = {};

  // Customer facing outputs
  if (intake.whoAffected === 'external' || intake.whoAffected === 'general_public') {
    derived.customerFacingOutputs = 'yes';
  } else if (intake.whoAffected === 'internal_only') {
    derived.customerFacingOutputs = 'no';
  }

  // Internal/external users
  if (intake.whoUsesSystem === 'internal_only') {
    derived.hasInternalUsers = 'yes';
    derived.hasExternalUsers = 'no';
  } else if (intake.whoUsesSystem === 'external_only') {
    derived.hasInternalUsers = 'no';
    derived.hasExternalUsers = 'yes';
  } else if (intake.whoUsesSystem === 'both') {
    derived.hasInternalUsers = 'yes';
    derived.hasExternalUsers = 'yes';
  }

  // GenAI usage (approximation: foundation model = GenAI)
  if (intake.usesFoundationModel === 'yes' || intake.usesFoundationModel === 'yes_vendor_managed') {
    derived.usesGenAi = 'yes';
  } else if (intake.usesFoundationModel === 'no') {
    derived.usesGenAi = 'no';
  }

  // Third party
  if (intake.thirdPartyInvolved === 'yes') {
    derived.involvesThirdParty = 'yes';
    if (intake.vendorName) derived.thirdPartyName = intake.vendorName;
  } else if (intake.thirdPartyInvolved === 'no') {
    derived.involvesThirdParty = 'no';
  }

  // Deployment regions (direct copy if present)
  if (intake.deploymentRegions && intake.deploymentRegions.length > 0) {
    derived.deploymentRegions = intake.deploymentRegions;
  }

  // Data classification: map from intake.dataSensitivity (multiselect) to highest level
  if (intake.dataSensitivity && intake.dataSensitivity.length > 0) {
    if (
      intake.dataSensitivity.includes('health_info') ||
      intake.dataSensitivity.includes('regulated_financial')
    ) {
      derived.dataClassification = 'highly_confidential';
    } else if (
      intake.dataSensitivity.includes('personal_info') ||
      intake.dataSensitivity.includes('customer_confidential')
    ) {
      derived.dataClassification = 'confidential';
    } else if (intake.dataSensitivity.includes('company_confidential')) {
      derived.dataClassification = 'internal';
    } else {
      derived.dataClassification = 'public';
    }
  }

  // PII flag
  if (intake.dataSensitivity) {
    derived.interactsWithPii =
      intake.dataSensitivity.includes('personal_info') ||
      intake.dataSensitivity.includes('health_info')
        ? 'yes'
        : 'no';
  }

  return derived;
}

/**
 * Returns the set of assessment field names that should be displayed as
 * "pre-populated from intake" (read-only with edit-in-intake link).
 */
export function getPrePopulatedFields(intake: Partial<IntakeFormData>): Set<string> {
  return new Set(Object.keys(deriveAssessmentValuesFromIntake(intake)));
}
