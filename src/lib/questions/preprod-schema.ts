import { z } from 'zod';

// Pre-production assessment schema — all 59 fields
// Many are optional because they depend on conditional display logic
export const preprodSchema = z.object({
  // Section 1: Core Use Case & Governance
  detailedDescription: z.string().min(10).max(10000),
  businessJustification: z.string().min(10).max(5000),
  governanceSponsor: z.string().min(1),
  aiChampion: z.string().min(1),
  complianceReviewStatus: z.enum(['not_started', 'in_progress', 'completed', 'not_required']),
  legalReviewStatus: z.enum(['not_started', 'in_progress', 'completed', 'not_required']),
  privacyImpactAssessment: z
    .enum(['not_started', 'in_progress', 'completed', 'not_required'])
    .optional(),
  existingRiskAssessmentRef: z.string().optional(),
  regulatoryRequirements: z
    .array(
      z.enum([
        'gdpr',
        'ccpa',
        'hipaa',
        'sox',
        'fair_lending',
        'ada',
        'eeoc',
        'state_ai_laws',
        'eu_ai_act',
        'none',
      ]),
    )
    .optional(),
  complianceDocLink: z.string().optional(),

  // Section 2: Deployment, Users & Exposure
  deploymentEnvironment: z
    .enum(['cloud_aws', 'cloud_azure', 'cloud_gcp', 'on_premise', 'hybrid', 'saas_vendor'])
    .optional(),
  integrationPoints: z
    .array(
      z.enum([
        'api',
        'database',
        'file_transfer',
        'ui_embedded',
        'standalone',
        'email',
        'messaging',
      ]),
    )
    .optional(),
  userAuthMethod: z
    .enum(['sso_okta', 'sso_other', 'api_key', 'no_auth', 'vendor_managed'])
    .optional(),
  userTrainingRequired: z.boolean().optional(),
  userTrainingPlan: z.string().optional(),
  accessibilityCompliance: z
    .enum(['wcag_aa', 'wcag_aaa', 'section_508', 'not_applicable', 'unknown'])
    .optional(),
  customerDisclosure: z.enum(['disclosed', 'not_disclosed', 'not_applicable']).optional(),
  disclosureMethod: z.string().optional(),
  fallbackProcess: z.string().min(1).optional(),
  incidentResponsePlan: z.enum(['existing_plan', 'new_plan_needed', 'not_started']).optional(),

  // Section 3: Data, Privacy & Geography
  dataSources: z
    .array(
      z.enum([
        'internal_db',
        'customer_provided',
        'public_data',
        'vendor_data',
        'web_scraped',
        'synthetic',
        'partner_data',
      ]),
    )
    .optional(),
  dataVolume: z.enum(['small', 'medium', 'large', 'very_large']).optional(),
  dataRetentionPolicy: z
    .enum(['30_days', '90_days', '1_year', '3_years', 'indefinite', 'per_regulation'])
    .optional(),
  dataResidency: z
    .array(z.enum(['us_only', 'eu_only', 'country_specific', 'no_restriction']))
    .optional(),
  crossBorderTransfer: z.boolean().optional(),
  dataEncryption: z
    .enum(['at_rest_and_transit', 'at_rest_only', 'transit_only', 'none', 'unknown'])
    .optional(),
  piiHandling: z.string().optional(),
  dataAnonymization: z
    .enum(['fully_anonymized', 'pseudonymized', 'de_identified', 'raw_data', 'not_applicable'])
    .optional(),
  consentMechanism: z
    .enum([
      'explicit_consent',
      'implied_consent',
      'contractual',
      'legitimate_interest',
      'not_applicable',
    ])
    .optional(),
  dataSharing: z.boolean().optional(),

  // Section 4: Decisioning, Monitoring & Business Scope
  decisionType: z
    .enum(['recommendation', 'scoring', 'classification', 'generation', 'automation', 'prediction'])
    .optional(),
  humanOverride: z.enum(['always_available', 'available_on_request', 'limited', 'none']).optional(),
  appealProcess: z.string().optional(),
  biasTesting: z
    .enum(['completed', 'in_progress', 'planned', 'not_planned', 'not_applicable'])
    .optional(),
  biasTestingResults: z.string().optional(),
  performanceMetrics: z.string().min(1).optional(),
  monitoringApproach: z
    .enum(['real_time', 'periodic_batch', 'manual_review', 'vendor_managed', 'none'])
    .optional(),
  driftDetection: z.enum(['automated', 'manual', 'planned', 'none']).optional(),
  retrainingFrequency: z
    .enum([
      'continuous',
      'monthly',
      'quarterly',
      'annually',
      'as_needed',
      'vendor_managed',
      'not_applicable',
    ])
    .optional(),
  businessContinuityImpact: z.enum(['critical', 'high', 'medium', 'low']).optional(),

  // Section 5: Security, Models & Operations
  modelType: z
    .array(
      z.enum([
        'llm',
        'ml_classification',
        'ml_regression',
        'computer_vision',
        'nlp',
        'reinforcement_learning',
        'rules_based',
        'ensemble',
        'other',
      ]),
    )
    .optional(),
  modelProvider: z
    .enum(['openai', 'anthropic', 'google', 'aws', 'azure', 'open_source', 'internal', 'other'])
    .optional(),
  foundationModelName: z.string().optional(),
  fineTuning: z
    .enum(['none', 'fine_tuned', 'rag', 'prompt_engineering', 'custom_trained'])
    .optional(),
  securityReviewStatus: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  penTestStatus: z.enum(['completed', 'scheduled', 'not_planned', 'not_applicable']).optional(),
  promptInjectionMitigation: z.string().optional(),
  outputFiltering: z
    .enum(['content_filter', 'guardrails', 'manual_review', 'none', 'not_applicable'])
    .optional(),
  apiSecurity: z
    .array(
      z.enum([
        'rate_limiting',
        'authentication',
        'encryption',
        'input_validation',
        'logging',
        'none',
      ]),
    )
    .optional(),
  secretsManagement: z
    .enum(['vault', 'env_variables', 'key_management_service', 'other', 'not_applicable'])
    .optional(),

  // Section 6: Third-Party Vendor Assessment
  vendorRiskAssessment: z.enum(['completed', 'in_progress', 'not_started']).optional(),
  vendorSoc2: z.enum(['type_1', 'type_2', 'not_available', 'not_applicable']).optional(),
  vendorDpa: z.enum(['signed', 'in_review', 'not_started', 'not_applicable']).optional(),
  vendorAiEthicsPolicy: z
    .enum(['reviewed_acceptable', 'reviewed_concerns', 'not_available', 'not_reviewed'])
    .optional(),
  vendorModelCard: z.enum(['provided', 'requested', 'not_available']).optional(),
  vendorSla: z.string().optional(),
  vendorExitStrategy: z.string().optional(),
  vendorSubprocessors: z.boolean().optional(),
  vendorSubprocessorDetails: z.string().optional(),
});

export const preprodDraftSchema = preprodSchema.partial();

export type PreprodFormData = z.infer<typeof preprodSchema>;
export type PreprodDraftData = z.infer<typeof preprodDraftSchema>;
