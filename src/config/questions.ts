export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionDefinition {
  id: string;
  field: string;
  label: string;
  helpText: string;
  whyWeAsk: string;
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  section: string;
  stage: string;
  form: 'intake' | 'assessment';
}

// ──────────────────────────────────────
// Intake Questions (4 stages, 17 total)
// ──────────────────────────────────────

export const intakeQuestions: QuestionDefinition[] = [
  // ── Stage 1: Quick Intake (7 questions, ~3 min) ──
  {
    id: 'intake-q1',
    field: 'useCaseName',
    label: 'Use Case Name',
    helpText: 'Provide a name that clearly describes the problem being solved.',
    whyWeAsk:
      'A clear name helps the ERAI team triage and prioritize use cases quickly. It also appears in dashboards and reports shown to leadership.',
    type: 'text',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
  },
  {
    id: 'intake-q2',
    field: 'solutionType',
    label: 'Use Case Solution Type',
    helpText: 'How is this AI solution being developed or acquired?',
    whyWeAsk:
      'Solution type drives the governance path. Citizen Development and Unknown types get maximum oversight, while Existing Tools have a lighter review since they are already vetted.',
    type: 'select',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
    options: [
      { value: 'citizen_development', label: 'Citizen Development' },
      { value: 'custom', label: 'Custom' },
      { value: 'existing_tool', label: 'Existing Tool' },
      { value: 'new_tool', label: 'New Tool' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  {
    id: 'intake-q3',
    field: 'businessPurpose',
    label: 'Description of Business Purpose',
    helpText: 'Describe the business problem and what the use case is intended to achieve.',
    whyWeAsk:
      'The business purpose is analyzed for keywords that may trigger EU AI Act high-risk classification (e.g., hiring, credit decisioning). A clear description also helps ERAI analysts understand the use case without scheduling a follow-up meeting.',
    type: 'textarea',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
  },
  {
    id: 'intake-q4',
    field: 'businessArea',
    label: 'Business Area',
    helpText: 'Primary business area responsible for the use case.',
    whyWeAsk:
      'Certain business areas (insurance, investments, credit) are explicitly listed in EU AI Act Annex III as high-risk domains. This field helps auto-classify the regulatory risk tier.',
    type: 'text',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
  },
  {
    id: 'intake-q5',
    field: 'useCaseOwner',
    label: 'AI Use Case Owner',
    helpText: 'Name and role of the person accountable for delivery and ongoing oversight.',
    whyWeAsk:
      'The use case owner is the primary point of contact for governance reviews, audits, and incident response. Every use case must have a named owner.',
    type: 'text',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
  },
  {
    id: 'intake-q6',
    field: 'ethicalAiAligned',
    label:
      'Is the intent of this use case aligned with the Ethical AI Principles as published in the AI Policy?',
    helpText: "Confirm alignment with the organization's Ethical AI Principles.",
    whyWeAsk:
      'If a use case is not aligned with Ethical AI Principles, it must be reviewed by the ERAI committee before proceeding. This is a hard gate in the governance process.',
    type: 'boolean',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
  },
  {
    id: 'intake-q7',
    field: 'prohibitedPractices',
    label:
      'Does this use case involve any of the following: Fine-tuning of Large Language Models, Biometric scanning (EU), Emotion detection (EU)',
    helpText: 'Select whether this use case involves any of the listed practices.',
    whyWeAsk:
      'These practices are either prohibited or heavily regulated under the EU AI Act. Answering "Yes" triggers an elevated review and may classify the use case as High Risk or Prohibited.',
    type: 'select',
    required: true,
    section: 'Quick Intake',
    stage: 'quick-intake',
    form: 'intake',
    options: [
      { value: 'none', label: 'None' },
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },

  // ── Stage 2: Strategic Alignment & Triage (6 questions, ~3 min) ──
  {
    id: 'intake-q8',
    field: 'lifecycleStage',
    label: 'Use Case Lifecycle Stage',
    helpText: 'Current stage in the development lifecycle.',
    whyWeAsk:
      'Lifecycle stage determines which governance checkpoints apply. Early-stage use cases (Ideation, POC) need target dates, while production systems need monitoring plans.',
    type: 'select',
    required: true,
    section: 'Strategic Alignment',
    stage: 'strategic-alignment',
    form: 'intake',
    options: [
      { value: 'backlog', label: 'Backlog' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'decommissioned', label: 'Decommissioned' },
      { value: 'ideation', label: 'Ideation' },
      { value: 'in_development', label: 'In Development' },
      { value: 'in_production', label: 'In Production' },
      { value: 'poc', label: 'Proof of Concept (POC)' },
    ],
  },
  {
    id: 'intake-q9',
    field: 'useStatus',
    label: 'Use Status',
    helpText: 'Current status of this intake request.',
    whyWeAsk:
      'Helps the governance team track whether this is a new submission or an update to an existing use case, and prioritize their review queue accordingly.',
    type: 'select',
    required: true,
    section: 'Strategic Alignment',
    stage: 'strategic-alignment',
    form: 'intake',
    options: [
      { value: 'new', label: 'New' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'complete', label: 'Complete' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    id: 'intake-q10',
    field: 'executiveSponsor',
    label: 'Executive Business Sponsor',
    helpText: 'Name and title of the executive sponsor.',
    whyWeAsk:
      'Executive sponsorship is required for high-risk and critical use cases. Having this on file early avoids delays during the pre-production assessment.',
    type: 'text',
    required: false,
    section: 'Strategic Alignment',
    stage: 'strategic-alignment',
    form: 'intake',
  },
  {
    id: 'intake-q11',
    field: 'strategicPriority',
    label: 'Strategic Portfolio Priority Alignment',
    helpText: 'How does this use case align with strategic portfolio priorities?',
    whyWeAsk:
      'Strategic alignment determines resource allocation and review priority. Enterprise Strategy and Must Do use cases get fast-tracked through the governance process.',
    type: 'select',
    required: true,
    section: 'Strategic Alignment',
    stage: 'strategic-alignment',
    form: 'intake',
    options: [
      { value: 'enterprise_strategy', label: '1 \u2013 Enterprise Strategy' },
      { value: 'must_do', label: '2 \u2013 Must Do' },
      { value: 'high_value', label: '3 \u2013 Initiative \u2013 high value' },
      { value: 'low_value', label: 'BU strategic initiative \u2013 low value' },
      { value: 'no_alignment', label: 'No Portfolio alignment' },
    ],
  },
  {
    id: 'intake-q12',
    field: 'targetPocQuarter',
    label: 'Target POC Implementation Quarter',
    helpText: 'e.g. Q3 2026',
    whyWeAsk:
      'Target dates help the ERAI team plan their review capacity and ensure governance checkpoints happen before deployment, not after.',
    type: 'text',
    required: false,
    section: 'Strategic Alignment',
    stage: 'strategic-alignment',
    form: 'intake',
  },
  {
    id: 'intake-q13',
    field: 'targetProductionQuarter',
    label: 'Target Production Implementation Quarter',
    helpText: 'e.g. Q1 2027',
    whyWeAsk:
      'Production target dates are critical for scheduling the pre-production risk assessment and ensuring all governance gates are cleared before go-live.',
    type: 'text',
    required: false,
    section: 'Strategic Alignment',
    stage: 'strategic-alignment',
    form: 'intake',
  },

  // ── Stage 3: Value Capture (4 questions, ~2 min) ──
  {
    id: 'intake-q14',
    field: 'valueDescription',
    label: 'Value Description',
    helpText:
      'Describe how value is created \u2013 productivity, revenue, risk reduction, customer experience, etc.',
    whyWeAsk:
      'Value description is used to prioritize use cases in the governance pipeline and to justify AI investments to leadership and regulators.',
    type: 'textarea',
    required: true,
    section: 'Value Capture',
    stage: 'value-capture',
    form: 'intake',
  },
  {
    id: 'intake-q15',
    field: 'valueCreationLevers',
    label: 'Value Creation Lever(s)',
    helpText: 'Select all applicable value creation levers.',
    whyWeAsk:
      'Value creation levers map directly to the enterprise value framework. They help quantify the business case and align AI investments with strategic goals.',
    type: 'multiselect',
    required: false,
    section: 'Value Capture',
    stage: 'value-capture',
    form: 'intake',
    options: [
      {
        value: 'bv_acquire_new_customers',
        label: 'BV \u2013 AUM & Revenue Growth \u2013 Acquire New Customers',
      },
      {
        value: 'bv_improve_cross_sell',
        label: 'BV \u2013 AUM & Revenue Growth \u2013 Improve Cross-Sell Penetration',
      },
      {
        value: 'bv_maximize_aum',
        label: 'BV \u2013 AUM & Revenue Growth \u2013 Maximize Assets Under Management',
      },
      {
        value: 'bv_retain_customers',
        label: 'BV \u2013 AUM & Revenue Growth \u2013 Retain Current Customers',
      },
      {
        value: 'bv_customer_satisfaction',
        label: 'BV \u2013 Customer Experience \u2013 Customer Satisfaction / Advocacy',
      },
      {
        value: 'bv_positive_outcomes',
        label: 'BV \u2013 Customer Experience \u2013 Positive Customer Outcomes',
      },
      {
        value: 'bv_improve_execution',
        label: 'BV \u2013 Expectations \u2013 Improve Execution Capabilities',
      },
      {
        value: 'bv_improve_management',
        label: 'BV \u2013 Expectations \u2013 Improve Management & Governance',
      },
      {
        value: 'bv_improve_corporate_services',
        label: 'BV \u2013 Operating Expense \u2013 Improve Corporate / Shared Services',
      },
      {
        value: 'bv_improve_interaction_efficiency',
        label: 'BV \u2013 Operating Expense \u2013 Improve Customer Interaction Efficiency',
      },
      {
        value: 'bv_improve_operations_efficiency',
        label: 'BV \u2013 Operating Expense \u2013 Improve Operations Efficiency',
      },
      {
        value: 'bv_improve_sales_effectiveness',
        label: 'BV \u2013 Operating Expense \u2013 Improve Sales Effectiveness',
      },
      { value: 'em_cost_avoidance', label: 'EM \u2013 Tech Governance \u2013 Cost Avoidance' },
      { value: 'em_facilities', label: 'EM \u2013 Tech Governance \u2013 Facilities' },
      { value: 'em_infrastructure', label: 'EM \u2013 Tech Governance \u2013 Infrastructure' },
      { value: 'em_labor', label: 'EM \u2013 Tech Governance \u2013 Labor' },
      { value: 'em_software', label: 'EM \u2013 Tech Governance \u2013 Software' },
      {
        value: 'vp_monitoring_logging',
        label: 'VP \u2013 Risk Avoidance \u2013 Application Status Monitoring & Logging Services',
      },
      {
        value: 'vp_automated_security',
        label: 'VP \u2013 Risk Avoidance \u2013 Automated and Enhanced Security',
      },
      {
        value: 'vp_disaster_recovery',
        label: 'VP \u2013 Risk Avoidance \u2013 Disaster Recovery',
      },
      {
        value: 'vp_business_continuity',
        label: 'VP \u2013 Risk Avoidance \u2013 Improved Business Continuity',
      },
      {
        value: 'vp_fault_tolerance',
        label: 'VP \u2013 Risk Avoidance \u2013 Increased Fault Tolerance',
      },
      {
        value: 'vp_reduce_exceptions',
        label: 'VP \u2013 Risk Avoidance \u2013 Reduce Exceptions',
      },
    ],
  },
  {
    id: 'intake-q16',
    field: 'reflectedInBudget',
    label: 'Reflected in Budget?',
    helpText: 'Is this use case reflected in an approved budget?',
    whyWeAsk:
      'Budget alignment affects prioritization and determines whether additional financial details (value levers, estimates) are needed for the business case.',
    type: 'select',
    required: false,
    section: 'Value Capture',
    stage: 'value-capture',
    form: 'intake',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'none', label: 'None' },
    ],
  },
  {
    id: 'intake-q17',
    field: 'valueEstimate',
    label: 'Value $ Estimate',
    helpText: 'Estimated financial value of the use case.',
    whyWeAsk:
      'Financial estimates help leadership prioritize the AI portfolio and are required for use cases seeking enterprise-level funding.',
    type: 'text',
    required: false,
    section: 'Value Capture',
    stage: 'value-capture',
    form: 'intake',
  },
];

// Helper to get questions by form
export function getQuestionsByForm(form: 'intake' | 'assessment'): QuestionDefinition[] {
  if (form === 'intake') return intakeQuestions;
  return assessmentQuestions;
}

// Helper to get question by field name
export function getQuestionByField(field: string): QuestionDefinition | undefined {
  return [...intakeQuestions, ...assessmentQuestions].find((q) => q.field === field);
}

// Intake wizard stages
export const intakeStages = [
  {
    id: 'quick-intake',
    title: 'Quick Intake',
    subtitle: '~3 min',
    sections: ['Quick Intake'],
  },
  {
    id: 'strategic-alignment',
    title: 'Strategic Alignment & Triage',
    subtitle: '~3 min',
    sections: ['Strategic Alignment'],
  },
  {
    id: 'value-capture',
    title: 'Value Capture',
    subtitle: '~2 min',
    sections: ['Value Capture'],
  },
  {
    id: 'review',
    title: 'Review & Submit',
    subtitle: '',
    sections: [],
  },
];

// ──────────────────────────────────────
// Assessment Questions (Sections A–I)
// ──────────────────────────────────────

export const assessmentQuestions: QuestionDefinition[] = [
  // ── Section A: Core Use Case & Governance (5 questions) ──
  {
    id: 'assess-q1',
    field: 'associatedUseCaseId',
    label: 'Select the AI Use Case associated to this assessment',
    helpText: 'Choose the intake use case this assessment is for.',
    whyWeAsk: 'Links this risk assessment to the specific use case registered during intake.',
    type: 'select',
    required: true,
    section: 'Core Use Case & Governance',
    stage: 'section-a',
    form: 'assessment',
    options: [], // populated dynamically from inventory
  },
  {
    id: 'assess-q2',
    field: 'araAssessmentId',
    label: 'Associated ARA assessment ID, if applicable',
    helpText: 'Enter the ARA assessment ID if one exists.',
    whyWeAsk: 'Links to the enterprise Algorithmic Risk Assessment for traceability.',
    type: 'text',
    required: false,
    section: 'Core Use Case & Governance',
    stage: 'section-a',
    form: 'assessment',
  },
  {
    id: 'assess-q3',
    field: 'isrRiskProjectId',
    label: 'Associated ISR Risk Project ID, if applicable',
    helpText: 'Enter the InfoSec Risk project ID if one exists.',
    whyWeAsk: 'Links to the InfoSec risk project for cross-referencing security reviews.',
    type: 'text',
    required: false,
    section: 'Core Use Case & Governance',
    stage: 'section-a',
    form: 'assessment',
  },
  {
    id: 'assess-q4',
    field: 'dpiaAssessmentId',
    label: 'Associated (D)PIA assessment ID, if applicable',
    helpText: 'Enter the Data Protection Impact Assessment ID if one exists.',
    whyWeAsk: 'Links to the privacy impact assessment for GDPR compliance traceability.',
    type: 'text',
    required: false,
    section: 'Core Use Case & Governance',
    stage: 'section-a',
    form: 'assessment',
  },
  {
    id: 'assess-q5',
    field: 'avaAssessmentId',
    label: 'Associated AVA assessment ID, if applicable',
    helpText: 'Enter the Application Vulnerability Assessment ID if one exists.',
    whyWeAsk: 'Links to the application vulnerability assessment for security traceability.',
    type: 'text',
    required: false,
    section: 'Core Use Case & Governance',
    stage: 'section-a',
    form: 'assessment',
  },

  // ── Section B: Deployment, Users, and Exposure (7 questions) ──
  {
    id: 'assess-q6',
    field: 'customerFacingOutputs',
    label: 'Will AI outputs be shared directly with customers, before or after human review?',
    helpText: 'Whether AI-generated content reaches external customers.',
    whyWeAsk:
      'Customer-facing AI outputs create reputational and regulatory risk. This drives transparency obligations under EU AI Act Article 50.',
    type: 'select',
    required: true,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q7',
    field: 'failureRisks',
    label: 'What risks apply if AI fails to perform as expected?',
    helpText: 'Select the primary risk category.',
    whyWeAsk:
      'Failure risk category drives the operational risk dimension of the scoring model and determines incident response requirements.',
    type: 'select',
    required: true,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
    options: [
      { value: 'financial', label: 'Financial' },
      { value: 'operational', label: 'Operational' },
      { value: 'product_pricing', label: 'Product and Pricing' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'assess-q8',
    field: 'currentStage',
    label: 'What stage is the use case in?',
    helpText: 'Pre-populated from intake — update if changed.',
    whyWeAsk:
      'Confirms the current lifecycle stage at assessment time, which may differ from intake.',
    type: 'select',
    required: true,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
    options: [
      { value: 'backlog', label: 'Backlog' },
      { value: 'ideation', label: 'Ideation' },
      { value: 'in_development', label: 'In Development' },
      { value: 'poc', label: 'Proof of Concept' },
      { value: 'ready_for_production', label: 'Ready for Production' },
    ],
  },
  {
    id: 'assess-q9',
    field: 'plannedPocDate',
    label: 'Planned POC/Development date',
    helpText: 'Year-Quarter, e.g. 2026-Q3. Pre-populated from intake.',
    whyWeAsk: 'Confirms POC timeline at assessment time for governance scheduling.',
    type: 'text',
    required: false,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
  },
  {
    id: 'assess-q10',
    field: 'plannedProductionDate',
    label: 'Planned production deployment date',
    helpText: 'Year-Quarter, e.g. 2027-Q1. Pre-populated from intake.',
    whyWeAsk: 'Confirms production timeline at assessment time for governance scheduling.',
    type: 'text',
    required: false,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
  },
  {
    id: 'assess-q11',
    field: 'hasInternalUsers',
    label: 'Are there internal users?',
    helpText: 'Whether employees or internal teams use this system.',
    whyWeAsk:
      'Internal user scope affects training requirements and change management obligations.',
    type: 'select',
    required: true,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q12',
    field: 'hasExternalUsers',
    label: 'Are there external users or recipients?',
    helpText:
      'Whether customers, partners, or other external parties interact with or receive outputs.',
    whyWeAsk:
      'External users/recipients trigger transparency obligations and increase reputational risk scoring.',
    type: 'select',
    required: true,
    section: 'Deployment & Exposure',
    stage: 'section-b',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },

  // ── Section C: Data, Privacy, and Geography (9 questions) ──
  {
    id: 'assess-q13',
    field: 'dataClassification',
    label: 'Data classifications used in production',
    helpText: 'Select the highest applicable classification.',
    whyWeAsk:
      'Data classification drives the data risk dimension. Customer Confidential data significantly elevates risk scoring.',
    type: 'select',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'internal', label: 'Internal' },
      { value: 'company_confidential', label: 'Company Confidential' },
      { value: 'customer_confidential', label: 'Customer Confidential' },
    ],
  },
  {
    id: 'assess-q14',
    field: 'dataPersistent',
    label: 'Will input or output data be persistent?',
    helpText: 'Whether data is stored beyond the immediate transaction.',
    whyWeAsk:
      'Persistent data increases privacy risk and triggers data retention policy requirements.',
    type: 'select',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q15',
    field: 'dataStorageLocations',
    label: 'Location(s) where data is stored',
    helpText: 'Select all applicable data storage locations.',
    whyWeAsk:
      'Data residency affects regulatory compliance (GDPR, state privacy laws) and cross-border transfer restrictions.',
    type: 'multiselect',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'eu', label: 'European Union' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'apac', label: 'Asia-Pacific' },
      { value: 'latam', label: 'Latin America' },
    ],
  },
  {
    id: 'assess-q16',
    field: 'dataInCatalogue',
    label: 'Is data inventoried in an enterprise data catalogue?',
    helpText: 'Whether the data sources are registered in the enterprise catalogue.',
    whyWeAsk:
      'Data governance requires catalogued data. Uncatalogued data sources present lineage and quality risks.',
    type: 'select',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q17',
    field: 'unstructuredDataDev',
    label: 'Will unstructured data be used to develop the AI use case?',
    helpText: 'e.g., documents, images, audio, free-text.',
    whyWeAsk:
      'Unstructured data increases model complexity and bias risk, requiring additional quality and fairness testing.',
    type: 'select',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q18',
    field: 'unstructuredDataProd',
    label: 'Will unstructured data be an input in production?',
    helpText: 'Whether unstructured data flows through the system in production.',
    whyWeAsk:
      'Production use of unstructured data requires additional monitoring for data drift and quality degradation.',
    type: 'select',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q19',
    field: 'interactsWithPii',
    label: 'Will the AI system interact with PII?',
    helpText: 'Personally Identifiable Information.',
    whyWeAsk:
      'PII interaction triggers privacy impact assessment requirements and elevates data risk scoring.',
    type: 'select',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q20',
    field: 'deploymentRegions',
    label: 'Geographic regions for deployment \u2014 data subjects',
    helpText: 'Where are the people affected by this AI system located?',
    whyWeAsk:
      'EU data subjects trigger EU AI Act obligations. Multi-region deployment increases regulatory complexity.',
    type: 'multiselect',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'apac', label: 'Asia-Pacific' },
      { value: 'eu', label: 'European Union' },
      { value: 'latam', label: 'Latin America' },
      { value: 'us', label: 'United States' },
    ],
  },
  {
    id: 'assess-q21',
    field: 'dataProcessingRegions',
    label: 'Geographic regions for data collection, processing, storage',
    helpText: 'Where is data collected, processed, and stored?',
    whyWeAsk:
      'Cross-border data flows trigger transfer mechanism requirements (SCCs, adequacy decisions).',
    type: 'multiselect',
    required: true,
    section: 'Data & Privacy',
    stage: 'section-c',
    form: 'assessment',
    options: [
      { value: 'apac', label: 'Asia-Pacific' },
      { value: 'eu', label: 'European Union' },
      { value: 'latam', label: 'Latin America' },
      { value: 'us', label: 'United States' },
    ],
  },

  // ── Section D: Decisioning, Monitoring, and Business Scope (5 questions) ──
  {
    id: 'assess-q22',
    field: 'replacesHumanDecisions',
    label: 'Will AI replace human decision making?',
    helpText: 'No if AI supplements/assists human decisions.',
    whyWeAsk:
      'Replacing human decisions is a key trigger for High Risk classification under the EU AI Act and increases fairness risk.',
    type: 'select',
    required: true,
    section: 'Decisioning & Scope',
    stage: 'section-d',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q23',
    field: 'automatesExternalDecisions',
    label: 'Will AI automate external stakeholder decisions?',
    helpText: 'Whether AI makes or significantly influences decisions about external parties.',
    whyWeAsk:
      'Automated decisions affecting external stakeholders trigger GDPR Article 22 obligations and Annex III classification.',
    type: 'select',
    required: true,
    section: 'Decisioning & Scope',
    stage: 'section-d',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q24',
    field: 'monitorsHumanActivity',
    label: 'Will the AI system track or monitor human activity?',
    helpText: 'Whether the system observes, records, or analyzes human behavior.',
    whyWeAsk:
      'Monitoring human activity is a sensitive use case that may trigger workplace surveillance regulations and Annex III #4 (employment).',
    type: 'select',
    required: true,
    section: 'Decisioning & Scope',
    stage: 'section-d',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q25',
    field: 'businessActivities',
    label: 'Business activities involved',
    helpText: 'Select all applicable regulated business activities.',
    whyWeAsk:
      'Specific business activities map directly to EU AI Act Annex III high-risk categories (employment, insurance, investment, pricing).',
    type: 'multiselect',
    required: true,
    section: 'Decisioning & Scope',
    stage: 'section-d',
    form: 'assessment',
    options: [
      { value: 'hr_automated_hiring', label: 'HR: Automated hiring decisions' },
      { value: 'hr_workforce_monitoring', label: 'HR: Workforce monitoring' },
      {
        value: 'insurance_decisions',
        label: 'Insurance: Decisions on premiums, denials, approvals',
      },
      { value: 'investment_decisions', label: 'Investments: Investment decisions or advice' },
      { value: 'marketing_materials', label: 'Marketing materials' },
      {
        value: 'pricing_underwriting',
        label: 'Pricing/Underwriting: Assist with pricing or underwriting',
      },
      { value: 'none', label: 'None of the above' },
    ],
  },
  {
    id: 'assess-q26',
    field: 'accessFinancialInfo',
    label: 'Will AI have access to personal or entity financial information?',
    helpText: 'Whether the system processes financial data about individuals or entities.',
    whyWeAsk:
      'Access to financial information elevates data sensitivity scoring and may trigger financial services regulations.',
    type: 'select',
    required: true,
    section: 'Decisioning & Scope',
    stage: 'section-d',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },

  // ── Section E: Security, Models, and Operations (10 questions) ──
  {
    id: 'assess-q27',
    field: 'infosecComplete',
    label: 'Is an InfoSec risk project complete or in progress?',
    helpText: 'Whether an information security risk assessment has been initiated.',
    whyWeAsk:
      'InfoSec assessment is a prerequisite for production deployment in the governance process.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q28',
    field: 'aiModelsUsed',
    label: 'Which AI models are used?',
    helpText: 'Name the specific models (e.g., GPT-4, BERT, custom XGBoost).',
    whyWeAsk:
      'Model identification drives the technical risk dimension — LLMs carry different risks than classical ML.',
    type: 'text',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
  },
  {
    id: 'assess-q29',
    field: 'approvedPipeline',
    label: 'Are you using an approved internal AI development pipeline?',
    helpText: 'Whether the model was developed using an enterprise-approved MLOps pipeline.',
    whyWeAsk:
      'Approved pipelines have built-in governance controls. Shadow AI developed outside pipelines carries additional risk.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q30',
    field: 'vendorAuditScope',
    label: 'Have AI features been included in vendor audit scope (ISO 42001, SOC 2)?',
    helpText: 'Whether vendor audits cover AI-specific controls.',
    whyWeAsk:
      'ISO 42001 and SOC 2 AI coverage indicate mature vendor governance. Gaps here elevate third-party risk.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q31',
    field: 'usesGenAi',
    label: 'Will you be using Generative AI?',
    helpText: 'LLMs, image generators, code generators, etc.',
    whyWeAsk:
      'Generative AI introduces unique risks: hallucination, IP infringement, prompt injection. This gates additional assessment questions.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q32',
    field: 'humanValidatesOutputs',
    label: 'Will humans validate AI outputs before business use?',
    helpText: 'Whether a human reviews/approves AI outputs before they are acted upon.',
    whyWeAsk:
      'Human-in-the-loop validation is the strongest risk mitigation. Absence significantly increases fairness and operational risk.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q33',
    field: 'usesClassicalModels',
    label: 'Will you use internally trained classical models?',
    helpText:
      'e.g., logistic regression, random forest, XGBoost, neural networks trained in-house.',
    whyWeAsk:
      'Classical models have different risk profiles than GenAI — more predictable but require SR 11-7 model risk management.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q34',
    field: 'dataAccessible',
    label: 'Is required data already identified and accessible?',
    helpText: 'Whether all data needed for the AI system is available.',
    whyWeAsk:
      'Inaccessible data creates development delays and may indicate shadow data sources with governance gaps.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q35',
    field: 'incidentResponsePlan',
    label: 'Is there an incident response plan for AI performance issues?',
    helpText: 'Whether a documented plan exists for handling AI failures or degradation.',
    whyWeAsk:
      'Incident response plans are required for High Risk and Critical use cases. Absence elevates operational risk.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q36',
    field: 'aiFunctionCategory',
    label: 'What AI function category applies?',
    helpText: 'The primary function of the AI system.',
    whyWeAsk:
      'Function category helps map to internal risk taxonomy and regulatory reporting requirements.',
    type: 'select',
    required: true,
    section: 'Security & Operations',
    stage: 'section-e',
    form: 'assessment',
    options: [
      { value: 'financial', label: 'Financial' },
      { value: 'operational', label: 'Operational' },
      { value: 'product_pricing', label: 'Product and Pricing' },
      { value: 'other', label: 'Other' },
      { value: 'na', label: 'N/A' },
    ],
  },

  // ── Section F: Testing and Monitoring (3 questions) ──
  {
    id: 'assess-q37',
    field: 'preDeploymentTesting',
    label: 'What AI function testing will be done before deployment?',
    helpText: 'Describe your testing strategy for accuracy, performance, and edge cases.',
    whyWeAsk:
      'Pre-deployment testing is required by NIST AI RMF and EU AI Act. Documenting the approach enables audit and validation.',
    type: 'textarea',
    required: true,
    section: 'Testing & Monitoring',
    stage: 'section-f',
    form: 'assessment',
  },
  {
    id: 'assess-q38',
    field: 'driftMonitoring',
    label: 'How will AI output and model drift be monitored?',
    helpText: 'Describe your monitoring approach for model performance degradation.',
    whyWeAsk:
      'Ongoing monitoring is a critical gap identified in our governance process. Without drift detection, model risk grows silently.',
    type: 'textarea',
    required: true,
    section: 'Testing & Monitoring',
    stage: 'section-f',
    form: 'assessment',
  },
  {
    id: 'assess-q39',
    field: 'adversarialTesting',
    label: 'Describe the adversarial/red team testing approach, if any',
    helpText: 'How will the system be tested against adversarial inputs and prompt injection?',
    whyWeAsk:
      'Adversarial testing is a new requirement from our gap analysis. GenAI systems are particularly vulnerable to prompt injection and jailbreaking.',
    type: 'textarea',
    required: true,
    section: 'Testing & Monitoring',
    stage: 'section-f',
    form: 'assessment',
  },

  // ── Section G: Emerging AI Risks (4 questions) ──
  {
    id: 'assess-q40',
    field: 'autonomousActions',
    label: 'Does the AI system take autonomous actions without human approval at each step?',
    helpText: 'Whether the AI can act independently (agentic AI).',
    whyWeAsk:
      'Agentic AI introduces novel risks: uncontrolled actions, cascading failures, unauthorized operations. This is a new assessment dimension from our gap analysis.',
    type: 'select',
    required: true,
    section: 'Emerging AI Risks',
    stage: 'section-g',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q41',
    field: 'usesRag',
    label: 'Does the system use retrieval-augmented generation (RAG) with enterprise documents?',
    helpText: 'Whether the AI retrieves and uses internal documents to generate responses.',
    whyWeAsk:
      'RAG systems can inadvertently expose confidential information across authorization boundaries. This risk is not covered by traditional assessments.',
    type: 'select',
    required: true,
    section: 'Emerging AI Risks',
    stage: 'section-g',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q42',
    field: 'usesToolCalling',
    label: 'Does the system use tool calling, function calling, or code execution?',
    helpText: 'Whether the AI can invoke external APIs, execute code, or use tools.',
    whyWeAsk:
      'Tool-calling capabilities enable the AI to affect external systems, creating blast radius risk beyond the AI system itself.',
    type: 'select',
    required: true,
    section: 'Emerging AI Risks',
    stage: 'section-g',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q43',
    field: 'maxAutonomousImpact',
    label:
      'What is the maximum financial impact of a single autonomous action without human intervention?',
    helpText: 'Estimate the worst-case financial impact of one unsupervised AI action.',
    whyWeAsk:
      'Financial blast radius of autonomous actions determines governance tier and approval requirements for agentic AI.',
    type: 'select',
    required: true,
    section: 'Emerging AI Risks',
    stage: 'section-g',
    form: 'assessment',
    options: [
      { value: 'under_1k', label: '< $1K' },
      { value: '1k_10k', label: '$1K - $10K' },
      { value: '10k_100k', label: '$10K - $100K' },
      { value: '100k_1m', label: '$100K - $1M' },
      { value: 'over_1m', label: '> $1M' },
      { value: 'na', label: 'N/A' },
    ],
  },

  // ── Section H: Explainability and Transparency (3 questions) ──
  {
    id: 'assess-q44',
    field: 'canExplainOutputs',
    label: 'Can the AI system provide explanations for its outputs or decisions?',
    helpText: 'Whether the system can generate interpretable explanations.',
    whyWeAsk:
      'Explainability is required by EU AI Act Article 13 for high-risk systems and NIST AI RMF for trustworthy AI.',
    type: 'select',
    required: true,
    section: 'Explainability & Transparency',
    stage: 'section-h',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'partial', label: 'Partial' },
    ],
  },
  {
    id: 'assess-q45',
    field: 'usersInformedOfAi',
    label: 'Are end users or affected individuals informed that AI is being used?',
    helpText: 'Whether there is disclosure that AI powers the system.',
    whyWeAsk:
      'Transparency disclosure is required by EU AI Act Article 50 for systems interacting with humans. Non-disclosure is a compliance gap.',
    type: 'select',
    required: true,
    section: 'Explainability & Transparency',
    stage: 'section-h',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q46',
    field: 'logRetentionPeriod',
    label: 'What log retention period applies to AI inputs, outputs, and decision rationale?',
    helpText: 'How long are AI interaction logs retained?',
    whyWeAsk:
      'EU AI Act Article 12 requires log retention for high-risk systems. Insufficient retention creates audit and investigation gaps.',
    type: 'select',
    required: true,
    section: 'Explainability & Transparency',
    stage: 'section-h',
    form: 'assessment',
    options: [
      { value: 'under_30', label: '< 30 days' },
      { value: '30_90', label: '30-90 days' },
      { value: '90_180', label: '90-180 days' },
      { value: 'over_180', label: '180+ days' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },

  // ── Section I: Third-Party AI Vendor Assessment (conditional) ──
  {
    id: 'assess-q47',
    field: 'involvesThirdParty',
    label: 'Does this use case involve third-party tools or services with AI capabilities?',
    helpText: 'Whether any external vendor provides AI technology for this use case.',
    whyWeAsk:
      'Third-party AI introduces supply chain risk. "Yes" triggers the full vendor assessment section below.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q48',
    field: 'thirdPartyName',
    label: 'Third party name',
    helpText: 'Name of the vendor providing AI technology.',
    whyWeAsk: 'Vendor identification for tracking, audit trail, and concentration risk analysis.',
    type: 'text',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
  },
  {
    id: 'assess-q49',
    field: 'vendorRetainsDataForTraining',
    label: 'Will vendor retain data for foundation model training?',
    helpText: 'Whether your data is used to train the vendor\u2019s base models.',
    whyWeAsk:
      'Data used for model training becomes part of the model permanently. This has confidentiality and IP implications.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q50',
    field: 'vendorRetainsDataOther',
    label: 'Will vendor retain data for other usage?',
    helpText: 'Whether the vendor keeps your data for purposes beyond model training.',
    whyWeAsk:
      'Vendor data retention beyond training may violate privacy agreements or regulations.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q51',
    field: 'vendorRetainsOutputs',
    label: 'Will vendor retain generated outputs (IP)?',
    helpText: 'Whether the vendor keeps AI-generated content.',
    whyWeAsk:
      'Retained outputs may constitute company IP leakage, especially for proprietary analysis.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q52',
    field: 'canOptOutGenAi',
    label: 'Is there an option to opt out of generative features?',
    helpText: 'Whether GenAI features can be disabled.',
    whyWeAsk:
      'Opt-out capability provides a risk mitigation lever if governance requirements change.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q53',
    field: 'promptRetentionPeriod',
    label: 'How long are inputs/prompts retained via UI/API?',
    helpText: 'Vendor retention period for submitted prompts and inputs.',
    whyWeAsk: 'Prompt retention is a key privacy and IP risk factor for GenAI vendors.',
    type: 'text',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
  },
  {
    id: 'assess-q54',
    field: 'dataUsedForTraining',
    label: 'Will data be used to further train the model?',
    helpText: 'Whether your ongoing usage data feeds back into model training.',
    whyWeAsk:
      'Ongoing training with your data has different implications than one-time training \u2014 it creates persistent data exposure.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q55',
    field: 'vendorHasGuardrails',
    label: 'Does the vendor model have guardrails?',
    helpText: 'Whether the vendor has safety controls on model outputs.',
    whyWeAsk:
      'Vendor guardrails (content filtering, output restrictions) are a baseline safety requirement.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q56',
    field: 'vendorChangeManagement',
    label: 'Does vendor have change/release management for toxic outputs, hallucinations, bias?',
    helpText: 'Whether the vendor actively manages model output quality issues.',
    whyWeAsk:
      'Vendor change management for AI-specific risks indicates maturity. Absence means you bear the full monitoring burden.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q57',
    field: 'vendorIso42001',
    label: 'Is the vendor ISO 42001 certified?',
    helpText: 'ISO 42001 is the international standard for AI management systems.',
    whyWeAsk:
      'ISO 42001 certification is the gold standard for AI vendor governance. It significantly reduces third-party risk scoring.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q58',
    field: 'vendorModelingApproaches',
    label: 'Which AI modeling approaches are used?',
    helpText: 'Select all that apply.',
    whyWeAsk:
      'Different modeling approaches carry different risk profiles and require different validation strategies.',
    type: 'multiselect',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'llm', label: 'Large Language Model' },
      { value: 'classical_ml', label: 'Classical ML (regression, trees, etc.)' },
      { value: 'deep_learning', label: 'Deep Learning (CNN, RNN, etc.)' },
      { value: 'rule_based', label: 'Rule-based / Expert System' },
      { value: 'reinforcement', label: 'Reinforcement Learning' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'assess-q59',
    field: 'modelCommercialOrOpen',
    label: 'Is the model commercial or open source?',
    helpText: 'Licensing model of the AI technology.',
    whyWeAsk:
      'Open source models have different IP, support, and liability characteristics than commercial models.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'commercial', label: 'Commercial' },
      { value: 'open_source', label: 'Open Source' },
    ],
  },
  {
    id: 'assess-q60',
    field: 'vendorTransparencyReports',
    label: 'Does the LLM provider publish model transparency reports by version?',
    helpText: 'Whether model cards or transparency reports are available.',
    whyWeAsk:
      'Transparency reports enable independent risk assessment and demonstrate vendor commitment to responsible AI.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q61',
    field: 'vendorPerformanceMetrics',
    label: 'Does the vendor AI model have shareable performance metrics?',
    helpText: 'Whether you can access benchmark results and performance data.',
    whyWeAsk: 'Shareable metrics enable independent validation and ongoing performance monitoring.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q62',
    field: 'vendorNotifiesModelChanges',
    label: 'Will vendor notify of model changes?',
    helpText: 'Whether you are informed when the underlying model is updated.',
    whyWeAsk:
      'Unnotified model changes can silently alter risk profiles and break validated behaviors.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q63',
    field: 'vendorNotifiesNewAi',
    label: 'Will vendor notify if new AI functionality is enabled?',
    helpText: 'Whether new AI features are disclosed before activation.',
    whyWeAsk:
      'Surprise AI features can introduce unassessed risks into previously validated systems.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q64',
    field: 'copyrightRisk',
    label: 'Do vendor GenAI models pose copyright infringement risk?',
    helpText: 'Whether model outputs may infringe on third-party intellectual property.',
    whyWeAsk:
      'GenAI copyright risk is evolving rapidly. This captures the current assessment for legal review.',
    type: 'select',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assess-q65',
    field: 'trainingProcessDescription',
    label: 'Describe model training process',
    helpText:
      'How was the model trained? Include data sources, methodology, and validation approach.',
    whyWeAsk:
      'Training process transparency is required by ISO 42001 and EU AI Act for high-risk systems.',
    type: 'textarea',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
  },
  {
    id: 'assess-q66',
    field: 'dataPreprocessingDescription',
    label: 'How was training data preprocessed, cleaned, validated for quality and bias?',
    helpText: 'Describe the data quality and bias mitigation process.',
    whyWeAsk:
      'Training data quality directly determines model fairness. This is a key NIST AI RMF requirement.',
    type: 'textarea',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
  },
  {
    id: 'assess-q67',
    field: 'biasFairnessTesting',
    label: 'Has model been tested for bias/fairness across different groups?',
    helpText: 'Describe any bias and fairness testing performed.',
    whyWeAsk:
      'Bias testing is required by EU AI Act for high-risk systems and by NAIC Model Bulletin for insurance AI.',
    type: 'textarea',
    required: true,
    section: 'Third-Party Assessment',
    stage: 'section-i',
    form: 'assessment',
  },
];

// Assessment wizard sections
export const assessmentSections = [
  { id: 'section-a', title: 'Core Use Case & Governance', subtitle: 'Section A' },
  { id: 'section-b', title: 'Deployment, Users & Exposure', subtitle: 'Section B' },
  { id: 'section-c', title: 'Data, Privacy & Geography', subtitle: 'Section C' },
  { id: 'section-d', title: 'Decisioning, Monitoring & Scope', subtitle: 'Section D' },
  { id: 'section-e', title: 'Security, Models & Operations', subtitle: 'Section E' },
  { id: 'section-f', title: 'Testing & Monitoring', subtitle: 'Section F' },
  { id: 'section-g', title: 'Emerging AI Risks', subtitle: 'Section G' },
  { id: 'section-h', title: 'Explainability & Transparency', subtitle: 'Section H' },
  { id: 'section-i', title: 'Third-Party Vendor Assessment', subtitle: 'Section I' },
  { id: 'assessment-review', title: 'Review & Submit', subtitle: '' },
];
