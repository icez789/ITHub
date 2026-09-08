import { RateLimitError } from '../../../../lib/rateLimit';
import {
  AnalyticsPayloadError,
  isSameOriginAnalyticsRequest,
} from '../../../../lib/researchAnalyticsCore';
import {
  AnalyticsCampaignUnavailableError,
  AnalyticsConsentRequiredError,
} from '../../../../lib/researchAnalyticsRecordsCore';
import { ingestResearchAnalyticsBatch } from '../../../../lib/research';
import { ANALYTICS_MAX_BODY_BYTES } from '../../../../lib/researchShared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

class AnalyticsBodyTooLargeError extends Error {}

function jsonResponse(body, status, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...extraHeaders,
    },
  });
}

async function readLimitedJson(request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > ANALYTICS_MAX_BODY_BYTES) {
    throw new AnalyticsBodyTooLargeError();
  }

  if (!request.body) throw new SyntaxError('Missing JSON body');
  const reader = request.body.getReader();
  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > ANALYTICS_MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new AnalyticsBodyTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

export async function POST(request) {
  if (!isSameOriginAnalyticsRequest({
    requestUrl: request.url,
    requestHost: request.headers.get('host'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    secFetchSite: request.headers.get('sec-fetch-site'),
  })) {
    return jsonResponse({ ok: false, code: 'origin_not_allowed' }, 403);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return jsonResponse({ ok: false, code: 'json_required' }, 415);
  }

  let payload;
  try {
    payload = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof AnalyticsBodyTooLargeError) {
      return jsonResponse({ ok: false, code: 'body_too_large' }, 413);
    }
    return jsonResponse({ ok: false, code: 'invalid_json' }, 400);
  }

  try {
    const result = await ingestResearchAnalyticsBatch(payload);
    return jsonResponse({
      ok: true,
      accepted: result.accepted,
      duplicates: result.duplicates,
    }, 202);
  } catch (error) {
    if (error instanceof AnalyticsPayloadError) {
      return jsonResponse({ ok: false, code: 'invalid_payload' }, 400);
    }
    if (error instanceof AnalyticsConsentRequiredError) {
      return jsonResponse({ ok: false, code: 'consent_required' }, 403);
    }
    if (error instanceof AnalyticsCampaignUnavailableError) {
      return jsonResponse({ ok: false, code: 'campaign_unavailable' }, 409);
    }
    if (error instanceof RateLimitError) {
      return jsonResponse({ ok: false, code: 'rate_limited' }, 429, { 'Retry-After': '60' });
    }
    if (error?.message === 'Unauthorized') {
      return jsonResponse({ ok: false, code: 'unauthorized' }, 401);
    }
    return jsonResponse({ ok: false, code: 'temporarily_unavailable' }, 503);
  }
}
