import StrategyBuilderWorkspace from './builder/StrategyBuilderWorkspace';
import type { StrategyBuilderIndicatorCatalogItem } from './builder/strategy-builder-model';
import type { StrategyUniverseCompany } from './builder/strategy-universe-catalog';

interface StrategiesPageViewProps {
  readonly indicatorCatalog: readonly StrategyBuilderIndicatorCatalogItem[];
  readonly universe: readonly StrategyUniverseCompany[];
  readonly canViewProprietary: boolean;
  readonly proprietaryAlertsEnabled: boolean;
}

export default function StrategiesPageView({ indicatorCatalog, universe, canViewProprietary, proprietaryAlertsEnabled }: StrategiesPageViewProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-row overflow-hidden bg-black font-sans text-white">
      <StrategyBuilderWorkspace indicatorCatalog={indicatorCatalog} universe={universe}
        canViewProprietary={canViewProprietary} proprietaryAlertsEnabled={proprietaryAlertsEnabled} />
    </div>
  );
}
