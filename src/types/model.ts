import type { z } from 'zod';
import type { modelSchema } from '@/lib/questions/model-schema';

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'meta'
  | 'google'
  | 'mistral'
  | 'cohere'
  | 'amazon'
  | 'custom';

export type ModelType =
  | 'llm'
  | 'image_generation'
  | 'embedding'
  | 'multimodal'
  | 'code'
  | 'speech'
  | 'other';

export type ModelStatus = 'active' | 'deprecated' | 'under_review' | 'blocked';

export type ModelLicenseType = 'proprietary' | 'open_source' | 'open_weights' | 'custom_license';

export type ModelFormData = z.infer<typeof modelSchema>;

export interface ModelRecord {
  /** PK: MODEL#<id>, SK: METADATA */
  id: string;
  data: ModelFormData;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
