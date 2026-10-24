import type { BacktestResult } from '../run-simple-backtest';
import type { UniverseBacktestItem } from './run-simple-universe-backtest';

type SuccessfulBacktest = Extract<BacktestResult, { readonly status: 'ok' }>;

export interface CompanyBacktestDetail {
  readonly trades: SuccessfulBacktest['trades'];
  readonly equity: SuccessfulBacktest['equity'];
  readonly openPosition: SuccessfulBacktest['openPosition'];
  readonly assumptions: SuccessfulBacktest['provenance']['assumptions'];
  readonly fillPolicy: SuccessfulBacktest['provenance']['fillPolicy'];
  readonly shareSizing: SuccessfulBacktest['provenance']['shareSizing'];
}

export type DetailedCompanyBacktestItem = UniverseBacktestItem & { readonly detail?: CompanyBacktestDetail };

export function projectCompanyBacktestDetail(symbol: string, result: BacktestResult): DetailedCompanyBacktestItem {
  if (result.status !== 'ok') return { symbol, status: result.status, code: result.code };
  return {
    symbol, status: 'ok', metrics: result.metrics,
    sourceRevision: result.provenance.sourceRevision, asOf: result.provenance.asOf,
    detail: {
      trades: result.trades, equity: result.equity, openPosition: result.openPosition,
      assumptions: result.provenance.assumptions, fillPolicy: result.provenance.fillPolicy,
      shareSizing: result.provenance.shareSizing,
    },
  };
}
