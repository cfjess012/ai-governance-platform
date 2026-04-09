/**
 * Intake router — decides which review lane a Layer 1 registration
 * should be routed into, and why.
 *
 * The four lanes:
 *
 *   lightweight
 *     Low-risk cases: internal, no customer data, no regulatory triggers,
 *     no autonomous action. Single-reviewer approval, no pre-prod
 *     assessment, no committee. Target: ~40% of registrations.
 *
 *   standard
 *     Moderate-risk cases: customer-facing, some data, no Annex III
 *     triggers. Full intake capture + scheduled pre-prod assessment with
 *     standard review path. Target: ~40% of registrations.
 *
 *   enhanced
 *     High-risk cases: Annex III business areas, financial/employment
 *     decisions, biometric/health data, autonomous action. Full intake +
 *     mandatory triage call + SR 11-7 / Model Risk pre-notification +
 *     committee review. Target: ~15%.
 *
 *   blocked
 *     Prohibited patterns or cases where the governance team must be
 *     engaged BEFORE the user proceeds. Not a rejection — a "talk to us
 *     first" gate. Target: ~5%.
 *
 * This is a pure function. No React, no store, no network — it takes
 * Layer 1 answers in and returns a decision record with the lane and the
 * list of rules that fired. Every decision is explainable.
 */

import type { IntakeLayer1Data, Layer1BusinessArea } from '@/lib/questions/intake-layer1-schema';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewLane = 'lightweight' | 'standard' | 'enhanced' | 'blocked';

export interface RouterRule {
  /** Stable machine ID for logs/analytics. */
  id: string;
  /** Which lane this rule routes to. */
  lane: ReviewLane;
  /** Human-readable explanation shown to the user and governance team. */
  reason: string;
  /**
   * Regulatory tags attached to this case. The governance team uses these
   * to pre-notify the right stakeholders (Model Risk, Compliance, Privacy).
   */
  tags: string[];
}

export interface RouterDecision {
  /** The most severe lane across all fired rules. */
  lane: ReviewLane;
  /** Every rule that fired, in evaluation order. */
  firedRules: RouterRule[];
  /** Union of tags across all fired rules, deduplicated. */
  tags: string[];
  /**
   * A short, human-readable summary the UI can show to the user:
   * "This case will go through the standard review path because …"
   */
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lane precedence — used to merge multiple fired rules into one final lane
// ─────────────────────────────────────────────────────────────────────────────

const LANE_SEVERITY: Record<ReviewLane, number> = {
  lightweight: 0,
  standard: 1,
  enhanced: 2,
  blocked: 3,
};

function moreSevere(a: ReviewLane, b: ReviewLane): ReviewLane {
  return LANE_SEVERITY[a] >= LANE_SEVERITY[b] ? a : b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business area groupings — FinServ-specific regulatory mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EU AI Act Annex III "high-risk" business domains that we service.
 * A case in one of these areas + a relevant risk touchpoint is always
 * at least enhanced.
 */
const ANNEX_III_AREAS: ReadonlySet<Layer1BusinessArea> = new Set([
  'investments',
  'hr',
  'compliance',
  'risk_management',
]);

/**
 * SR 11-7 model risk domains — predictive/ML models in these areas
 * should be pre-notified to Model Risk Management even if they're in the
 * standard lane, because the SR 11-7 review cycle is long.
 */
const SR_11_7_AREAS: ReadonlySet<Layer1BusinessArea> = new Set([
  'actuarial',
  'claims',
  'finance',
  'investments',
  'risk_management',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the router. Rules are evaluated in order; every rule that matches
 * is recorded. The final lane is the most severe across all fired rules.
 *
 * Rule design notes:
 *   - Rules don't "stop" on match — we collect every one so the
 *     governance team sees the full picture.
 *   - Rules are ordered roughly from most-severe to least-severe for
 *     readability, but order doesn't affect the outcome.
 *   - A case with no fired rules lands in the `lightweight` default.
 */
export function routeIntake(data: IntakeLayer1Data): RouterDecision {
  const fired: RouterRule[] = [];
  const { businessArea, aiType, lifecycleStage, riskTouchpoints } = data;
  const touches = new Set(riskTouchpoints);
  const aiTypes = new Set(aiType);

  // ── BLOCKED — governance contact required before proceeding ──────────

  // Biometric identification is a prohibited use in certain contexts
  // under EU AI Act Article 5 (real-time remote biometric ID in public
  // spaces). We can't tell from Layer 1 whether it's the prohibited kind,
  // so we gate to governance for a conversation.
  if (touches.has('health_biometric') && aiTypes.has('computer_vision')) {
    fired.push({
      id: 'blocked-biometric-vision',
      lane: 'blocked',
      reason:
        'Biometric identification from computer vision may be prohibited under EU AI Act Article 5. Governance needs to review before this proceeds.',
      tags: ['eu_ai_act_art5', 'biometric', 'prohibited_check'],
    });
  }

  // Autonomous action with financial decisions = change management and
  // operational risk review are mandatory pre-registration.
  if (touches.has('acts_autonomously') && touches.has('financial_decisions')) {
    fired.push({
      id: 'blocked-autonomous-financial',
      lane: 'blocked',
      reason:
        'Autonomous action on financial decisions requires pre-registration review with Operational Risk and Change Management.',
      tags: ['op_risk', 'change_mgmt', 'autonomous'],
    });
  }

  // ── ENHANCED — high-risk review path ─────────────────────────────────

  // Financial decisions in regulated business areas → SR 11-7 + Reg BI
  if (touches.has('financial_decisions')) {
    const tags = ['sr_11_7', 'reg_bi_check'];
    if (businessArea === 'investments') tags.push('reg_bi', 'finra');
    if (businessArea === 'finance') tags.push('sr_11_7_pre_notify');
    fired.push({
      id: 'enhanced-financial-decisions',
      lane: 'enhanced',
      reason:
        'Makes or recommends financial decisions — SR 11-7 model risk review and compliance pre-notification required.',
      tags,
    });
  }

  // Employment decisions → EEOC, NYC Local Law 144, EU Annex III
  if (touches.has('employment_decisions')) {
    fired.push({
      id: 'enhanced-employment-decisions',
      lane: 'enhanced',
      reason:
        'Makes or recommends employment decisions — triggers EEOC review, NYC Local Law 144 bias audit, and EU AI Act Annex III.',
      tags: ['eeoc', 'nyc_ll_144', 'eu_ai_act_annex_iii', 'bias_audit'],
    });
  }

  // Health / biometric data → HIPAA / BIPA / Annex III
  if (touches.has('health_biometric')) {
    fired.push({
      id: 'enhanced-health-biometric',
      lane: 'enhanced',
      reason:
        'Health or biometric data — triggers HIPAA review (if applicable), BIPA, and enhanced data protection controls.',
      tags: ['hipaa_check', 'bipa', 'phi'],
    });
  }

  // Autonomous action on its own is enhanced — it escalates to blocked
  // only when combined with financial decisions (rule above).
  if (touches.has('acts_autonomously')) {
    fired.push({
      id: 'enhanced-autonomous',
      lane: 'enhanced',
      reason:
        'System acts autonomously in production — requires enhanced change management and rollback controls.',
      tags: ['autonomous', 'change_mgmt'],
    });
  }

  // Annex III business area + a customer-facing or content-generation
  // touchpoint → enhanced. Narrowed from "any touchpoint" because more
  // specific rules (financial/employment/biometric) already handle the
  // classic Annex III categories, and normal intra-area work like
  // "HR handling employee data for a benefits chatbot" shouldn't escalate.
  const annexIIIRelevantTouchpoint =
    touches.has('customer_personal_data') || touches.has('generates_customer_content');
  if (ANNEX_III_AREAS.has(businessArea) && annexIIIRelevantTouchpoint) {
    fired.push({
      id: 'enhanced-annex-iii-area',
      lane: 'enhanced',
      reason: `${businessArea} is an EU AI Act Annex III business area, and this case reaches customers — enhanced review is required.`,
      tags: ['eu_ai_act_annex_iii'],
    });
  }

  // ── STANDARD — moderate review path ──────────────────────────────────

  // Customer personal data → privacy review mandatory
  if (touches.has('customer_personal_data')) {
    fired.push({
      id: 'standard-customer-data',
      lane: 'standard',
      reason: 'Touches customer personal data — privacy review and data classification required.',
      tags: ['privacy', 'ccpa', 'glba'],
    });
  }

  // Customer-facing generated content → reputational + disclosure review
  if (touches.has('generates_customer_content')) {
    fired.push({
      id: 'standard-customer-content',
      lane: 'standard',
      reason: 'Generates customer-facing content — requires AI disclosure and reputational review.',
      tags: ['disclosure', 'reputational', 'marketing_review'],
    });
  }

  // AI agents — agentic systems get a standard-lane review by default
  // because they typically combine tool use with external effects.
  if (aiTypes.has('ai_agent')) {
    fired.push({
      id: 'standard-ai-agent',
      lane: 'standard',
      reason:
        'Agentic AI systems combine tool use with real-world effects and require a standard review for the tool inventory and action scope.',
      tags: ['agentic', 'tool_use'],
    });
  }

  // Shadow AI amnesty — already live without review goes to standard at
  // minimum, regardless of how "benign" it looks, because it needs a real
  // lookback and documentation.
  if (lifecycleStage === 'live') {
    fired.push({
      id: 'standard-shadow-ai',
      lane: 'standard',
      reason:
        'Already running in production — we need to do a retroactive review. No penalty for prior use; this is the amnesty lane.',
      tags: ['shadow_ai', 'retroactive_review', 'amnesty'],
    });
  }

  // Employee data — HR-ish cases that aren't employment decisions still
  // need a privacy review but don't necessarily escalate further.
  if (touches.has('employee_data') && !touches.has('employment_decisions')) {
    fired.push({
      id: 'standard-employee-data',
      lane: 'standard',
      reason: 'Touches employee data — privacy and HR stakeholder review required.',
      tags: ['privacy', 'hr_review'],
    });
  }

  // SR 11-7 pre-notify for predictive ML in model-risk-adjacent areas,
  // even without explicit financial decisions. This doesn't escalate the
  // lane on its own but attaches the tag so governance can act on it.
  if (aiTypes.has('predictive_ml') && SR_11_7_AREAS.has(businessArea)) {
    fired.push({
      id: 'standard-sr-11-7-prenotify',
      lane: 'standard',
      reason:
        'Predictive/ML model in a model-risk-adjacent business area — Model Risk Management will be pre-notified per SR 11-7.',
      tags: ['sr_11_7_pre_notify'],
    });
  }

  // P3: PII processing trigger — applies GDPR Article 35 (DPIA), applicable
  // state privacy laws, and routes to standard review at minimum.
  if (touches.has('customer_personal_data')) {
    fired.push({
      id: 'standard-customer-pii',
      lane: 'standard',
      reason:
        'Processes customer personally identifiable information — requires DPIA (GDPR Article 35) and data protection compliance review.',
      tags: ['gdpr_art_35', 'privacy_review', 'processes_pii'],
    });
  }

  // ── Final decision ───────────────────────────────────────────────────

  const lane: ReviewLane = fired.reduce<ReviewLane>(
    (acc, rule) => moreSevere(acc, rule.lane),
    'lightweight',
  );

  const tags = Array.from(new Set(fired.flatMap((r) => r.tags)));

  return {
    lane,
    firedRules: fired,
    tags,
    summary: buildSummary(lane, fired),
  };
}

function buildSummary(lane: ReviewLane, fired: RouterRule[]): string {
  if (fired.length === 0) {
    return "This looks like a low-risk case — you're on the lightweight review path. One governance reviewer will check it and get back to you.";
  }

  if (lane === 'blocked') {
    return 'Before this case proceeds, the governance team needs to review it with you. You can still register it now — we just want to talk before work starts.';
  }

  if (lane === 'enhanced') {
    return 'This case will go through our enhanced review path because it touches high-risk areas. The governance team will schedule a triage call and pre-notify the relevant stakeholders.';
  }

  if (lane === 'standard') {
    return 'This case will go through our standard review path. The governance team will complete a full intake and schedule a pre-production assessment.';
  }

  return "This looks like a low-risk case — you're on the lightweight review path.";
}
