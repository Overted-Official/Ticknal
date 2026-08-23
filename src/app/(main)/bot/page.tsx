import { Suspense } from 'react';
import BotCockpit from '@/components/bot/BotCockpit';

export const dynamic = 'force-dynamic';

export default async function BotPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || 'cockpit';

  return (
    <div className="app-shell flex-1 h-full w-full min-h-0 flex flex-col overflow-hidden relative z-10">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center min-h-126">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-plt-border border-t-white animate-spin" />
              <span className="text-xs tabular-nums text-plt-muted">Loading Bot Cockpit...</span>
            </div>
          </div>
        }
      >
        <BotCockpit initialTab={tab} />
      </Suspense>
    </div>
  );
}
