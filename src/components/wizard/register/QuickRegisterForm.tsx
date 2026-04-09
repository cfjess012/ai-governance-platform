'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FloatingField } from '@/components/wizard/quick/FloatingField';
import { FloatingSelect } from '@/components/wizard/quick/FloatingSelect';
import { FloatingTextarea } from '@/components/wizard/quick/FloatingTextarea';
import { PillGroup } from '@/components/wizard/quick/PillGroup';
import {
  type ReviewLane,
  type RouterDecision,
  routeIntake,
} from '@/lib/classification/intake-router';
import {
  type IntakeLayer1Data,
  intakeLayer1Schema,
  LAYER1_AI_TYPES,
  LAYER1_BUSINESS_AREAS,
  LAYER1_LIFECYCLE_STAGES,
  LAYER1_RISK_TOUCHPOINTS,
  type Layer1AiType,
  type Layer1BusinessArea,
  type Layer1LifecycleStage,
  type Layer1RiskTouchpoint,
} from '@/lib/questions/intake-layer1-schema';
import { calculateInherentRisk } from '@/lib/risk/inherent-risk';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useWizardStore } from '@/lib/store/wizard-store';
import { mapLayer1ToIntake } from '@/lib/wizard/layer1-mapper';

// ─────────────────────────────────────────────────────────────────────────────
// Static label maps — kept here, not in the schema, so the schema stays
// machine-readable without UI copy baked into enum definitions.
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_AREA_LABELS: Record<Layer1BusinessArea, string> = {
  actuarial: 'Actuarial',
  claims: 'Claims',
  compliance: 'Compliance',
  corporate_services: 'Corporate Services',
  customer_experience: 'Customer Experience',
  data_analytics: 'Data & Analytics',
  finance: 'Finance',
  hr: 'Human Resources',
  investments: 'Investments',
  it: 'Information Technology',
  legal: 'Legal',
  marketing: 'Marketing',
  operations: 'Operations',
  product: 'Product',
  risk_management: 'Risk Management',
};

const AI_TYPE_LABELS: Record<Layer1AiType, string> = {
  generative_ai: 'Generative AI (Claude, GPT, etc.)',
  predictive_ml: 'Predictive / classification ML',
  ai_agent: 'Agentic AI (takes actions on its own)',
  rpa_with_ai: 'RPA with AI augmentation',
  computer_vision: 'Computer vision',
};

const LIFECYCLE_LABELS: Record<Layer1LifecycleStage, string> = {
  planning: 'Planning — just an idea',
  building: 'Building — in development',
  piloting: 'Piloting — testing with real users',
  live: 'Already live in production',
};

const TOUCHPOINT_LABELS: Record<Layer1RiskTouchpoint, string> = {
  customer_personal_data: 'Customer personal data',
  employee_data: 'Employee data',
  financial_decisions: 'Makes or recommends financial decisions',
  employment_decisions: 'Makes or recommends employment decisions',
  generates_customer_content: 'Generates customer-facing content',
  acts_autonomously: 'Acts autonomously in production',
  health_biometric: 'Health or biometric data',
  none_of_above: 'None of these',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type FormState = Partial<IntakeLayer1Data>;

/**
 * Layer 1 "Register" form — the 7-question front door.
 *
 * On submit, validates with Zod, routes with the pure router, and
 * branches by lane:
 *
 *   lightweight → direct submission via mapLayer1ToIntake +
 *                 calculateInherentRisk, then success screen
 *   standard    → pre-fill wizard-store with the Layer 1 answers,
 *                 show decision screen, push to /intake/cards
 *   enhanced    → same as standard + priority tag in additionalNotes
 *   blocked     → show "governance needs to see this first" screen
 *                 with the list of reasons; still saves a draft
 */
export function QuickRegisterForm() {
  const router = useRouter();
  const addUseCase = useInventoryStore((s) => s.addUseCase);
  const updateFields = useWizardStore((s) => s.updateFields);
  const startFresh = useWizardStore((s) => s.startFresh);

  const [form, setForm] = useState<FormState>({
    useCaseName: '',
    ownerName: '',
    ownerEmail: '',
    businessArea: undefined,
    description: '',
    aiType: [],
    lifecycleStage: undefined,
    riskTouchpoints: [],
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<RouterDecision | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live validation — Zod gives us the error messages we want.
  const validation = useMemo(() => intakeLayer1Schema.safeParse(form), [form]);
  const isValid = validation.success;

  function errorFor(field: keyof IntakeLayer1Data): string | undefined {
    if (!touched[field]) return undefined;
    if (validation.success) return undefined;
    const issue = validation.error.issues.find((i) => i.path[0] === field);
    return issue?.message;
  }

  function setField<K extends keyof IntakeLayer1Data>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function markTouched(field: keyof IntakeLayer1Data) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  async function handleSubmit() {
    // Touch everything so any hidden errors become visible.
    setTouched({
      useCaseName: true,
      ownerName: true,
      ownerEmail: true,
      businessArea: true,
      description: true,
      aiType: true,
      lifecycleStage: true,
      riskTouchpoints: true,
    });
    if (!validation.success) return;

    setIsSubmitting(true);
    const data = validation.data;
    const routerDecision = routeIntake(data);
    setDecision(routerDecision);

    // P2 fix: start a fresh wizard session before pre-filling so the
    // session ID is set and stale data from a prior intake is cleared.
    startFresh();
    const intake = mapLayer1ToIntake(data);
    updateFields(intake);

    if (routerDecision.lane === 'lightweight') {
      // P4: Direct to lightweight_review queue — skip full form entirely.
      try {
        const now = new Date().toISOString();
        const id = `intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const inherentRisk = calculateInherentRisk(intake);
        addUseCase({
          id,
          intake,
          classification: {
            euAiActTier: 'pending',
            riskTier: 'pending',
            overrideTriggered: false,
            explanation: routerDecision.firedRules.map((r) => r.reason),
          },
          inherentRisk,
          routerDecision,
          status: 'lightweight_review',
          timeline: [
            { status: 'submitted', timestamp: now, changedBy: data.ownerEmail },
            { status: 'lightweight_review', timestamp: now, changedBy: 'system' },
          ],
          comments: [],
          createdAt: now,
          updatedAt: now,
          submittedBy: data.ownerEmail,
        });
        setSubmittedId(id);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // standard / enhanced / blocked — show the decision screen, user
    // acknowledges and then continues into the full flow.
    setIsSubmitting(false);
  }

  function continueToFullForm() {
    router.push('/intake/cards');
  }

  // ── Success state (lightweight direct submission) ────────────────────
  if (submittedId && decision?.lane === 'lightweight') {
    return <LaneSuccessState lane="lightweight" id={submittedId} decision={decision} />;
  }

  // ── Decision state (standard / enhanced / blocked acknowledgement) ───
  if (decision && decision.lane !== 'lightweight') {
    return (
      <DecisionState
        decision={decision}
        onContinue={continueToFullForm}
        onGoBack={() => setDecision(null)}
      />
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  const descriptionLength = (form.description ?? '').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <Link
            href="/intake"
            className="text-xs text-slate-500 transition-colors hover:text-slate-700"
          >
            ← Choose a different method
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Register a new AI use case
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Seven questions. Simple cases go straight to lightweight review; flagged cases get a
            guided intake so your governance team has the full picture.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          <div className="space-y-7">
            <FloatingField
              label="Use case name"
              value={form.useCaseName ?? ''}
              onChange={(e) => setField('useCaseName', e.target.value)}
              onBlur={() => markTouched('useCaseName')}
              error={errorFor('useCaseName')}
              hint="A short, descriptive name — e.g. 'Claim triage assistant'."
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FloatingField
                label="Your name"
                value={form.ownerName ?? ''}
                onChange={(e) => setField('ownerName', e.target.value)}
                onBlur={() => markTouched('ownerName')}
                error={errorFor('ownerName')}
                autoComplete="name"
              />
              <FloatingField
                label="Business email"
                type="email"
                value={form.ownerEmail ?? ''}
                onChange={(e) => setField('ownerEmail', e.target.value)}
                onBlur={() => markTouched('ownerEmail')}
                error={errorFor('ownerEmail')}
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <FloatingSelect
              label="Business area"
              value={form.businessArea ?? ''}
              onChange={(e) => {
                setField(
                  'businessArea',
                  (e.target.value || undefined) as Layer1BusinessArea | undefined,
                );
                markTouched('businessArea');
              }}
              error={errorFor('businessArea')}
              options={LAYER1_BUSINESS_AREAS.map((a) => ({
                value: a,
                label: BUSINESS_AREA_LABELS[a],
              }))}
            />

            <FloatingTextarea
              label="What does it do?"
              max={500}
              current={descriptionLength}
              value={form.description ?? ''}
              onChange={(e) => setField('description', e.target.value)}
              onBlur={() => markTouched('description')}
              error={errorFor('description')}
            />

            <PillGroup<Layer1AiType>
              label="What kind of AI?"
              options={LAYER1_AI_TYPES.map((t) => ({ value: t, label: AI_TYPE_LABELS[t] }))}
              value={form.aiType ?? []}
              onChange={(next) => {
                setField('aiType', next);
                markTouched('aiType');
              }}
              error={errorFor('aiType')}
            />

            <FloatingSelect
              label="Where is it in its lifecycle?"
              value={form.lifecycleStage ?? ''}
              onChange={(e) => {
                setField(
                  'lifecycleStage',
                  (e.target.value || undefined) as Layer1LifecycleStage | undefined,
                );
                markTouched('lifecycleStage');
              }}
              error={errorFor('lifecycleStage')}
              options={LAYER1_LIFECYCLE_STAGES.map((s) => ({
                value: s,
                label: LIFECYCLE_LABELS[s],
              }))}
            />

            {form.lifecycleStage === 'live' && (
              <div className="-mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                <strong>Already live? No problem.</strong> We run a no-penalty amnesty lane for
                retroactive registrations. We just need to document it properly.
              </div>
            )}

            <PillGroup<Layer1RiskTouchpoint>
              label="Does it touch or do any of these?"
              options={LAYER1_RISK_TOUCHPOINTS.map((t) => ({
                value: t,
                label: TOUCHPOINT_LABELS[t],
              }))}
              value={form.riskTouchpoints ?? []}
              onChange={(next) => {
                setField('riskTouchpoints', next);
                markTouched('riskTouchpoints');
              }}
              exclusiveValue="none_of_above"
              error={errorFor('riskTouchpoints')}
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`mt-8 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300
              ${
                isValid && !isSubmitting
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'cursor-not-allowed bg-slate-300'
              }`}
          >
            {isSubmitting ? 'Routing…' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision screen — shown after routing for non-lightweight lanes
// ─────────────────────────────────────────────────────────────────────────────

const LANE_STYLES: Record<
  ReviewLane,
  { badge: string; title: string; accent: string; continueLabel: string }
> = {
  lightweight: {
    badge: 'bg-green-50 text-green-700',
    title: 'Lightweight review',
    accent: 'border-green-200',
    continueLabel: '',
  },
  standard: {
    badge: 'bg-blue-50 text-blue-700',
    title: 'Standard review path',
    accent: 'border-blue-200',
    continueLabel: 'Continue to full intake',
  },
  enhanced: {
    badge: 'bg-amber-50 text-amber-800',
    title: 'Enhanced review path',
    accent: 'border-amber-200',
    continueLabel: 'Continue to full intake',
  },
  blocked: {
    badge: 'bg-red-50 text-red-700',
    title: 'Governance review required first',
    accent: 'border-red-200',
    continueLabel: 'Continue anyway and save as draft',
  },
};

function DecisionState({
  decision,
  onContinue,
  onGoBack,
}: {
  decision: RouterDecision;
  onContinue: () => void;
  onGoBack: () => void;
}) {
  const styles = LANE_STYLES[decision.lane];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-xl animate-fade-in">
        <div className={`rounded-2xl border ${styles.accent} bg-white p-7 shadow-xl`}>
          <div
            className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${styles.badge}`}
          >
            {styles.title}
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Here&apos;s what we found</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{decision.summary}</p>

          {decision.firedRules.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Why
              </p>
              <ul className="space-y-2">
                {decision.firedRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700"
                  >
                    {rule.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {decision.tags.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tags for the governance team
              </p>
              <div className="flex flex-wrap gap-1.5">
                {decision.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-2">
            <button
              type="button"
              onClick={onContinue}
              className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
            >
              {styles.continueLabel}
            </button>
            <button
              type="button"
              onClick={onGoBack}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Go back and edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success state — lightweight lane only
// ─────────────────────────────────────────────────────────────────────────────

function LaneSuccessState({
  id,
  decision,
}: {
  lane: ReviewLane;
  id: string;
  decision: RouterDecision;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="mx-auto w-full max-w-md animate-fade-in rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-8 w-8 text-green-600"
            aria-hidden
          >
            <title>Success checkmark</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
              className="check-draw"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Registered</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{decision.summary}</p>
        <p className="mt-3 font-mono text-[11px] text-slate-400">Reference: {id}</p>
        <div className="mt-7 flex flex-col gap-2">
          <Link
            href="/inventory"
            className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
          >
            View in inventory
          </Link>
          <Link
            href="/intake"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Register another
          </Link>
        </div>
      </div>
    </div>
  );
}
