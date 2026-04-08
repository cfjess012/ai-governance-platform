import type { z } from 'zod';
import type { GovernanceAnalysis } from '@/lib/governance-analysis/types';
import type { HuggingFaceFetchResult } from '@/lib/integrations/huggingface/types';
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

/**
 * External integration data attached to a model.
 * Currently only Hugging Face is supported, but the shape leaves room for
 * other providers (Artificial Analysis, LMArena, etc.) in the future.
 */
export interface ModelExternalData {
  /** Provider name — currently always "huggingface" */
  source: 'huggingface';
  /** Last successful fetch */
  huggingFace?: HuggingFaceFetchResult;
  /** Last error (if a fetch failed) */
  error?: string;
  /** ISO timestamp of the most recent fetch attempt */
  lastFetchedAt?: string;
}

export interface ModelRecord {
  /** PK: MODEL#<id>, SK: METADATA */
  id: string;
  data: ModelFormData;
  /** External data fetched from third-party APIs (HF, etc.) */
  external?: ModelExternalData;
  /**
   * LLM-generated governance analysis. Cached on the record so it doesn't
   * regenerate on every page load. Can be regenerated via the "Refresh
   * analysis" action.
   */
  governanceAnalysis?: GovernanceAnalysis;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
