import StrategiesPageView from '@/components/platform/strategies/StrategiesPageView';
import { getStrategyIndicatorCatalog } from '@/components/platform/strategies/strategy-indicator-catalog';
import { notFound } from 'next/navigation';

export const metadata = { robots: { index: false, follow: false } };

// Public, read-only landing preview. The protected /strategies route remains unchanged.
export default async function LandingStrategyScenePage({
  searchParams,
}: {
  searchParams: Promise<{ heroScene?: string | string[] }>;
}) {
  if ((await searchParams).heroScene !== 'landing') notFound();

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-black text-white overflow-hidden pb-[calc(64px+max(var(--ticknal-safe-area-bottom),0.5rem))] md:pb-0">
      <StrategiesPageView indicatorCatalog={getStrategyIndicatorCatalog()} />
    </div>
  );
}
