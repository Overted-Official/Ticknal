import StrategiesPageView from '@/components/platform/strategies/StrategiesPageView';

export const dynamic = 'force-dynamic';

export default function StrategiesPage() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-black text-white overflow-hidden pb-[calc(64px+max(env(safe-area-inset-bottom),0.5rem))] md:pb-0">
      <StrategiesPageView />
    </div>
  );
}
