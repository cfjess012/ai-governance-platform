import { type NextRequest, NextResponse } from 'next/server';
import { ollamaChat, parseJsonResponse } from '@/lib/ai/ollama-client';
import { buildFallbackAnalysis, normalizeAnalysis } from '@/lib/governance-analysis/parser';
import { buildUserPrompt, GOVERNANCE_SYSTEM_PROMPT } from '@/lib/governance-analysis/prompt';
import type { GovernanceAnalysis } from '@/lib/governance-analysis/types';
import type { HuggingFaceFetchResult } from '@/lib/integrations/huggingface/types';
import type { AIUseCase } from '@/types/inventory';
import type { ModelRecord } from '@/types/model';

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:14b';

interface RequestBody {
  model: ModelRecord;
  hfData?: HuggingFaceFetchResult;
  linkedUseCases?: AIUseCase[];
}

interface ResponseBody {
  data?: GovernanceAnalysis;
  error?: string;
  fallback?: boolean;
}

/**
 * POST /api/models/[id]/governance-analysis
 *
 * Generates an LLM-powered governance analysis for a model. The client sends
 * the model record + linked use cases + HF data so the LLM has full context.
 *
 * If Ollama is unavailable, returns a fallback "all UNKNOWN" analysis with
 * fallback=true so the UI can prompt the user to install/start Ollama.
 */
export async function POST(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ResponseBody>> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body?.model?.data?.name) {
    return NextResponse.json({ error: 'Model record required' }, { status: 400 });
  }

  const userPrompt = buildUserPrompt(body.model, body.hfData, body.linkedUseCases);

  try {
    const llmOutput = await ollamaChat([
      { role: 'system', content: GOVERNANCE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    if (!llmOutput) {
      // Ollama unavailable — return a fallback so the UI still works
      return NextResponse.json({
        data: buildFallbackAnalysis('ollama-unavailable'),
        fallback: true,
        error: 'LLM service unavailable. Returned an UNKNOWN-marked stub analysis.',
      });
    }

    const parsed = parseJsonResponse<unknown>(llmOutput);
    if (!parsed) {
      return NextResponse.json({
        data: buildFallbackAnalysis(OLLAMA_MODEL),
        fallback: true,
        error: 'LLM returned malformed JSON. Returned an UNKNOWN-marked stub analysis.',
      });
    }

    const normalized = normalizeAnalysis(parsed, OLLAMA_MODEL);
    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error('Governance analysis generation failed:', err);
    return NextResponse.json(
      {
        data: buildFallbackAnalysis('error-fallback'),
        fallback: true,
        error: err instanceof Error ? err.message : 'Unknown error generating analysis',
      },
      { status: 200 }, // 200 because we're returning a usable fallback
    );
  }
}
