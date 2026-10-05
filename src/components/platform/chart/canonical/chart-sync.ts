interface LogicalRange {
  readonly from: number;
  readonly to: number;
}

interface TimeScalePort {
  subscribeVisibleLogicalRangeChange(listener: (range: LogicalRange | null) => void): void;
  unsubscribeVisibleLogicalRangeChange(listener: (range: LogicalRange | null) => void): void;
  setVisibleLogicalRange(range: LogicalRange): void;
  getVisibleLogicalRange(): LogicalRange | null;
}

interface CrosshairEvent {
  readonly time?: unknown;
}

interface ChartPort {
  timeScale(): TimeScalePort;
  subscribeCrosshairMove(listener: (event: CrosshairEvent) => void): void;
  unsubscribeCrosshairMove(listener: (event: CrosshairEvent) => void): void;
  setCrosshairPosition(value: number, time: never, series: unknown): void;
  clearCrosshairPosition(): void;
}

interface SynchronizeChartSurfaceInput {
  readonly mainChart: ChartPort;
  readonly mainSeries: unknown;
  readonly childChart: ChartPort;
  readonly childSeries: unknown;
  readonly mainValueAtTime: (time: string) => number | null;
  readonly childValueAtTime: (time: string) => number | null;
}

export function synchronizeChartSurface({
  mainChart,
  mainSeries,
  childChart,
  childSeries,
  mainValueAtTime,
  childValueAtTime,
}: SynchronizeChartSurfaceInput): () => void {
  const mainScale = mainChart.timeScale();
  const childScale = childChart.timeScale();
  let syncingRange = false;
  let cleaned = false;

  const syncRange = (target: TimeScalePort) => (range: LogicalRange | null) => {
    if (!range || syncingRange) return;
    syncingRange = true;
    try { target.setVisibleLogicalRange(range); } finally { syncingRange = false; }
  };
  const mainToChild = syncRange(childScale);
  const childToMain = syncRange(mainScale);

  const syncCrosshair = (
    target: ChartPort,
    targetSeries: unknown,
    valueAtTime: (time: string) => number | null,
  ) => (event: CrosshairEvent) => {
    if (event.time === undefined || event.time === null) {
      target.clearCrosshairPosition();
      return;
    }
    const time = typeof event.time === 'string' ? event.time : String(event.time);
    const value = valueAtTime(time);
    if (value === null) target.clearCrosshairPosition();
    else target.setCrosshairPosition(value, event.time as never, targetSeries);
  };
  const mainCrosshair = syncCrosshair(childChart, childSeries, childValueAtTime);
  const childCrosshair = syncCrosshair(mainChart, mainSeries, mainValueAtTime);

  mainScale.subscribeVisibleLogicalRangeChange(mainToChild);
  childScale.subscribeVisibleLogicalRangeChange(childToMain);
  mainChart.subscribeCrosshairMove(mainCrosshair);
  childChart.subscribeCrosshairMove(childCrosshair);
  const initialRange = mainScale.getVisibleLogicalRange();
  if (initialRange) childScale.setVisibleLogicalRange(initialRange);

  return () => {
    if (cleaned) return;
    cleaned = true;
    mainScale.unsubscribeVisibleLogicalRangeChange(mainToChild);
    childScale.unsubscribeVisibleLogicalRangeChange(childToMain);
    mainChart.unsubscribeCrosshairMove(mainCrosshair);
    childChart.unsubscribeCrosshairMove(childCrosshair);
  };
}
