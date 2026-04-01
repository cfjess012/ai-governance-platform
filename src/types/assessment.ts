import type { z } from 'zod';
import type { preprodSchema } from '@/lib/questions/preprod-schema';

export type PreprodFormData = z.infer<typeof preprodSchema>;

export interface AssessmentRecord {
  id: string;
  intakeId: string;
  formData: PreprodFormData;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}
