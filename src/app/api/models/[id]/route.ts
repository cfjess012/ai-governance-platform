import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db/client';
import { modelSchema } from '@/lib/questions/model-schema';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const model = await getDB().getModel(id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    return NextResponse.json({ data: model });
  } catch (error) {
    console.error('Get model error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await getDB().getModel(id);
    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = modelSchema.safeParse(body.data ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const updated = {
      ...existing,
      data: parsed.data,
      updatedAt: new Date().toISOString(),
    };

    await getDB().saveModel(updated);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Update model error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await getDB().deleteModel(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete model error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
