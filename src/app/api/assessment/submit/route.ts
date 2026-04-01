import { type NextRequest, NextResponse } from 'next/server';
import { preprodDraftSchema } from '@/lib/questions/preprod-schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, intakeId } = body;

    if (!intakeId) {
      return NextResponse.json({ error: 'intakeId is required' }, { status: 400 });
    }

    const parsed = preprodDraftSchema.safeParse(formData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Store assessment (simplified for POC)
    const id = `assessment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return NextResponse.json({
      data: { id, intakeId, status: 'submitted' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
  }
}
