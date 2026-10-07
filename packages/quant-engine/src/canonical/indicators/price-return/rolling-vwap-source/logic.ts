import {
  createDiagnostic,
  type ComputationResult,
  type TimeSeriesFrame,
} from '../../../contracts';
import { rollingWeightedMean } from '../../../core/rolling/weighted-mean';
import { getPriceSource } from '../../../core/series/price-source';

export const ROLLING_VWAP_SOURCES = ['close', 'hl2', 'hlc3', 'ohlc4'] as const;
export type RollingVwapSource = (typeof ROLLING_VWAP_SOURCES)[number];

export interface RollingVwapSourceParameters {
  readonly lookback: number;
  readonly source: RollingVwapSource;
}

export function computeRollingVwapSource(
  frame: TimeSeriesFrame,
  parameters: RollingVwapSourceParameters,
): ComputationResult {
  const values = frame.bars.map((bar) => getPriceSource(bar, parameters.source));
  const weights = frame.bars.map((bar) => bar.volume);
  const weighted = rollingWeightedMean(values, weights, parameters.lookback);
  const diagnostics = [...weighted.diagnostics];

  if (frame.bars.length < parameters.lookback) {
    diagnostics.push(
      createDiagnostic(
        'HISTORY_INSUFFICIENT',
        'indicator.history.lookbackExceedsObservations',
        { lookback: parameters.lookback, observations: frame.bars.length },
        'warning',
      ),
    );
  }

  return {
    status: 'ok',
    outputs: { rolling_vwap: weighted.values },
    diagnostics,
  };
}
