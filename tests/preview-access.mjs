import { isDiscoveryPreviewUrl } from '../scripts/discovery-preview-safety.mjs';

export function validatePreviewAccessUrl(baseUrl, accessUrl) {
  const accessValue = String(accessUrl || '').trim();
  if (!accessValue) return null;

  const base = new URL(baseUrl);
  const access = new URL(accessValue);
  if (!isDiscoveryPreviewUrl(base.href) || access.origin !== base.origin) {
    throw new Error('Preview access URL must match the immutable ITHub deployment origin');
  }
  if (!access.searchParams.get('_vercel_share')) {
    throw new Error('Preview access URL must contain a Vercel share token');
  }
  return access.href;
}

export async function authorizeVercelPreview(page) {
  const accessUrl = validatePreviewAccessUrl(
    process.env.ITHUB_E2E_BASE_URL,
    process.env.ITHUB_E2E_ACCESS_URL,
  );
  if (!accessUrl) return;

  const expectedOrigin = new URL(process.env.ITHUB_E2E_BASE_URL).origin;
  const response = await page.goto(accessUrl, { waitUntil: 'domcontentloaded' });
  if (!response?.ok() || new URL(page.url()).origin !== expectedOrigin) {
    throw new Error('Unable to authorize the protected ITHub Preview deployment');
  }
}
