import { type NextRequest, NextResponse } from 'next/server';
import { assessmentDraftSchema } from '@/lib/questions/assessment-schema';

/**
 * Assessment submission endpoint.
 *
 * Validates the posted form data against the canonical assessment schema
 * (`assessment-schema.ts`). The actual persistence happens client-side in
 * the inventory Zustand store — the API's job is validation + returning a
 * case-id so the client can write the record. The API stays thin so the
 * workflow's single source of truth (the inventory store) isn't split
 * across a fake server process and the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, intakeId } = body;

    if (!intakeId || typeof intakeId !== 'string') {
      return NextResponse.json({ error: 'intakeId is required' }, { status: 400 });
    }

    // Use the draft schema so partially-filled assessments don't get rejected;
    // final required-field validation is enforced by the wizard UI before it
    // allows the submit button to fire.
    const parsed = assessmentDraftSchema.safeParse(formData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: {
        intakeId,
        assessment: parsed.data,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
  }
}
