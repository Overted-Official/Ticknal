import type { BacktestResult } from '../run-simple-backtest';

export function actionableCustomSignal(
  result: Pick<Extract<BacktestResult, { status: 'ok' }>, 'status' | 'latestSignal'> & { provenance: { asOf: string } } | Exclude<BacktestResult, { status: 'ok' }>,
  session: string,
): Extract<BacktestResult, { status: 'ok' }>['latestSignal'] {
  if (result.status !== 'ok' || result.provenance.asOf !== session || result.latestSignal?.date !== session) return null;
  return result.latestSignal;
}

export function customStrategyPushPayload(input: {
  strategyId: string;
  strategyName: string;
  symbol: string;
  companyName?: string | null;
  signal: 'BUY' | 'SELL';
  session: string;
  price: number;
}) {
  const url = `/strategies?strategy=${encodeURIComponent(input.strategyId)}&ticker=${encodeURIComponent(input.symbol)}`;
  return {
    title: `(${input.signal}) ${input.companyName || input.symbol}`,
    body: `${input.strategyName} · ${input.symbol} · EGP ${input.price.toFixed(2)}`,
    url,
    tag: `${input.strategyId}-${input.symbol}-${input.session}-${input.signal}`,
    symbol: input.symbol,
    strategy: input.strategyId,
    signal: input.signal,
    price: input.price,
  };
}
