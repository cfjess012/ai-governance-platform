/**
 * Pure functions for parsing and normalizing Hugging Face Hub responses.
 *
 * These have no I/O — they take raw API responses and return clean,
 * typed data ready to display. Easy to test.
 */

import type {
  HuggingFaceApiResponse,
  HuggingFaceFetchResult,
  NormalizedBenchmark,
  NormalizedHuggingFaceData,
} from './types';

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

/** Coerce a string-or-array field into an array */
function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
}

/** Convert raw param count to billions, or null */
export function parametersToBillions(total: number | undefined | null): number | null {
  if (total === undefined || total === null || total <= 0) return null;
  return Math.round((total / 1_000_000_000) * 100) / 100;
}

/** Pretty-format a parameter count: "7.0B", "350M", "1.2T" */
export function formatParameters(billions: number | null): string {
  if (billions === null) return 'Unknown';
  if (billions >= 1000) return `${(billions / 1000).toFixed(1)}T`;
  if (billions >= 1) return `${billions.toFixed(1)}B`;
  return `${Math.round(billions * 1000)}M`;
}

/** Pretty-format a download count */
export function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** Format a context window number with thousands separator */
export function formatContextWindow(tokens: number | null): string {
  if (tokens === null) return 'Unknown';
  return `${tokens.toLocaleString()} tokens`;
}

// ───────────────────────────────────────────────────────────────────
// Front matter extraction
// ───────────────────────────────────────────────────────────────────

/**
 * Strip YAML front matter from a markdown string.
 * Returns the markdown body only — front matter is exposed via the API's cardData field.
 */
export function stripFrontMatter(markdown: string): string {
  if (!markdown.startsWith('---')) return markdown;
  const endMatch = markdown.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  if (!endMatch) return markdown;
  return markdown.slice(endMatch[0].length).trim();
}

// ───────────────────────────────────────────────────────────────────
// Benchmark extraction
// ───────────────────────────────────────────────────────────────────

/**
 * Pull benchmark results out of model_index.
 * Each result becomes a flattened {task, dataset, metric, value} row.
 */
export function extractBenchmarks(response: HuggingFaceApiResponse): NormalizedBenchmark[] {
  const benchmarks: NormalizedBenchmark[] = [];
  const modelIndex = response.model_index;
  if (!modelIndex || !Array.isArray(modelIndex)) return benchmarks;

  for (const entry of modelIndex) {
    const results = entry.results ?? [];
    for (const result of results) {
      const task = result.task?.name ?? result.task?.type ?? 'Unknown task';
      const dataset = result.dataset?.name ?? result.dataset?.type ?? 'Unknown dataset';
      const metrics = result.metrics ?? [];
      for (const metric of metrics) {
        if (metric.value === undefined || metric.value === null) continue;
        benchmarks.push({
          task,
          dataset,
          metric: metric.name ?? metric.type ?? 'metric',
          value: metric.value,
        });
      }
    }
  }
  return benchmarks;
}

// ───────────────────────────────────────────────────────────────────
// Main normalizer
// ───────────────────────────────────────────────────────────────────

/**
 * Convert a raw HF API response into our normalized data shape.
 * This is the only place that knows about the HF response structure.
 */
export function normalizeHuggingFaceResponse(
  response: HuggingFaceApiResponse,
  modelId: string,
): NormalizedHuggingFaceData {
  const cardData = response.cardData ?? {};
  const config = response.config ?? {};
  const safetensors = response.safetensors ?? {};

  // Author is the part of the model ID before the slash (or "huggingface" if no slash)
  const author = response.author ?? modelId.split('/')[0] ?? 'unknown';

  // License: prefer cardData, fall back to license: tag in tags
  let license = cardData.license_name ?? cardData.license ?? null;
  if (!license && response.tags) {
    const licenseTag = response.tags.find((t) => t.startsWith('license:'));
    if (licenseTag) license = licenseTag.replace('license:', '');
  }

  // Languages: cardData.language can be string or array
  const languages = toArray(cardData.language as string | string[] | undefined);

  // Datasets: cardData.datasets
  const datasets = toArray(cardData.datasets as string | string[] | undefined);

  // Base models: cardData.base_model
  const baseModels = toArray(cardData.base_model as string | string[] | undefined);

  // Architecture: from config.architectures[0]
  const architecture =
    Array.isArray(config.architectures) && config.architectures.length > 0
      ? config.architectures[0]
      : null;

  // Model type: from config.model_type
  const modelType = (config.model_type as string | undefined) ?? null;

  // Parameters: from safetensors.total
  const parametersBillions = parametersToBillions(safetensors.total);

  // Context window: from config.max_position_embeddings
  const contextWindow =
    typeof config.max_position_embeddings === 'number' ? config.max_position_embeddings : null;

  // Files: from siblings
  const files = (response.siblings ?? []).map((s) => s.rfilename).filter(Boolean);

  // Tags excluding the noisy ones we've already extracted
  const tags = (response.tags ?? []).filter(
    (t) =>
      !t.startsWith('license:') &&
      !t.startsWith('language:') &&
      !t.startsWith('dataset:') &&
      !t.startsWith('base_model:') &&
      !t.startsWith('region:') &&
      !t.startsWith('arxiv:'),
  );

  return {
    modelId,
    author,
    pipelineTag: response.pipeline_tag ?? cardData.pipeline_tag ?? null,
    library: response.library_name ?? cardData.library_name ?? null,
    license,
    licenseLink: cardData.license_link ?? null,
    languages,
    tags,
    datasets,
    baseModels,
    architecture,
    modelType,
    parametersBillions,
    contextWindow,
    downloads: response.downloads ?? 0,
    likes: response.likes ?? 0,
    gated: Boolean(response.gated),
    lastModified: response.lastModified ?? null,
    createdAt: response.createdAt ?? null,
    benchmarks: extractBenchmarks(response),
    files,
    huggingFaceUrl: `https://huggingface.co/${modelId}`,
  };
}

/**
 * Convenience: combine the normalized response with the README markdown
 * to produce the final fetch result we store.
 */
export function buildFetchResult(
  response: HuggingFaceApiResponse,
  modelId: string,
  modelCardMarkdown: string | null,
): HuggingFaceFetchResult {
  return {
    metadata: normalizeHuggingFaceResponse(response, modelId),
    modelCardMarkdown: modelCardMarkdown ? stripFrontMatter(modelCardMarkdown) : null,
    fetchedAt: new Date().toISOString(),
  };
}
