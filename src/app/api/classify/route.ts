import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyAgentTier } from '@/lib/classification/agent-tiers';
import { classifyEuAiAct } from '@/lib/classification/eu-ai-act';
import { calculateRiskScore } from '@/lib/classification/risk-scoring';

const classifyInputSchema = z.object({
  geographicScope: z.array(z.string()).min(1),
  primaryBusinessActivity: z.string(),
  dataTypes: z.array(z.string()).min(1),
  decisionsAboutIndividuals: z.enum(['no', 'assists', 'automated']),
  expectedUserBase: z.string(),
  hasAgentCapabilities: z.boolean(),
  agentAutonomyLevel: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = classifyInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const euClassification = classifyEuAiAct(input as Parameters<typeof classifyEuAiAct>[0]);
    const agentClassification = classifyAgentTier({
      hasAgentCapabilities: input.hasAgentCapabilities,
      agentAutonomyLevel: input.agentAutonomyLevel as Parameters<
        typeof classifyAgentTier
      >[0]['agentAutonomyLevel'],
    });
    const riskScore = calculateRiskScore(input as Parameters<typeof calculateRiskScore>[0]);

    return NextResponse.json({
      data: {
        euClassification,
        agentClassification,
        riskScore,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
