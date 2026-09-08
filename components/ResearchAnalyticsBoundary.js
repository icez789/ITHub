import ResearchAnalyticsProvider from './ResearchAnalyticsProvider';
import { getResearchAnalyticsBootstrap } from '../lib/research';
import { resolveResearchAnalyticsEnabled } from '../lib/researchAnalyticsCore';

export default async function ResearchAnalyticsBoundary() {
  const enabled = await resolveResearchAnalyticsEnabled(getResearchAnalyticsBootstrap);
  return <ResearchAnalyticsProvider key={enabled ? 'active' : 'inactive'} initialEnabled={enabled} />;
}
