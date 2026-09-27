import MarketsPageView from '@/components/platform/markets/MarketsPageView';

export const dynamic = 'force-dynamic';

export default function MarketsPage() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden">
      <MarketsPageView />
    </div>
  );
}
