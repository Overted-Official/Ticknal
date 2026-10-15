import StrategiesPageView from '@/components/platform/strategies/StrategiesPageView';
import { buildStrategyCompanyUniverse } from '@/components/platform/strategies/builder/strategy-universe-catalog';
import { getStrategyIndicatorCatalog } from '@/components/platform/strategies/strategy-indicator-catalog';
import { getCachedTickers } from '@/lib/utils/data-cache';
import { getCurrentProprietaryAccess } from '@/lib/server/proprietary-strategy-access';
import { getProprietaryStudioPresentation } from '@/lib/server/proprietary-studio-presentation';

export const dynamic = 'force-dynamic';

export default async function StrategiesPage() {
  const [universe, access] = await Promise.all([
    getCachedTickers().then(buildStrategyCompanyUniverse).catch(() => []),
    getCurrentProprietaryAccess(),
  ]);
  const presentation = getProprietaryStudioPresentation(access.canView);
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-black text-white overflow-hidden pb-[calc(64px+max(var(--ticknal-safe-area-bottom),0.5rem))] md:pb-0">
      <StrategiesPageView indicatorCatalog={getStrategyIndicatorCatalog()} universe={universe}
        canViewProprietary={access.canView} proprietaryAlertsEnabled={access.canReceiveAlerts}
        profiles={presentation.profiles} typhonNodes={presentation.typhonNodes} />
    </div>
  );
}
