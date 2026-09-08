import { requireAdmin } from '../../../../../lib/auth';
import { createResearchChapterExport } from '../../../../../lib/research';
import { ResearchMetricFilterError } from '../../../../../lib/researchMetricsCore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(status, code) {
  return Response.json({ status: 'error', code }, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const { archive, fileName } = await createResearchChapterExport(url.searchParams);
    return new Response(archive, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(archive.length),
        'Content-Type': 'application/zip',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error?.message === 'Unauthorized') return jsonError(401, 'authentication_required');
    if (error?.message === 'Forbidden') return jsonError(403, 'forbidden');
    if (error instanceof ResearchMetricFilterError) return jsonError(400, error.code);
    return jsonError(503, 'export_unavailable');
  }
}
