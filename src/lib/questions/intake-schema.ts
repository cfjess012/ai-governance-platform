import { z } from 'zod';

export const intakeSchema = z.object({
  // Stage 1: Quick Intake
  useCaseName: z.string().min(1, 'Use case name is required').max(200),
  solutionType: z.enum(['citizen_development', 'custom', 'existing_tool', 'new_tool', 'unknown'], {
    message: 'Solution type is required',
  }),
  businessPurpose: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  businessArea: z.string().min(1, 'Business area is required').max(200),
  useCaseOwner: z.string().min(1, 'Use case owner is required').max(200),
  ethicalAiAligned: z.boolean({ message: 'Ethical AI alignment is required' }),
  prohibitedPractices: z.enum(['none', 'yes', 'no'], { message: 'This field is required' }),

  // Stage 2: Strategic Alignment & Triage
  lifecycleStage: z.enum(
    [
      'backlog',
      'cancelled',
      'decommissioned',
      'ideation',
      'in_development',
      'in_production',
      'poc',
    ],
    { message: 'Lifecycle stage is required' },
  ),
  useStatus: z.enum(['new', 'in_progress', 'complete', 'cancelled'], {
    message: 'Use status is required',
  }),
  executiveSponsor: z.string().max(200).optional(),
  strategicPriority: z.enum(
    ['enterprise_strategy', 'must_do', 'high_value', 'low_value', 'no_alignment'],
    { message: 'Strategic priority is required' },
  ),
  targetPocQuarter: z.string().max(20).optional(),
  targetProductionQuarter: z.string().max(20).optional(),

  // Stage 3: Value Capture
  valueDescription: z
    .string()
    .min(10, 'Value description must be at least 10 characters')
    .max(5000),
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
      ]),
    )
    .optional(),
  reflectedInBudget: z.enum(['yes', 'no', 'none']).optional(),
  valueEstimate: z.string().max(100).optional(),
});

// Draft schema — same fields but all optional for save-as-you-go
export const intakeDraftSchema = intakeSchema.partial();

export type IntakeFormData = z.infer<typeof intakeSchema>;
export type IntakeDraftData = z.infer<typeof intakeDraftSchema>;
