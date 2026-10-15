import StrategyBuilderWorkspace from './builder/StrategyBuilderWorkspace';
import type { StrategyBuilderIndicatorCatalogItem } from './builder/strategy-builder-model';
import type { StrategyUniverseCompany } from './builder/strategy-universe-catalog';
import type { AdvancedStrategyNode } from './builder/advanced-strategy-model';
import type { ProprietaryStudioProfile } from '@/lib/server/proprietary-studio-presentation';

interface StrategiesPageViewProps {
  readonly indicatorCatalog: readonly StrategyBuilderIndicatorCatalogItem[];
  readonly universe: readonly StrategyUniverseCompany[];
  readonly canViewProprietary: boolean;
  readonly proprietaryAlertsEnabled: boolean;
  readonly profiles: readonly ProprietaryStudioProfile[];
  readonly typhonNodes: readonly AdvancedStrategyNode[];
}

export default function StrategiesPageView({ indicatorCatalog, universe, canViewProprietary, proprietaryAlertsEnabled, profiles, typhonNodes }: StrategiesPageViewProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-row overflow-hidden bg-black font-sans text-white">
      <StrategyBuilderWorkspace indicatorCatalog={indicatorCatalog} universe={universe}
        canViewProprietary={canViewProprietary} proprietaryAlertsEnabled={proprietaryAlertsEnabled}
        profiles={profiles} typhonNodes={typhonNodes} />
    </div>
  );
}
