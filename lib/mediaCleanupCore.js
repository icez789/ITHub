export async function cleanupMediaAsset({ publicId, destroy, queue, reason }) {
  if (!publicId) return { success: true, skipped: true };
  try {
    const result = await destroy(publicId);
    if (!['ok', 'not found'].includes(result?.result)) {
      throw new Error(`Unexpected cleanup result: ${result?.result || 'unknown'}`);
    }
    return { success: true };
  } catch (error) {
    await queue(publicId, reason, error);
    return { success: false, error };
  }
}
