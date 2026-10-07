import { createDiagnostic } from '../contracts';
import { evaluateRuleSeries } from './evaluate-rule-series';
import type {
  CanonicalOutputConsumerRequest,
  CanonicalScanValueResult,
} from './types';

export function evaluateScanValue(
  request: CanonicalOutputConsumerRequest,
): CanonicalScanValueResult {
  const result = evaluateRuleSeries(request);
  if (result.status !== 'ok') {
    return {
      status: result.status,
      outputKey: request.outputKey,
      time: null,
      value: null,
      evidence: result.evidence,
      diagnostics: result.diagnostics,
    };
  }

  for (let index = result.points.length - 1; index >= 0; index -= 1) {
    const point = result.points[index];
    const bar = request.frame.bars[index];
    if (point && bar?.finality === 'final' && point.value !== null) {
      return {
        status: 'ok',
        outputKey: request.outputKey,
        time: point.time,
        value: point.value,
        evidence: result.evidence,
        diagnostics: result.diagnostics,
      };
    }
  }

  return {
    status: 'unavailable',
    outputKey: request.outputKey,
    time: null,
    value: null,
    evidence: result.evidence,
    diagnostics: [
      ...result.diagnostics,
      createDiagnostic(
        'HISTORY_INSUFFICIENT',
        'indicator.consumer.confirmedValueUnavailable',
        { outputKey: request.outputKey },
      ),
    ],
  };
}
