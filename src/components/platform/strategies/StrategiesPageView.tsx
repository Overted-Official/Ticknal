import StrategyBuilderWorkspace from './builder/StrategyBuilderWorkspace';
import type { StrategyBuilderIndicatorCatalogItem } from './builder/strategy-builder-model';

interface StrategiesPageViewProps {
  readonly indicatorCatalog: readonly StrategyBuilderIndicatorCatalogItem[];
}

export default function StrategiesPageView({ indicatorCatalog }: StrategiesPageViewProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-row overflow-hidden bg-black font-sans text-white">
      <StrategyBuilderWorkspace indicatorCatalog={indicatorCatalog} />
    </div>
  );
}
