import { z } from 'zod';

const yesNo = z.enum(['yes', 'no']);

export const assessmentSchema = z.object({
  // Section A: Core Use Case & Governance
  associatedUseCaseId: z.string().min(1, 'Use case selection is required'),
  araAssessmentId: z.string().optional(),
  isrRiskProjectId: z.string().optional(),
  dpiaAssessmentId: z.string().optional(),
  avaAssessmentId: z.string().optional(),

  // Section B: Deployment, Users, and Exposure
  customerFacingOutputs: yesNo,
  failureRisks: z.enum(['financial', 'operational', 'product_pricing', 'other']),
  currentStage: z.enum(['backlog', 'ideation', 'in_development', 'poc', 'ready_for_production']),
  plannedPocDate: z.string().optional(),
  plannedProductionDate: z.string().optional(),
  hasInternalUsers: yesNo,
  hasExternalUsers: yesNo,

  // Section C: Data, Privacy, and Geography
  dataClassification: z.enum([
    'public',
    'internal',
    'company_confidential',
    'customer_confidential',
  ]),
  dataPersistent: yesNo,
  dataStorageLocations: z.array(z.enum(['us', 'eu', 'uk', 'apac', 'latam'])).min(1),
  dataInCatalogue: yesNo,
  unstructuredDataDev: yesNo,
  unstructuredDataProd: yesNo,
  interactsWithPii: yesNo,
  deploymentRegions: z.array(z.enum(['apac', 'eu', 'latam', 'us'])).min(1),
  dataProcessingRegions: z.array(z.enum(['apac', 'eu', 'latam', 'us'])).min(1),

  // Section D: Decisioning, Monitoring, and Business Scope
  replacesHumanDecisions: yesNo,
  automatesExternalDecisions: yesNo,
  monitorsHumanActivity: yesNo,
  businessActivities: z
    .array(
      z.enum([
        'hr_automated_hiring',
        'hr_workforce_monitoring',
        'insurance_decisions',
        'investment_decisions',
        'marketing_materials',
        'pricing_underwriting',
        'none',
      ]),
    )
    .min(1),
  accessFinancialInfo: yesNo,

  // Section E: Security, Models, and Operations
  infosecComplete: yesNo,
  aiModelsUsed: z.string().min(1, 'AI models used is required'),
  approvedPipeline: yesNo,
  vendorAuditScope: yesNo,
  usesGenAi: yesNo,
  humanValidatesOutputs: yesNo,
  usesClassicalModels: yesNo,
  dataAccessible: yesNo,
  incidentResponsePlan: yesNo,
  aiFunctionCategory: z.enum(['financial', 'operational', 'product_pricing', 'other', 'na']),

  // Section F: Testing and Monitoring
  preDeploymentTesting: z.string().min(1, 'Pre-deployment testing description is required'),
  driftMonitoring: z.string().min(1, 'Drift monitoring description is required'),
  adversarialTesting: z.string().min(1, 'Adversarial testing description is required'),

  // Section G: Emerging AI Risks
  autonomousActions: yesNo,
  usesRag: yesNo,
  usesToolCalling: yesNo,
  maxAutonomousImpact: z.enum(['under_1k', '1k_10k', '10k_100k', '100k_1m', 'over_1m', 'na']),

  // Section H: Explainability and Transparency
  canExplainOutputs: z.enum(['yes', 'no', 'partial']),
  usersInformedOfAi: yesNo,
  logRetentionPeriod: z.enum(['under_30', '30_90', '90_180', 'over_180', 'unknown']),

  // Section I: Third-Party Vendor Assessment (conditional)
  involvesThirdParty: yesNo,
  thirdPartyName: z.string().optional(),
  vendorRetainsDataForTraining: yesNo.optional(),
  vendorRetainsDataOther: yesNo.optional(),
  vendorRetainsOutputs: yesNo.optional(),
  canOptOutGenAi: yesNo.optional(),
  promptRetentionPeriod: z.string().optional(),
  dataUsedForTraining: yesNo.optional(),
  vendorHasGuardrails: yesNo.optional(),
  vendorChangeManagement: yesNo.optional(),
  vendorIso42001: yesNo.optional(),
  vendorModelingApproaches: z
    .array(z.enum(['llm', 'classical_ml', 'deep_learning', 'rule_based', 'reinforcement', 'other']))
    .optional(),
  modelCommercialOrOpen: z.enum(['commercial', 'open_source']).optional(),
  vendorTransparencyReports: yesNo.optional(),
  vendorPerformanceMetrics: yesNo.optional(),
  vendorNotifiesModelChanges: yesNo.optional(),
  vendorNotifiesNewAi: yesNo.optional(),
  copyrightRisk: yesNo.optional(),
  trainingProcessDescription: z.string().optional(),
  dataPreprocessingDescription: z.string().optional(),
  biasFairnessTesting: z.string().optional(),
});

export const assessmentDraftSchema = assessmentSchema.partial();

export type AssessmentFormData = z.infer<typeof assessmentSchema>;
export type AssessmentDraftData = z.infer<typeof assessmentDraftSchema>;
