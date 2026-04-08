/**
 * Hugging Face Hub API client (server-side).
 *
 * This module is intended to run on the Next.js server (API routes), not in
 * the browser. It hits the public HF Hub API which has generous rate limits
 * for unauthenticated reads (1000 req/hour) and even more with a token.
 *
 * Optional auth: if HUGGINGFACE_HUB_TOKEN is set, it's sent as a Bearer token.
 */

import { buildFetchResult } from './parser';
import type {
  HuggingFaceApiResponse,
  HuggingFaceFetchError,
  HuggingFaceFetchResult,
} from './types';

const HF_API_BASE = 'https://huggingface.co/api';
const HF_RAW_BASE = 'https://huggingface.co';

/**
 * Validate a Hugging Face model ID.
 * Format: "{org}/{name}" or "{name}" with safe characters only.
 */
export function isValidHuggingFaceModelId(modelId: string): boolean {
  if (!modelId || typeof modelId !== 'string') return false;
  // Allow alphanumeric, hyphens, underscores, dots, and a single slash
  return /^[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)?$/.test(modelId);
}

/**
 * Build common request headers, adding auth if a token is configured.
 */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'ai-governance-platform/1.0',
  };
  const token = process.env.HUGGINGFACE_HUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch the model metadata from the HF API.
 * Uses ?full=true to include the config block.
 */
async function fetchModelMetadata(modelId: string): Promise<HuggingFaceApiResponse> {
  const url = `${HF_API_BASE}/models/${encodeURIComponent(modelId).replace('%2F', '/')}?full=true`;
  const response = await fetch(url, {
    headers: buildHeaders(),
    // Use Next.js fetch caching with a 1-hour TTL for metadata
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new HuggingFaceError(`Model "${modelId}" not found on Hugging Face`, 404);
    }
    if (response.status === 401 || response.status === 403) {
      throw new HuggingFaceError(
        `Model "${modelId}" is gated or private. Authentication required.`,
        response.status,
      );
    }
    if (response.status === 429) {
      throw new HuggingFaceError('Hugging Face API rate limit exceeded.', 429);
    }
    throw new HuggingFaceError(
      `Hugging Face API error: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  return response.json() as Promise<HuggingFaceApiResponse>;
}

/**
 * Fetch the README.md content for a model.
 * Returns null if the README doesn't exist or fails to fetch (non-fatal).
 */
async function fetchModelReadme(modelId: string): Promise<string | null> {
  const url = `${HF_RAW_BASE}/${modelId}/raw/main/README.md`;
  try {
    const response = await fetch(url, {
      headers: { ...buildHeaders(), Accept: 'text/markdown,text/plain,*/*' },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Fetch all data for a Hugging Face model: metadata + README.
 *
 * Throws HuggingFaceError on irrecoverable failures (404, 401, etc.).
 * The README is fetched best-effort and never throws.
 */
export async function fetchHuggingFaceModel(modelId: string): Promise<HuggingFaceFetchResult> {
  if (!isValidHuggingFaceModelId(modelId)) {
    throw new HuggingFaceError(`Invalid Hugging Face model ID: "${modelId}"`, 400);
  }

  // Fetch metadata and README in parallel
  const [metadata, readme] = await Promise.all([
    fetchModelMetadata(modelId),
    fetchModelReadme(modelId),
  ]);

  return buildFetchResult(metadata, modelId, readme);
}

/**
 * Convert a thrown error into a serializable error response.
 */
export function toErrorResponse(error: unknown, modelId: string): HuggingFaceFetchError {
  if (error instanceof HuggingFaceError) {
    return {
      error: error.message,
      status: error.status,
      modelId,
      fetchedAt: new Date().toISOString(),
    };
  }
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
    modelId,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Custom error class for HF-specific failures.
 */
export class HuggingFaceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HuggingFaceError';
    this.status = status;
  }
}
