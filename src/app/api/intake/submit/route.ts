import { type NextRequest, NextResponse } from 'next/server';
import { classifyIntake } from '@/lib/classification/intake-classifier';
import { intakeSchema } from '@/lib/questions/intake-schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData } = body;

    const parsed = intakeSchema.safeParse(formData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Run intake classification
    const classification = classifyIntake({
      businessProblem: data.businessProblem,
      howAiHelps: data.howAiHelps,
      businessArea: data.businessArea,
      aiType: data.aiType,
      buildOrAcquire: data.buildOrAcquire,
      highRiskTriggers: data.highRiskTriggers,
      deploymentRegions: data.deploymentRegions,
      worstOutcome: data.worstOutcome,
      humanOversight: data.humanOversight,
    });

    const id = `intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Return data for the client to add to inventory store
    return NextResponse.json({
      data: {
        id,
        intake: data,
        classification: {
          euAiActTier:
            classification.euAiAct.indicator === 'potentially_high_or_prohibited'
              ? 'high'
              : classification.euAiAct.indicator === 'likely_high_financial'
                ? 'high'
                : classification.euAiAct.indicator === 'likely_high_employment'
                  ? 'high'
                  : 'pending',
          riskTier: 'pending' as const,
          overrideTriggered: false,
          explanation: classification.riskSignals.map((s) => s.label),
        },
        preliminaryClassification: classification,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to submit intake' }, { status: 500 });
  }
}
