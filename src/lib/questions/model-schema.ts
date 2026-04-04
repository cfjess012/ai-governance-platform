import { z } from 'zod';

export const modelSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(200),
  provider: z.enum(
    ['openai', 'anthropic', 'meta', 'google', 'mistral', 'cohere', 'amazon', 'custom'],
    { message: 'Provider is required' },
  ),
  modelType: z.enum(
    ['llm', 'image_generation', 'embedding', 'multimodal', 'code', 'speech', 'other'],
    { message: 'Model type is required' },
  ),
  version: z.string().max(50).optional(),
  status: z.enum(['active', 'deprecated', 'under_review', 'blocked']).default('active'),
  licenseType: z.enum(['proprietary', 'open_source', 'open_weights', 'custom_license'], {
    message: 'License type is required',
  }),
  hosting: z.enum(['cloud_api', 'self_hosted', 'vendor_managed', 'edge']).optional(),
  description: z.string().max(2000).optional(),
  knownLimitations: z.string().max(2000).optional(),
  dataRetentionPolicy: z.string().max(500).optional(),
  approvedRegions: z.array(z.enum(['us_only', 'eu_eea', 'uk', 'canada', 'other'])).optional(),
});

export const modelDraftSchema = modelSchema.partial();
