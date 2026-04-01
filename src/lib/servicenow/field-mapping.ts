import type { FieldMapping } from '@/types/servicenow';

export const intakeFieldMappings: FieldMapping[] = [
  { formField: 'useCaseName', snowField: 'u_use_case_name', table: 'u_ai_use_case' },
  { formField: 'solutionType', snowField: 'u_solution_type', table: 'u_ai_use_case' },
  { formField: 'lifecycleStage', snowField: 'u_lifecycle_stage', table: 'u_ai_use_case' },
  { formField: 'useStatus', snowField: 'u_use_status', table: 'u_ai_use_case' },
  { formField: 'businessPurpose', snowField: 'u_business_purpose', table: 'u_ai_use_case' },
  {
    formField: 'ethicalAiAligned',
    snowField: 'u_ethical_ai_aligned',
    table: 'u_ai_use_case',
    transform: (v) => (v ? 'true' : 'false'),
  },
  { formField: 'prohibitedPractices', snowField: 'u_prohibited_practices', table: 'u_ai_use_case' },
  { formField: 'businessArea', snowField: 'u_business_area', table: 'u_ai_use_case' },
  { formField: 'executiveSponsor', snowField: 'u_executive_sponsor', table: 'u_ai_use_case' },
  { formField: 'useCaseOwner', snowField: 'u_use_case_owner', table: 'u_ai_use_case' },
  { formField: 'strategicPriority', snowField: 'u_strategic_priority', table: 'u_ai_use_case' },
  { formField: 'targetPocQuarter', snowField: 'u_target_poc_quarter', table: 'u_ai_use_case' },
  {
    formField: 'targetProductionQuarter',
    snowField: 'u_target_prod_quarter',
    table: 'u_ai_use_case',
  },
  { formField: 'valueDescription', snowField: 'u_value_description', table: 'u_ai_use_case' },
  {
    formField: 'valueCreationLevers',
    snowField: 'u_value_creation_levers',
    table: 'u_ai_use_case',
    transform: (v) => (Array.isArray(v) ? v.join(',') : String(v)),
  },
  { formField: 'reflectedInBudget', snowField: 'u_reflected_in_budget', table: 'u_ai_use_case' },
  { formField: 'valueEstimate', snowField: 'u_value_estimate', table: 'u_ai_use_case' },
];

/**
 * Map form data to ServiceNow fields using the field mapping config.
 */
export function mapToServiceNow(
  formData: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = formData[mapping.formField];
    if (value !== undefined && value !== null) {
      result[mapping.snowField] = mapping.transform ? mapping.transform(value) : value;
    }
  }

  return result;
}
