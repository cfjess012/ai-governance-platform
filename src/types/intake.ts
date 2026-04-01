import type { z } from 'zod';
import type { intakeSchema } from '@/lib/questions/intake-schema';

export type SolutionType =
  | 'citizen_development'
  | 'custom'
  | 'existing_tool'
  | 'new_tool'
  | 'unknown';

export type LifecycleStage =
  | 'backlog'
  | 'cancelled'
  | 'decommissioned'
  | 'ideation'
  | 'in_development'
  | 'in_production'
  | 'poc';

export type UseStatus = 'new' | 'in_progress' | 'complete' | 'cancelled';

export type StrategicPriority =
  | 'enterprise_strategy'
  | 'must_do'
  | 'high_value'
  | 'low_value'
  | 'no_alignment';

export type ProhibitedPractice = 'none' | 'yes' | 'no';

export type BudgetReflected = 'yes' | 'no' | 'none';

export type ValueCreationLever =
  | 'bv_acquire_new_customers'
  | 'bv_improve_cross_sell'
  | 'bv_maximize_aum'
  | 'bv_retain_customers'
  | 'bv_customer_satisfaction'
  | 'bv_positive_outcomes'
  | 'bv_improve_execution'
  | 'bv_improve_management'
  | 'bv_improve_corporate_services'
  | 'bv_improve_interaction_efficiency'
  | 'bv_improve_operations_efficiency'
  | 'bv_improve_sales_effectiveness'
  | 'em_cost_avoidance'
  | 'em_facilities'
  | 'em_infrastructure'
  | 'em_labor'
  | 'em_software'
  | 'vp_monitoring_logging'
  | 'vp_automated_security'
  | 'vp_disaster_recovery'
  | 'vp_business_continuity'
  | 'vp_fault_tolerance'
  | 'vp_reduce_exceptions';

export type IntakeFormData = z.infer<typeof intakeSchema>;

export interface IntakeRecord {
  id: string;
  formData: IntakeFormData;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  riskScore: number | null;
  euAiActTier: string | null;
  agentTier: string | null;
  serviceNowSysId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}
