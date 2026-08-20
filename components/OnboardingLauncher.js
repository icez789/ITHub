'use client';

import { useOnboarding } from './OnboardingProvider';

export default function OnboardingLauncher({ className = '', label = 'เปิดคำแนะนำอีกครั้ง' }) {
  const { openTour } = useOnboarding();

  return (
    <button type="button" onClick={(event) => openTour(event.currentTarget)} className={className}>
      <span aria-hidden="true">▶</span>
      <span>{label}</span>
    </button>
  );
}
