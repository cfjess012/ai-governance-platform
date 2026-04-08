import { type NextRequest, NextResponse } from 'next/server';
import { fetchHuggingFaceModel, toErrorResponse } from '@/lib/integrations/huggingface/client';

/**
 * GET /api/integrations/huggingface/{org}/{model}
 * GET /api/integrations/huggingface/{model}        (no org)
 *
 * Server-side proxy for the Hugging Face Hub API. Lives on the server so it can:
 *  - hide the optional auth token
 *  - apply server-side caching via Next.js fetch cache
 *  - normalize errors before they reach the browser
 *  - avoid CORS issues
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  if (!slug || slug.length === 0) {
    return NextResponse.json({ error: 'Model ID required' }, { status: 400 });
  }

  // Reconstruct the model ID from path segments: ["mistralai", "Mistral-7B-v0.3"] → "mistralai/Mistral-7B-v0.3"
  const modelId = slug.join('/');

  try {
    const result = await fetchHuggingFaceModel(modelId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const errorResponse = toErrorResponse(error, modelId);
    return NextResponse.json(
      { error: errorResponse.error, status: errorResponse.status },
      { status: errorResponse.status ?? 500 },
    );
  }
}
