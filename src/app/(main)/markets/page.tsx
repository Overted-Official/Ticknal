import MarketsPageView from '@/components/platform/markets/MarketsPageView';

export const dynamic = 'force-dynamic';

export default function MarketsPage() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden pb-[calc(64px+max(env(safe-area-inset-bottom),0.5rem))] md:pb-0">
      <MarketsPageView />
    </div>
  );
}
