'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

// ────────────────────────────────────────────
// Data: Process steps and branching paths
// ────────────────────────────────────────────

interface ProcessStep {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  details: string[];
  duration?: string;
  icon: 'form' | 'classify' | 'review' | 'assess' | 'score' | 'decision' | 'monitor';
  branches?: Branch[];
}

interface Branch {
  id: string;
  condition: string;
  label: string;
  color: 'blue' | 'amber' | 'red' | 'green';
  outcome: string;
  details: string;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'intake',
    number: 1,
    title: 'Submit AI Use Case Intake',
    subtitle: 'You are here',
    description:
      'Complete the three-section intake form to register your AI use case with the governance team.',
    details: [
      'Section A: Describe your use case, AI type, vendor involvement, deployment regions, and risk triggers (16 questions)',
      'Section B: Provide data sensitivity, human oversight level, fairness considerations, and scale of impact (5 questions)',
      'Section C: Align with portfolio strategy, set target timelines, and estimate value (7 questions)',
      'Conditional fields appear based on your answers (e.g., vendor details, foundation model specifics)',
      'Your progress is auto-saved every 2 seconds so you can return anytime',
    ],
    duration: '~13 min',
    icon: 'form',
    branches: [
      {
        id: 'high-risk-triggers',
        condition:
          'You select high-risk decision triggers (insurance pricing, hiring, credit, etc.)',
        label: 'High-Risk Triggers',
        color: 'amber',
        outcome: 'Comprehensive assessment required',
        details:
          'The governance team will reach out to schedule a full review. Your submission is flagged for priority assessment across all 7 risk dimensions.',
      },
      {
        id: 'production-unreviewed',
        condition: 'System is live in production AND has not been previously reviewed',
        label: 'Unreviewed Production System',
        color: 'red',
        outcome: 'Prioritized for immediate assessment',
        details:
          'Because the system is already making decisions in production without governance review, this submission jumps to the front of the assessment queue.',
      },
      {
        id: 'non-us-deployment',
        condition: 'Deployment regions include EU/EEA, UK, Canada, or other non-US regions',
        label: 'International Deployment',
        color: 'blue',
        outcome: 'Additional regulatory review',
        details:
          'The governance team will assess applicability of EU AI Act, UK AI regulations, and other jurisdiction-specific requirements during review.',
      },
      {
        id: 'standard-path',
        condition: 'No high-risk triggers, standard internal use case',
        label: 'Standard Path',
        color: 'green',
        outcome: 'Normal review timeline',
        details:
          'Your use case enters the standard review queue. The governance team typically completes initial review within 5 business days.',
      },
    ],
  },
  {
    id: 'auto-classify',
    number: 2,
    title: 'Automatic Classification',
    subtitle: 'Happens instantly',
    description:
      'As you fill out the intake form, the system automatically classifies your use case against regulatory frameworks in real time.',
    details: [
      'EU AI Act risk tier: Prohibited, High Risk (Annex III), Limited, or Minimal — determined by your business area, high-risk triggers, and deployment regions',
      'Preliminary risk signals: Flagged automatically based on citizen development, serious harm potential, autonomous operation, and EU deployment',
      'Classification updates live in the sidebar as you answer questions — no waiting',
      'This is a preliminary classification; the final determination happens during the full assessment',
    ],
    icon: 'classify',
    branches: [
      {
        id: 'prohibited',
        condition: 'Biometric identification, emotion detection, or social scoring in EU',
        label: 'Potentially Prohibited',
        color: 'red',
        outcome: 'Escalated to governance committee',
        details:
          'Use cases involving practices prohibited under EU AI Act Article 5 are escalated immediately. The governance committee must approve before any further development.',
      },
      {
        id: 'high-risk',
        condition: 'Financial services, employment, or critical infrastructure decisions',
        label: 'High Risk (Annex III)',
        color: 'amber',
        outcome: 'Full pre-production assessment required',
        details:
          'High-risk use cases must complete the 59-question pre-production risk assessment before deployment. Additional controls and monitoring are required.',
      },
      {
        id: 'limited-minimal',
        condition: 'Internal tools, analytics, or non-decision-making AI',
        label: 'Limited / Minimal Risk',
        color: 'green',
        outcome: 'Lighter governance requirements',
        details:
          'Lower-risk use cases follow a streamlined review path. Transparency obligations may still apply (e.g., informing users that AI is being used).',
      },
    ],
  },
  {
    id: 'governance-review',
    number: 3,
    title: 'Governance Team Review',
    subtitle: 'Typically 3-5 business days',
    description:
      'The governance team reviews your intake submission, validates the auto-classification, and determines the appropriate governance path.',
    details: [
      'A governance analyst reviews your answers and the preliminary classification',
      'They may reach out for clarification or additional context',
      'The team decides whether a full pre-production risk assessment is needed',
      'For standard use cases, they may approve with conditions at this stage',
      'You can track your submission status in the Inventory dashboard',
    ],
    icon: 'review',
  },
  {
    id: 'assessment',
    number: 4,
    title: 'Pre-Production Risk Assessment',
    subtitle: 'If required — 59 questions across 9 sections',
    description:
      'For high-risk or complex use cases, a comprehensive assessment evaluates the system across technical, operational, and regulatory dimensions.',
    details: [
      'Section A-E: Core governance, deployment exposure, data privacy, decisioning scope, security and operations',
      'Section F: Testing strategy and drift monitoring plans',
      'Section G: Emerging AI risks — autonomous actions, RAG, tool calling',
      'Section H: Explainability and transparency obligations',
      'Section I: Third-party vendor assessment (conditional — only if vendor AI is involved)',
      'Pre-populated from your intake answers to avoid duplicate entry',
    ],
    duration: '~30-45 min',
    icon: 'assess',
    branches: [
      {
        id: 'vendor-involved',
        condition: 'Third-party AI vendor is involved',
        label: 'Vendor Assessment',
        color: 'blue',
        outcome: 'Additional 20 vendor-specific questions',
        details:
          'Section I activates with questions about vendor data retention, model transparency, ISO 42001 certification, guardrails, and change management.',
      },
      {
        id: 'genai-specific',
        condition: 'Use case involves Generative AI',
        label: 'GenAI-Specific Questions',
        color: 'amber',
        outcome: 'Adversarial testing + RAG questions added',
        details:
          'Additional questions about adversarial/red team testing approaches and retrieval-augmented generation security appear for GenAI systems.',
      },
    ],
  },
  {
    id: 'scoring',
    number: 5,
    title: 'Risk Scoring & Tier Assignment',
    subtitle: 'Automated with human review',
    description:
      'Your assessment answers are scored across seven risk dimensions to produce a transparent, weighted risk score.',
    details: [
      'Data Sensitivity (25%): PII, health data, regulated financial data, classification level',
      'Decision Impact (20%): Does the AI replace human decisions? Affect external stakeholders?',
      'Geographic Scope (15%): EU presence, multi-region deployment, cross-border data flows',
      'User Exposure (15%): Customer-facing outputs, external users, scale of impact',
      'Agent Autonomy (15%): Autonomous actions, tool calling, maximum financial blast radius',
      'Monitoring Capability: Drift detection, incident response, human validation',
      'Governance Maturity: InfoSec completion, approved pipelines, vendor audit scope',
      'Final risk tier: Low (0-25), Moderate (26-50), High (51-75), or Critical (76-100)',
    ],
    icon: 'score',
  },
  {
    id: 'decision',
    number: 6,
    title: 'Governance Decision',
    subtitle: 'Approve, conditionally approve, or require changes',
    description:
      'The governance team issues a formal decision with clear requirements and conditions for your AI use case.',
    details: [
      'Approved: Ready for production with standard monitoring requirements',
      'Conditionally approved: Specific controls, testing, or documentation must be completed before go-live',
      'Changes required: Significant concerns identified — must address and resubmit',
      'All decisions include a written explanation referencing specific risk factors',
      'Decision is recorded in the inventory with full audit trail',
    ],
    icon: 'decision',
    branches: [
      {
        id: 'approved',
        condition: 'Risk score acceptable, controls in place',
        label: 'Approved',
        color: 'green',
        outcome: 'Proceed to production',
        details:
          'Your use case is cleared for deployment. Standard monitoring and periodic review requirements apply based on your risk tier.',
      },
      {
        id: 'conditional',
        condition: 'Gaps identified but addressable',
        label: 'Conditional Approval',
        color: 'amber',
        outcome: 'Must complete requirements before go-live',
        details:
          'Common conditions include: completing fairness testing, implementing human oversight, adding monitoring dashboards, or obtaining vendor certifications.',
      },
      {
        id: 'changes-required',
        condition: 'Significant risk gaps or missing information',
        label: 'Changes Required',
        color: 'red',
        outcome: 'Address concerns and resubmit',
        details:
          'The governance team will detail exactly what needs to change. Once addressed, you can update your assessment and request re-review.',
      },
    ],
  },
  {
    id: 'monitor',
    number: 7,
    title: 'Ongoing Monitoring & Periodic Review',
    subtitle: 'Continuous',
    description:
      'Approved use cases enter the production monitoring phase with periodic governance reviews based on risk tier.',
    details: [
      'Critical risk: Quarterly governance review + continuous monitoring',
      'High risk: Semi-annual governance review + monthly performance monitoring',
      'Moderate risk: Annual governance review + quarterly check-ins',
      'Low risk: Annual governance review',
      'Any significant change (new data source, model update, scope expansion) triggers a re-assessment',
      'Incidents must be reported through the governance incident response process',
    ],
    icon: 'monitor',
  },
];

// ────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────

function StepIcon({ type, active }: { type: ProcessStep['icon']; active: boolean }) {
  const color = active ? 'white' : '#00539B';
  const props = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (type) {
    case 'form':
      return (
        <svg aria-hidden="true" {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'classify':
      return (
        <svg aria-hidden="true" {...props}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'review':
      return (
        <svg aria-hidden="true" {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'assess':
      return (
        <svg aria-hidden="true" {...props}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'score':
      return (
        <svg aria-hidden="true" {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'decision':
      return (
        <svg aria-hidden="true" {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M16 12l-4-4-4 4" />
          <path d="M12 16V8" />
        </svg>
      );
    case 'monitor':
      return (
        <svg aria-hidden="true" {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

// ────────────────────────────────────────────
// Branch colors
// ────────────────────────────────────────────

const branchColors: Record<
  Branch['color'],
  { bg: string; border: string; text: string; dot: string; badge: string }
> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700',
  },
};

// ────────────────────────────────────────────
// Step card component
// ────────────────────────────────────────────

function StepCard({
  step,
  isExpanded,
  onToggle,
  index,
}: {
  step: ProcessStep;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const isLast = index === PROCESS_STEPS.length - 1;

  return (
    <div className="relative flex gap-4 sm:gap-6">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onToggle}
          className={`
            relative z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2
            transition-all duration-300 flex-shrink-0
            ${
              isExpanded
                ? 'bg-[#00539B] border-[#00539B] shadow-md scale-110'
                : 'bg-white border-slate-300 hover:border-[#00539B] hover:shadow-sm'
            }
          `}
          aria-label={`Step ${step.number}: ${step.title}`}
        >
          <StepIcon type={step.icon} active={isExpanded} />
        </button>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-8 transition-colors duration-300 ${
              isExpanded ? 'bg-[#00539B]/30' : 'bg-slate-200'
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isLast ? 'pb-8' : 'pb-0'}`}>
        <button type="button" onClick={onToggle} className="w-full text-left group">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={`text-base font-semibold transition-colors ${
                    isExpanded ? 'text-[#00539B]' : 'text-slate-900 group-hover:text-[#00539B]'
                  }`}
                >
                  {step.title}
                </h3>
                {step.duration && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {step.duration}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{step.subtitle}</p>
            </div>
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`flex-shrink-0 mt-1 text-slate-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.description}</p>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-4 animate-fade-in">
            {/* Detail bullets */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                What happens at this step
              </h4>
              <ul className="space-y-2">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00539B]/40 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Branching paths */}
            {step.branches && step.branches.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  What path will my use case take?
                </h4>
                <div className="space-y-2">
                  {step.branches.map((branch) => {
                    const colors = branchColors[branch.color];
                    const isBranchExpanded = expandedBranch === branch.id;
                    return (
                      <div key={branch.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedBranch(isBranchExpanded ? null : branch.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-all ${colors.bg} ${colors.border} hover:shadow-sm`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${colors.text}`}>
                                  {branch.label}
                                </span>
                                <span
                                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors.badge}`}
                                >
                                  {branch.outcome}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-medium">If:</span> {branch.condition}
                              </p>
                            </div>
                            <svg
                              aria-hidden="true"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`flex-shrink-0 mt-1 text-slate-400 transition-transform duration-200 ${
                                isBranchExpanded ? 'rotate-180' : ''
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>
                        {isBranchExpanded && (
                          <div
                            className={`mt-1 ml-5 pl-4 border-l-2 py-2 text-sm text-slate-700 leading-relaxed animate-fade-in ${colors.border}`}
                          >
                            {branch.details}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Quick-jump mini map
// ────────────────────────────────────────────

function MiniMap({
  activeStep,
  onJump,
}: {
  activeStep: string | null;
  onJump: (id: string) => void;
}) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-24 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Jump to Step
        </h3>
        <div className="space-y-1">
          {PROCESS_STEPS.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onJump(step.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                  isActive
                    ? 'bg-[#00539B]/10 text-[#00539B] font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 font-semibold ${
                    isActive ? 'bg-[#00539B] text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.number}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <Link
            href="/intake"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-[#00539B] hover:bg-[#003d73] rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            Start Intake
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Page
// ────────────────────────────────────────────

export default function ProcessGuidePage() {
  const [expandedStep, setExpandedStep] = useState<string | null>('intake');

  const handleToggle = useCallback((stepId: string) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  }, []);

  const handleJump = useCallback((stepId: string) => {
    setExpandedStep(stepId);
    const el = document.getElementById(`step-${stepId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-10 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">AI Governance Process Guide</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Understand the end-to-end governance process for AI use cases. Click any step to see what
          happens, how long it takes, and what path your use case might follow based on your
          answers.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-[#00539B]">7</p>
          <p className="text-xs text-slate-500 mt-1">Process Steps</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-[#00539B]">28</p>
          <p className="text-xs text-slate-500 mt-1">Intake Questions</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-[#00539B]">4</p>
          <p className="text-xs text-slate-500 mt-1">Risk Tiers</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-[#00539B]">7</p>
          <p className="text-xs text-slate-500 mt-1">Scoring Dimensions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Main timeline */}
        <div className="lg:col-span-7">
          <div className="stagger-children">
            {PROCESS_STEPS.map((step, index) => (
              <div key={step.id} id={`step-${step.id}`}>
                <StepCard
                  step={step}
                  isExpanded={expandedStep === step.id}
                  onToggle={() => handleToggle(step.id)}
                  index={index}
                />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 bg-[#00539B]/5 rounded-xl border border-[#00539B]/20 p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready to register your AI use case?
            </h3>
            <p className="text-sm text-slate-600 mb-4 max-w-lg mx-auto">
              The intake form takes about 13 minutes. Your progress is saved automatically, so you
              can return anytime to finish.
            </p>
            <Link
              href="/intake"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#00539B] hover:bg-[#003d73] rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              Start New Intake
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Sidebar mini-map */}
        <div className="lg:col-span-3">
          <MiniMap activeStep={expandedStep} onJump={handleJump} />
        </div>
      </div>
    </div>
  );
}
