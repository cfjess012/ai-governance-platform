import type { EuAiActAssessmentResult } from '@/lib/classification/eu-ai-act-assessment';
import type { RiskTier, SevenDimensionResult } from '@/lib/classification/seven-dimension-scoring';
import type { AssessmentFormData } from '@/lib/questions/assessment-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';

export interface StatusChange {
  status: AIUseCaseStatus;
  timestamp: string;
  changedBy: string;
}

export type AIUseCaseStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'assessment_required'
  | 'assessment_in_progress'
  | 'approved'
  | 'rejected'
  | 'in_production'
  | 'decommissioned';

export interface AIUseCase {
  id: string;
  intake: IntakeFormData;
  assessment?: AssessmentFormData;
  scoring?: SevenDimensionResult;
  classification: {
    euAiActTier: 'prohibited' | 'high' | 'limited' | 'minimal' | 'pending';
    riskTier: RiskTier | 'pending';
    overrideTriggered: boolean;
    explanation: string[];
  };
  euAiActDetail?: EuAiActAssessmentResult;
  status: AIUseCaseStatus;
  timeline: StatusChange[];
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}
