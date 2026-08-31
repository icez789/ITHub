'use client';

import { useOnboarding } from './OnboardingProvider';
import { PlayCircle } from 'lucide-react';

export default function OnboardingLauncher({ className = '', label = 'เปิดคำแนะนำอีกครั้ง' }) {
  const { openTour } = useOnboarding();

  return (
    <button type="button" data-onboarding-trigger="help-launcher" onClick={(event) => openTour(event.currentTarget)} className={className}>
      <PlayCircle aria-hidden="true" size={18} />
      <span>{label}</span>
    </button>
  );
}
