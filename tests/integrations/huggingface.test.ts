import { describe, expect, it } from 'vitest';
import { isValidHuggingFaceModelId } from '@/lib/integrations/huggingface/client';
import {
  buildFetchResult,
  extractBenchmarks,
  formatContextWindow,
  formatDownloads,
  formatParameters,
  normalizeHuggingFaceResponse,
  parametersToBillions,
  stripFrontMatter,
} from '@/lib/integrations/huggingface/parser';
import type { HuggingFaceApiResponse } from '@/lib/integrations/huggingface/types';

// ─── Validators ───────────────────────────────────────────────────

describe('isValidHuggingFaceModelId', () => {
  it('accepts valid org/model format', () => {
    expect(isValidHuggingFaceModelId('mistralai/Mistral-7B-v0.3')).toBe(true);
    expect(isValidHuggingFaceModelId('meta-llama/Llama-3-8B')).toBe(true);
    expect(isValidHuggingFaceModelId('Qwen/Qwen2.5-72B-Instruct')).toBe(true);
  });

  it('accepts a model ID without an org', () => {
    expect(isValidHuggingFaceModelId('bert-base-uncased')).toBe(true);
  });

  it('accepts dots, hyphens, underscores', () => {
    expect(isValidHuggingFaceModelId('google/gemma-2-9b-it')).toBe(true);
    expect(isValidHuggingFaceModelId('sentence-transformers/all-MiniLM-L6-v2')).toBe(true);
  });

  it('rejects empty strings', () => {
    expect(isValidHuggingFaceModelId('')).toBe(false);
  });

  it('rejects strings with multiple slashes', () => {
    expect(isValidHuggingFaceModelId('a/b/c')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidHuggingFaceModelId('mistralai/Mistral 7B')).toBe(false);
  });

  it('rejects special characters', () => {
    expect(isValidHuggingFaceModelId('foo/bar?query=1')).toBe(false);
    expect(isValidHuggingFaceModelId('foo/bar#section')).toBe(false);
  });
});

// ─── Formatters ───────────────────────────────────────────────────

describe('parametersToBillions', () => {
  it('converts raw counts to billions with 2 decimals', () => {
    expect(parametersToBillions(7_000_000_000)).toBe(7);
    expect(parametersToBillions(70_000_000_000)).toBe(70);
    expect(parametersToBillions(1_240_000_000)).toBe(1.24);
  });

  it('returns null for missing or invalid counts', () => {
    expect(parametersToBillions(undefined)).toBeNull();
    expect(parametersToBillions(null)).toBeNull();
    expect(parametersToBillions(0)).toBeNull();
  });
});

describe('formatParameters', () => {
  it('formats billions correctly', () => {
    expect(formatParameters(7)).toBe('7.0B');
    expect(formatParameters(70)).toBe('70.0B');
    expect(formatParameters(1.5)).toBe('1.5B');
  });

  it('formats sub-billion as millions', () => {
    expect(formatParameters(0.5)).toBe('500M');
    expect(formatParameters(0.124)).toBe('124M');
  });

  it('formats trillion-scale', () => {
    expect(formatParameters(1500)).toBe('1.5T');
  });

  it('handles null', () => {
    expect(formatParameters(null)).toBe('Unknown');
  });
});

describe('formatDownloads', () => {
  it('formats large counts with M/K suffix', () => {
    expect(formatDownloads(1_500_000)).toBe('1.5M');
    expect(formatDownloads(2_500)).toBe('2.5K');
  });

  it('keeps small counts unchanged', () => {
    expect(formatDownloads(42)).toBe('42');
    expect(formatDownloads(999)).toBe('999');
  });
});

describe('formatContextWindow', () => {
  it('adds thousands separators and tokens label', () => {
    expect(formatContextWindow(8192)).toBe('8,192 tokens');
    expect(formatContextWindow(128_000)).toBe('128,000 tokens');
  });

  it('handles null', () => {
    expect(formatContextWindow(null)).toBe('Unknown');
  });
});

// ─── Front matter stripping ───────────────────────────────────────

describe('stripFrontMatter', () => {
  it('removes YAML front matter from a markdown file', () => {
    const input = `---
license: apache-2.0
language: en
---

# Hello

This is the body.`;
    const result = stripFrontMatter(input);
    expect(result).toBe('# Hello\n\nThis is the body.');
  });

  it('returns unchanged if no front matter', () => {
    expect(stripFrontMatter('# Just a heading')).toBe('# Just a heading');
  });

  it('handles missing closing fence (returns unchanged)', () => {
    const input = '---\nlicense: mit\n# No closing';
    expect(stripFrontMatter(input)).toBe(input);
  });

  it('handles empty input', () => {
    expect(stripFrontMatter('')).toBe('');
  });
});

// ─── Benchmark extraction ─────────────────────────────────────────

describe('extractBenchmarks', () => {
  it('extracts benchmarks from model_index', () => {
    const response: HuggingFaceApiResponse = {
      model_index: [
        {
          name: 'Test',
          results: [
            {
              task: { type: 'text-generation', name: 'Text Generation' },
              dataset: { name: 'MMLU', type: 'mmlu' },
              metrics: [
                { name: 'accuracy', type: 'accuracy', value: 0.857 },
                { name: 'f1', type: 'f1', value: 0.842 },
              ],
            },
          ],
        },
      ],
    };
    const benchmarks = extractBenchmarks(response);
    expect(benchmarks).toHaveLength(2);
    expect(benchmarks[0]).toEqual({
      task: 'Text Generation',
      dataset: 'MMLU',
      metric: 'accuracy',
      value: 0.857,
    });
  });

  it('returns empty array if model_index is missing', () => {
    expect(extractBenchmarks({})).toEqual([]);
  });

  it('skips metrics with no value', () => {
    const response: HuggingFaceApiResponse = {
      model_index: [
        {
          results: [
            {
              task: { type: 'qa' },
              dataset: { type: 'squad' },
              metrics: [{ name: 'em' }, { name: 'f1', value: 0.9 }],
            },
          ],
        },
      ],
    };
    expect(extractBenchmarks(response)).toHaveLength(1);
  });

  it('handles missing optional fields gracefully', () => {
    const response: HuggingFaceApiResponse = {
      model_index: [
        {
          results: [
            {
              metrics: [{ value: 0.5 }],
            },
          ],
        },
      ],
    };
    const benchmarks = extractBenchmarks(response);
    expect(benchmarks[0]).toEqual({
      task: 'Unknown task',
      dataset: 'Unknown dataset',
      metric: 'metric',
      value: 0.5,
    });
  });
});

// ─── Normalizer ───────────────────────────────────────────────────

describe('normalizeHuggingFaceResponse', () => {
  it('extracts author from modelId when not present', () => {
    const result = normalizeHuggingFaceResponse({}, 'mistralai/Mistral-7B-v0.3');
    expect(result.author).toBe('mistralai');
  });

  it('uses provided author over modelId prefix', () => {
    const result = normalizeHuggingFaceResponse(
      { author: 'Mistral AI' },
      'mistralai/Mistral-7B-v0.3',
    );
    expect(result.author).toBe('Mistral AI');
  });

  it('extracts license from cardData', () => {
    const result = normalizeHuggingFaceResponse(
      { cardData: { license: 'apache-2.0' } },
      'test/model',
    );
    expect(result.license).toBe('apache-2.0');
  });

  it('falls back to license: tag if cardData has no license', () => {
    const result = normalizeHuggingFaceResponse(
      { tags: ['license:mit', 'language:en'] },
      'test/model',
    );
    expect(result.license).toBe('mit');
  });

  it('coerces single-string language into array', () => {
    const result = normalizeHuggingFaceResponse({ cardData: { language: 'en' } }, 'test/model');
    expect(result.languages).toEqual(['en']);
  });

  it('keeps multi-language array', () => {
    const result = normalizeHuggingFaceResponse(
      { cardData: { language: ['en', 'fr', 'de'] } },
      'test/model',
    );
    expect(result.languages).toEqual(['en', 'fr', 'de']);
  });

  it('extracts architecture from config.architectures[0]', () => {
    const result = normalizeHuggingFaceResponse(
      { config: { architectures: ['MistralForCausalLM'] } },
      'test/model',
    );
    expect(result.architecture).toBe('MistralForCausalLM');
  });

  it('extracts parameters from safetensors.total', () => {
    const result = normalizeHuggingFaceResponse(
      { safetensors: { total: 7_240_000_000 } },
      'test/model',
    );
    expect(result.parametersBillions).toBe(7.24);
  });

  it('extracts context window from max_position_embeddings', () => {
    const result = normalizeHuggingFaceResponse(
      { config: { max_position_embeddings: 32_768 } },
      'test/model',
    );
    expect(result.contextWindow).toBe(32_768);
  });

  it('filters out noisy tags', () => {
    const result = normalizeHuggingFaceResponse(
      {
        tags: ['license:mit', 'language:en', 'transformers', 'pytorch', 'arxiv:2103.00020'],
      },
      'test/model',
    );
    expect(result.tags).toEqual(['transformers', 'pytorch']);
  });

  it('builds the canonical HF URL', () => {
    const result = normalizeHuggingFaceResponse({}, 'mistralai/Mistral-7B-v0.3');
    expect(result.huggingFaceUrl).toBe('https://huggingface.co/mistralai/Mistral-7B-v0.3');
  });

  it('handles completely empty response', () => {
    const result = normalizeHuggingFaceResponse({}, 'test/model');
    expect(result.modelId).toBe('test/model');
    expect(result.parametersBillions).toBeNull();
    expect(result.contextWindow).toBeNull();
    expect(result.languages).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.benchmarks).toEqual([]);
    expect(result.files).toEqual([]);
  });

  it('extracts gated flag', () => {
    expect(normalizeHuggingFaceResponse({ gated: true }, 'test/model').gated).toBe(true);
    expect(normalizeHuggingFaceResponse({ gated: 'auto' }, 'test/model').gated).toBe(true);
    expect(normalizeHuggingFaceResponse({ gated: false }, 'test/model').gated).toBe(false);
    expect(normalizeHuggingFaceResponse({}, 'test/model').gated).toBe(false);
  });
});

// ─── End-to-end fetch result builder ──────────────────────────────

describe('buildFetchResult', () => {
  it('combines metadata and stripped markdown', () => {
    const result = buildFetchResult(
      { cardData: { license: 'mit' } },
      'test/model',
      '---\nlicense: mit\n---\n\n# Model',
    );
    expect(result.metadata.license).toBe('mit');
    expect(result.modelCardMarkdown).toBe('# Model');
    expect(result.fetchedAt).toBeDefined();
  });

  it('handles null markdown', () => {
    const result = buildFetchResult({}, 'test/model', null);
    expect(result.modelCardMarkdown).toBeNull();
  });

  it('produces a valid ISO timestamp', () => {
    const result = buildFetchResult({}, 'test/model', null);
    expect(() => new Date(result.fetchedAt)).not.toThrow();
    expect(new Date(result.fetchedAt).toISOString()).toBe(result.fetchedAt);
  });
});
