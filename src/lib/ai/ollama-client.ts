const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:14b';
const TIMEOUT_MS = 30_000;

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

/**
 * Call Ollama's chat endpoint (non-streaming).
 * Returns the assistant message content, or null if Ollama is unavailable.
 */
export async function ollamaChat(messages: OllamaChatMessage[]): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Ollama responded with ${response.status}`);
      return null;
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message?.content ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Ollama request timed out');
    } else {
      console.error('Ollama unavailable:', (error as Error).message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse a JSON response from the LLM, stripping markdown fences and /think blocks if present.
 */
export function parseJsonResponse<T>(raw: string): T | null {
  try {
    // Strip <think>...</think> blocks (qwen3 reasoning)
    let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Strip markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('Failed to parse LLM JSON response:', raw.slice(0, 200));
    return null;
  }
}
