import { createDiagnostic, type ComputationResult, type Diagnostic, type TimeSeriesFrame } from '../../../contracts';
import { rollingMinMax } from '../../../core/rolling/extrema';
import type { LookbackParameters } from '../shared/parse-lookback-parameters';

export function computePricePercentileRank(
  frame: TimeSeriesFrame,
  parameters: LookbackParameters,
): ComputationResult {
  const close = frame.bars.map((bar) => bar.close);
  const extrema = rollingMinMax(close, parameters.lookback);
  const diagnostics: Diagnostic[] = [];
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

  const values = close.map((value, index) => {
    const minimum = extrema.minimum[index];
    const maximum = extrema.maximum[index];
    if (minimum === null || maximum === null) return null;
    const width = maximum - minimum;
    if (width === 0) {
      diagnostics.push(
        createDiagnostic(
          'NUMERIC_DIVIDE_BY_ZERO',
          'indicator.numeric.zeroWidthWindow',
          { index, lookback: parameters.lookback },
          'warning',
        ),
      );
      return null;
    }
    return ((value - minimum) / width) * 100;
  });

  return {
    status: 'ok',
    outputs: { percentile_0_100: values },
    diagnostics,
  };
}
