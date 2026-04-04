import { NextResponse } from 'next/server';
import { ollamaChat, parseJsonResponse } from '@/lib/ai/ollama-client';
import {
  BUSINESS_PURPOSE_SYSTEM_PROMPT,
  CONSISTENCY_CHECK_SYSTEM_PROMPT,
  VALUE_DESCRIPTION_COACH_SYSTEM_PROMPT,
} from '@/lib/ai/prompts';

type AnalysisType = 'business-purpose-analysis' | 'consistency-check' | 'value-description-coach';

interface AnalyzeRequest {
  analysisType: AnalysisType;
  formData: Record<string, unknown>;
  fieldValue?: string;
}

export interface BusinessPurposeResult {
  suggestedBusinessArea: string;
  riskSignals: string[];
  suggestedEuAiActCategory: string | null;
  suggestedValueLevers: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ConsistencyCheckResult {
  contradictions: Array<{ field1: string; field2: string; issue: string }>;
  missingRiskSignals: Array<{
    description: string;
    suggestedField: string;
    suggestedValue: string;
  }>;
  completenessGaps: Array<{ field: string; reason: string }>;
  overallAssessment: 'clean' | 'minor_issues' | 'needs_attention';
}

export interface ValueCoachResult {
  suggestion: string;
  reason: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { analysisType, formData, fieldValue } = body;

    if (!analysisType) {
      return NextResponse.json({ error: 'analysisType is required' }, { status: 400 });
    }

    switch (analysisType) {
      case 'business-purpose-analysis': {
        const text = fieldValue ?? (formData.businessProblem as string);
        if (!text || text.length < 10) {
          return NextResponse.json(
            { error: 'Business purpose text too short for analysis' },
            { status: 400 },
          );
        }

        const raw = await ollamaChat([
          { role: 'system', content: BUSINESS_PURPOSE_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ]);

        if (!raw) {
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
        }

        const parsed = parseJsonResponse<BusinessPurposeResult>(raw);
        if (!parsed) {
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
        }

        return NextResponse.json({ data: parsed });
      }

      case 'consistency-check': {
        const summary = Object.entries(formData)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join('\n');

        const raw = await ollamaChat([
          { role: 'system', content: CONSISTENCY_CHECK_SYSTEM_PROMPT },
          { role: 'user', content: summary },
        ]);

        if (!raw) {
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
        }

        const parsed = parseJsonResponse<ConsistencyCheckResult>(raw);
        if (!parsed) {
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
        }

        return NextResponse.json({ data: parsed });
      }

      case 'value-description-coach': {
        const text = fieldValue ?? (formData.valueDescription as string);
        if (!text) {
          return NextResponse.json(
            { error: 'Value description text is required' },
            { status: 400 },
          );
        }

        const raw = await ollamaChat([
          { role: 'system', content: VALUE_DESCRIPTION_COACH_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ]);

        if (!raw) {
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
        }

        const parsed = parseJsonResponse<ValueCoachResult>(raw);
        if (!parsed) {
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
        }

        return NextResponse.json({ data: parsed });
      }

      default:
        return NextResponse.json(
          { error: `Unknown analysis type: ${analysisType as string}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('AI analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
