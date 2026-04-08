/**
 * Type definitions for the Hugging Face Hub API.
 *
 * Based on the public model API at https://huggingface.co/api/models/{id}
 * and the README/config files at https://huggingface.co/{id}/raw/main/...
 *
 * Only includes fields we actually use — the HF API returns much more.
 */

/** Raw response from GET /api/models/{id} (with ?full=true) */
export interface HuggingFaceApiResponse {
  /** Model ID, e.g., "mistralai/Mistral-7B-v0.3" */
  id?: string;
  /** Same as id (alias used in some endpoints) */
  modelId?: string;
  /** Author/organization name (e.g., "mistralai") */
  author?: string;
  /** Number of downloads in the last 30 days */
  downloads?: number;
  /** Number of likes */
  likes?: number;
  /** ISO timestamp of last modification */
  lastModified?: string;
  /** ISO timestamp of model creation */
  createdAt?: string;
  /** Whether the model is publicly accessible */
  private?: boolean;
  /** Whether the model is gated (requires approval) */
  gated?: boolean | string;
  /** Disabled flag */
  disabled?: boolean;
  /** Tags including license, language, library, task, dataset */
  tags?: string[];
  /** Pipeline tag (primary task) */
  pipeline_tag?: string;
  /** Library used (transformers, sentence-transformers, etc.) */
  library_name?: string;
  /** Free-form card data extracted from README front matter */
  cardData?: HuggingFaceCardData;
  /** Detailed config (architecture, etc.) — only with ?full=true */
  config?: HuggingFaceConfigSection;
  /** Model index — benchmark results parsed from card */
  model_index?: HuggingFaceModelIndex[] | null;
  /** Inference API status */
  inference?: string;
  /** Number of safetensors parameters (when available) */
  safetensors?: HuggingFaceSafetensors;
  /** File listing */
  siblings?: HuggingFaceSibling[];
}

export interface HuggingFaceCardData {
  license?: string;
  license_name?: string;
  license_link?: string;
  language?: string | string[];
  library_name?: string;
  pipeline_tag?: string;
  tags?: string[];
  datasets?: string | string[];
  base_model?: string | string[];
  base_model_relation?: string;
  inference?: boolean | { parameters?: Record<string, unknown> };
  metrics?: string | string[];
  /** Allow arbitrary additional fields */
  [key: string]: unknown;
}

export interface HuggingFaceConfigSection {
  architectures?: string[];
  model_type?: string;
  /** Sometimes present in config */
  hidden_size?: number;
  num_hidden_layers?: number;
  num_attention_heads?: number;
  vocab_size?: number;
  max_position_embeddings?: number;
  /** Tokenizer config */
  tokenizer_config?: Record<string, unknown>;
  /** Allow other fields */
  [key: string]: unknown;
}

/** Benchmark results from the model card front matter */
export interface HuggingFaceModelIndex {
  name?: string;
  results?: Array<{
    task?: { type?: string; name?: string };
    dataset?: { name?: string; type?: string; config?: string };
    metrics?: Array<{
      type?: string;
      name?: string;
      value?: number | string;
    }>;
  }>;
}

export interface HuggingFaceSafetensors {
  parameters?: Record<string, number>;
  total?: number;
}

export interface HuggingFaceSibling {
  rfilename: string;
}

/**
 * Normalized model data — what we store on the ModelRecord.
 * This is the result of parsing the raw HF response into a clean shape.
 */
export interface NormalizedHuggingFaceData {
  /** HF model ID — the canonical reference */
  modelId: string;
  /** Display author/org */
  author: string;
  /** Pipeline task (e.g., "text-generation") */
  pipelineTag: string | null;
  /** Detected library (transformers, sentence-transformers, etc.) */
  library: string | null;
  /** License identifier */
  license: string | null;
  /** License URL or document link */
  licenseLink: string | null;
  /** Languages supported */
  languages: string[];
  /** Tags array */
  tags: string[];
  /** Datasets used for training */
  datasets: string[];
  /** Base model(s) this is fine-tuned from */
  baseModels: string[];
  /** Architecture string from config (e.g., "MistralForCausalLM") */
  architecture: string | null;
  /** Model type from config (e.g., "mistral") */
  modelType: string | null;
  /** Total parameters in billions (rounded to 2 decimals), or null if unknown */
  parametersBillions: number | null;
  /** Context window length, or null if unknown */
  contextWindow: number | null;
  /** 30-day download count */
  downloads: number;
  /** Likes count */
  likes: number;
  /** Whether the model is gated */
  gated: boolean;
  /** ISO timestamp of last modification on HF */
  lastModified: string | null;
  /** ISO timestamp of creation on HF */
  createdAt: string | null;
  /** Benchmark results extracted from model_index */
  benchmarks: NormalizedBenchmark[];
  /** Files in the model repo */
  files: string[];
  /** Direct link to the HF model page */
  huggingFaceUrl: string;
}

export interface NormalizedBenchmark {
  task: string;
  dataset: string;
  metric: string;
  value: number | string;
}

/** Result of fetching all HF data for a model */
export interface HuggingFaceFetchResult {
  /** Normalized metadata */
  metadata: NormalizedHuggingFaceData;
  /** Raw README markdown with front matter stripped */
  modelCardMarkdown: string | null;
  /** ISO timestamp of when this fetch happened */
  fetchedAt: string;
}

/** Error result */
export interface HuggingFaceFetchError {
  error: string;
  status?: number;
  modelId: string;
  fetchedAt: string;
}
