import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db/client';
import { modelSchema } from '@/lib/questions/model-schema';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const provider = searchParams.get('provider') ?? undefined;
    const models = await getDB().listModels({ status, provider });
    return NextResponse.json({ data: models });
  } catch (error) {
    console.error('List models error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = modelSchema.safeParse(body.data ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const id = `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      data: parsed.data,
      createdAt: now,
      updatedAt: now,
      createdBy: 'mock-user@example.com',
    };

    await getDB().saveModel(record);
    return NextResponse.json({ data: record });
  } catch (error) {
    console.error('Create model error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
