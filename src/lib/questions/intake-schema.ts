import { z } from 'zod';

export const intakeSchema = z.object({
  // Section A: Tell Us About Your AI Use Case
  useCaseName: z.string().min(1, 'Use case name is required').max(200),
  useCaseOwner: z.string().min(1, 'Use case owner is required').max(200),
  executiveSponsor: z.string().min(1, 'Executive sponsor is required').max(200),
  businessArea: z.string().min(1, 'Business area is required'),
  businessProblem: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  howAiHelps: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  aiType: z.enum(
    [
      'generative_ai',
      'predictive_classification',
      'rpa_with_ai',
      'ai_agent',
      'computer_vision',
      'rag',
      'other_not_sure',
    ],
    { message: 'AI type is required' },
  ),
  buildOrAcquire: z.enum(
    [
      'custom_development',
      'citizen_development',
      'buying_new_vendor',
      'using_existing_tool',
      'not_sure_yet',
    ],
    { message: 'This field is required' },
  ),
  thirdPartyInvolved: z.enum(['yes', 'no'], { message: 'This field is required' }),
  vendorName: z.string().max(200).optional(),
  auditability: z.enum(['can_inspect', 'black_box', 'dont_know']).optional(),
  usesFoundationModel: z.enum(['yes', 'no', 'dont_know'], { message: 'This field is required' }),
  whichModels: z.array(z.string()).optional(),
  deploymentRegions: z
    .array(z.enum(['us_only', 'eu_eea', 'uk', 'canada', 'other']))
    .min(1, 'At least one region is required'),
  deploymentRegionsOther: z.string().max(500).optional(),
  lifecycleStage: z.enum(
    ['idea_planning', 'development_poc', 'testing_pilot', 'in_production', 'being_retired'],
    { message: 'Lifecycle stage is required' },
  ),
  previouslyReviewed: z.enum(['yes', 'no', 'dont_know'], { message: 'This field is required' }),
  highRiskTriggers: z
    .array(
      z.enum([
        'insurance_pricing',
        'investment_advice',
        'credit_lending',
        'hiring_workforce',
        'fraud_detection',
        'fine_tuning_llm',
        'biometric_id',
        'emotion_detection',
        'none_of_above',
      ]),
    )
    .min(1, 'At least one selection is required'),
  whoUsesSystem: z.enum(['internal_only', 'external_only', 'both'], {
    message: 'This field is required',
  }),
  whoAffected: z.enum(['internal_only', 'external', 'both', 'general_public'], {
    message: 'This field is required',
  }),
  worstOutcome: z.enum(['minor', 'moderate', 'significant', 'serious'], {
    message: 'This field is required',
  }),

  // Section B: Additional Details for ERAI
  dataSensitivity: z
    .array(
      z.enum([
        'public',
        'internal',
        'company_confidential',
        'customer_confidential',
        'personal_info',
        'health_info',
        'regulated_financial',
      ]),
    )
    .min(1, 'At least one selection is required'),
  humanOversight: z.enum(
    ['human_decides', 'human_reviews', 'spot_check', 'fully_autonomous', 'not_applicable'],
    { message: 'This field is required' },
  ),
  differentialTreatment: z.enum(['no', 'unlikely', 'possibly', 'yes', 'dont_know'], {
    message: 'This field is required',
  }),
  peopleAffectedCount: z.enum(
    ['under_100', '100_1000', '1000_10000', '10000_100000', 'over_100000'],
    { message: 'This field is required' },
  ),
  additionalNotes: z.string().max(5000).optional(),

  // Section C: Portfolio Alignment
  strategicPriority: z.enum(
    ['enterprise_strategy', 'must_do', 'high_value', 'low_value', 'no_alignment'],
    { message: 'Strategic priority is required' },
  ),
  targetPocQuarter: z.string().max(20).optional(),
  targetProductionQuarter: z.string().max(20).optional(),
  valueDescription: z.string().max(5000).optional(),
  valueCreationLevers: z
    .array(
      z.enum([
        'bv_acquire_new_customers',
        'bv_improve_cross_sell',
        'bv_maximize_aum',
        'bv_retain_customers',
        'bv_customer_satisfaction',
        'bv_positive_outcomes',
        'bv_improve_execution',
        'bv_improve_management',
        'bv_improve_corporate_services',
        'bv_improve_interaction_efficiency',
        'bv_improve_operations_efficiency',
        'bv_improve_sales_effectiveness',
        'em_cost_avoidance',
        'em_facilities',
        'em_infrastructure',
        'em_labor',
        'em_software',
        'vp_monitoring_logging',
        'vp_automated_security',
        'vp_disaster_recovery',
        'vp_business_continuity',
        'vp_fault_tolerance',
        'vp_reduce_exceptions',
        'placeholder_1',
        'placeholder_2',
        'placeholder_3',
      ]),
    )
    .optional(),
  reflectedInBudget: z.boolean().optional(),
  valueEstimate: z.string().max(100).optional(),
});

// Draft schema — same fields but all optional for save-as-you-go
export const intakeDraftSchema = intakeSchema.partial();

export type IntakeFormData = z.infer<typeof intakeSchema>;
export type IntakeDraftData = z.infer<typeof intakeDraftSchema>;
