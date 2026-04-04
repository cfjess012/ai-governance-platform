import type { FieldMapping } from '@/types/servicenow';

export const intakeFieldMappings: FieldMapping[] = [
  { formField: 'useCaseName', snowField: 'u_use_case_name', table: 'u_ai_use_case' },
  { formField: 'useCaseOwner', snowField: 'u_use_case_owner', table: 'u_ai_use_case' },
  { formField: 'executiveSponsor', snowField: 'u_executive_sponsor', table: 'u_ai_use_case' },
  { formField: 'businessArea', snowField: 'u_business_area', table: 'u_ai_use_case' },
  { formField: 'businessProblem', snowField: 'u_business_problem', table: 'u_ai_use_case' },
  { formField: 'howAiHelps', snowField: 'u_how_ai_helps', table: 'u_ai_use_case' },
  { formField: 'aiType', snowField: 'u_ai_type', table: 'u_ai_use_case' },
  { formField: 'buildOrAcquire', snowField: 'u_build_or_acquire', table: 'u_ai_use_case' },
  { formField: 'thirdPartyInvolved', snowField: 'u_third_party_involved', table: 'u_ai_use_case' },
  { formField: 'vendorName', snowField: 'u_vendor_name', table: 'u_ai_use_case' },
  { formField: 'auditability', snowField: 'u_auditability', table: 'u_ai_use_case' },
  {
    formField: 'usesFoundationModel',
    snowField: 'u_uses_foundation_model',
    table: 'u_ai_use_case',
  },
  { formField: 'whichModels', snowField: 'u_which_models', table: 'u_ai_use_case' },
  {
    formField: 'deploymentRegions',
    snowField: 'u_deployment_regions',
    table: 'u_ai_use_case',
    transform: (v) => (Array.isArray(v) ? v.join(',') : String(v)),
  },
  { formField: 'lifecycleStage', snowField: 'u_lifecycle_stage', table: 'u_ai_use_case' },
  { formField: 'previouslyReviewed', snowField: 'u_previously_reviewed', table: 'u_ai_use_case' },
  {
    formField: 'highRiskTriggers',
    snowField: 'u_high_risk_triggers',
    table: 'u_ai_use_case',
    transform: (v) => (Array.isArray(v) ? v.join(',') : String(v)),
  },
  { formField: 'whoUsesSystem', snowField: 'u_who_uses_system', table: 'u_ai_use_case' },
  { formField: 'whoAffected', snowField: 'u_who_affected', table: 'u_ai_use_case' },
  { formField: 'worstOutcome', snowField: 'u_worst_outcome', table: 'u_ai_use_case' },
  {
    formField: 'dataSensitivity',
    snowField: 'u_data_sensitivity',
    table: 'u_ai_use_case',
    transform: (v) => (Array.isArray(v) ? v.join(',') : String(v)),
  },
  { formField: 'humanOversight', snowField: 'u_human_oversight', table: 'u_ai_use_case' },
  {
    formField: 'differentialTreatment',
    snowField: 'u_differential_treatment',
    table: 'u_ai_use_case',
  },
  {
    formField: 'peopleAffectedCount',
    snowField: 'u_people_affected_count',
    table: 'u_ai_use_case',
  },
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
  {
    formField: 'reflectedInBudget',
    snowField: 'u_reflected_in_budget',
    table: 'u_ai_use_case',
    transform: (v) => (v ? 'true' : 'false'),
  },
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
