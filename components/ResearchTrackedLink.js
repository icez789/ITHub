'use client';

import Link from 'next/link';

import { trackResearchEvent } from './ResearchAnalyticsProvider';

export default function ResearchTrackedLink({ analyticsEvent, onClick, ...props }) {
  const handleClick = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented && analyticsEvent) trackResearchEvent(analyticsEvent);
  };
  return <Link {...props} onClick={handleClick} />;
}
