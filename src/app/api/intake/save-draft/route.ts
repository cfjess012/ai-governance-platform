import { type NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db/client';
import { intakeDraftSchema } from '@/lib/questions/intake-schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, draftId } = body;

    // Validate as draft (partial)
    const parsed = intakeDraftSchema.safeParse(formData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const db = getDB();
    const id = draftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await db.saveIntake({
      id,
      formData: parsed.data as never,
      status: 'draft',
      riskScore: null,
      euAiActTier: null,
      agentTier: null,
      serviceNowSysId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedBy: 'mock-user@example.com',
    });

    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}
