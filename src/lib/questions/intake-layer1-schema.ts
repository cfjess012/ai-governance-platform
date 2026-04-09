import { z } from 'zod';

/**
 * Layer 1 ("Register") intake schema — the 7-field front door.
 *
 * This is the short-form registration that every AI use case goes through
 * first. It captures the minimum information needed to:
 *   1. identify and own the case,
 *   2. route it to the correct review lane (lightweight / standard /
 *      enhanced / blocked), and
 *   3. pre-fill the full intake form for cases that need more detail.
 *
 * It lives alongside the full `intake-schema.ts`, not inside it, so the
 * existing full-form consumers (full shell, card flow, single-page form,
 * classification, inventory) stay untouched. The mapping from Layer 1 to
 * full IntakeFormData is a separate, tested module.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enum values — deliberately fewer and more plain-English than the full schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The same 15 business areas the full schema uses — unchanged because this
 * drives EU AI Act Annex III mapping and we can't simplify without losing
 * regulatory gating.
 */
export const LAYER1_BUSINESS_AREAS = [
  'actuarial',
  'claims',
  'compliance',
  'corporate_services',
  'customer_experience',
  'data_analytics',
  'finance',
  'hr',
  'investments',
  'it',
  'legal',
  'marketing',
  'operations',
  'product',
  'risk_management',
] as const;
export type Layer1BusinessArea = (typeof LAYER1_BUSINESS_AREAS)[number];

/**
 * 5 AI types with plain-English labels. Dropped from the full schema:
 *   - `other_not_sure` — opt-out escape hatch that produced garbage signal
 */
export const LAYER1_AI_TYPES = [
  'generative_ai',
  'predictive_ml',
  'ai_agent',
  'rpa_with_ai',
  'computer_vision',
] as const;
export type Layer1AiType = (typeof LAYER1_AI_TYPES)[number];

/**
 * 4 lifecycle stages — collapsed from 6. The two retired categories
 * (`in_use_seeking_approval`, `being_retired`) fold into `live`, which
 * triggers the shadow-AI amnesty messaging on the UI side.
 */
export const LAYER1_LIFECYCLE_STAGES = ['planning', 'building', 'piloting', 'live'] as const;
export type Layer1LifecycleStage = (typeof LAYER1_LIFECYCLE_STAGES)[number];

/**
 * 8 plain-language "does it touch or do any of these?" options.
 *
 * This single field replaces the worst UX question in the old schema:
 * the 14-option `highRiskTriggers` multiselect that nobody could parse.
 *
 * Each option maps downstream to specific regulatory concerns:
 *   customer_personal_data     → CCPA, GLBA, GDPR if EU
 *   employee_data              → HR/EEOC context
 *   financial_decisions        → CFPB, ECOA, SR 11-7, Reg BI, NYDFS
 *   employment_decisions       → EEOC, NYC Local Law 144, Annex III
 *   generates_customer_content → external content generation / reputational
 *   acts_autonomously          → operational risk, change management
 *   health_biometric           → HIPAA, BIPA, Annex III
 *   none_of_above              → lightweight lane default
 */
export const LAYER1_RISK_TOUCHPOINTS = [
  'customer_personal_data',
  'employee_data',
  'financial_decisions',
  'employment_decisions',
  'generates_customer_content',
  'acts_autonomously',
  'health_biometric',
  'none_of_above',
] as const;
export type Layer1RiskTouchpoint = (typeof LAYER1_RISK_TOUCHPOINTS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

export const intakeLayer1Schema = z.object({
  useCaseName: z.string().trim().min(1, 'Give your use case a name').max(200, 'Name is too long'),

  ownerName: z.string().trim().min(1, 'Enter your name').max(200),

  ownerEmail: z
    .string()
    .trim()
    .min(1, 'Enter your email')
    .max(254)
    .email('Enter a valid business email'),

  businessArea: z.enum(LAYER1_BUSINESS_AREAS, {
    message: 'Pick the business area most responsible for this case',
  }),

  description: z
    .string()
    .trim()
    .min(10, 'Tell us a little more — at least 10 characters')
    .max(1000, 'Keep it under 1000 characters'),

  aiType: z.array(z.enum(LAYER1_AI_TYPES)).min(1, 'Pick at least one AI type'),

  lifecycleStage: z.enum(LAYER1_LIFECYCLE_STAGES, {
    message: 'Where is this in its lifecycle?',
  }),

  /**
   * Must contain at least one option. `none_of_above` is a valid choice
   * but is mutually exclusive with the rest in the UI (enforced by the
   * PillGroup component's exclusiveValue prop).
   */
  riskTouchpoints: z
    .array(z.enum(LAYER1_RISK_TOUCHPOINTS))
    .min(1, 'Pick at least one — use "None of these" if nothing applies'),
});

export type IntakeLayer1Data = z.infer<typeof intakeLayer1Schema>;
