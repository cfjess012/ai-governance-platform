import { getDB } from '@/lib/db/client';
import { assembleReportData } from '@/lib/export/report-data';
import { generateDocx } from '@/lib/export/report-docx';
import type { AIUseCase } from '@/types/inventory';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const caseId = url.searchParams.get('caseId');
  const format = url.searchParams.get('format') ?? 'docx';

  if (!caseId) {
    return new Response(JSON.stringify({ error: 'caseId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Try the in-memory DB first (server-side fallback)
  const db = getDB();
  const record = await db.getModel(caseId);

  // For the POC, the case data comes from the client-side Zustand store,
  // not the server DB. The API route accepts the case data in the body
  // for now. In production, this would read from DynamoDB.
  // We return a 404 to signal the client should use the client-side export path.
  if (!record) {
    return new Response(JSON.stringify({ error: 'Use client-side export for Zustand-persisted cases' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Server-side export not yet implemented for inventory cases' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST handler — accepts the full case data in the request body
 * and generates the report server-side. This is the POC path since
 * case data lives in client-side Zustand (localStorage).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const useCase = body.useCase as AIUseCase;
    const format = (body.format as string) ?? 'docx';

    if (!useCase?.id) {
      return new Response(JSON.stringify({ error: 'useCase is required in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportData = assembleReportData(useCase);

    if (format === 'docx') {
      const buffer = await generateDocx(reportData);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${reportData.meta.fileName}.docx"`,
        },
      });
    }

    // PDF generation would go here — for now, fall back to DOCX
    return new Response(JSON.stringify({ error: `Format '${format}' not yet implemented. Use 'docx'.` }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Report generation failed:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Report generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
