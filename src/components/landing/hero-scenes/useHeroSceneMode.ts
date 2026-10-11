'use client';

import { useSearchParams } from 'next/navigation';

export function useHeroSceneMode(_pathname?: string) {
  return useSearchParams()?.get('heroScene') === 'landing';
}
