import type { z } from 'zod';
import type { intakeSchema } from '@/lib/questions/intake-schema';

export type AiType =
  | 'generative_ai'
  | 'predictive_classification'
  | 'rpa_with_ai'
  | 'ai_agent'
  | 'computer_vision'
  | 'rag'
  | 'other_not_sure';

export type BuildOrAcquire =
  | 'custom_development'
  | 'citizen_development'
  | 'buying_new_vendor'
  | 'using_existing_tool'
  | 'not_sure_yet';

export type LifecycleStage =
  | 'idea_planning'
  | 'development_poc'
  | 'testing_pilot'
  | 'in_production'
  | 'being_retired';

export type StrategicPriority =
  | 'enterprise_strategy'
  | 'must_do'
  | 'high_value'
  | 'low_value'
  | 'no_alignment';

export type HumanOversight =
  | 'human_decides'
  | 'human_reviews'
  | 'spot_check'
  | 'fully_autonomous'
  | 'not_applicable';

export type WhoUsesSystem = 'internal_only' | 'external_only' | 'both';

export type WhoAffected = 'internal_only' | 'external' | 'both' | 'general_public';

export type WorstOutcome = 'minor' | 'moderate' | 'significant' | 'serious';

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
