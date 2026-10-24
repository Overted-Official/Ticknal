import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';
import { parseCompanyBacktestResponse, type CompanyBacktestResult } from './use-simple-company-backtest';

interface ComparisonInput {
  readonly before: ExecutableStrategyProgram | null;
  readonly after: ExecutableStrategyProgram;
  readonly symbol: string;
  readonly period: { readonly startDate: string; readonly endDate: string };
  readonly assumptions: BacktestAssumptions;
}

export type AssistantBacktestComparison =
  | { readonly status: 'ready'; readonly symbol: string; readonly beforeReturnPct: number | null; readonly afterReturnPct: number; readonly deltaReturnPct: number | null; readonly beforeDrawdownPct: number | null; readonly afterDrawdownPct: number; readonly sourceRevision: string; readonly asOf: string }
  | { readonly status: 'unavailable'; readonly reason: string };

export async function compareAssistantBacktests(
  input: ComparisonInput,
  fetcher: typeof fetch = fetch,
): Promise<AssistantBacktestComparison> {
  if (!/^[A-Z0-9._-]{1,16}$/.test(input.symbol) || input.period.startDate > input.period.endDate) {
    return { status: 'unavailable', reason: 'Select one valid company and date range.' };
  }
  const run = async (program: ExecutableStrategyProgram): Promise<CompanyBacktestResult> => {
    const response = await fetcher('/api/strategies/backtest', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: [input.symbol], program, assumptions: input.assumptions, period: input.period, detail: true }),
    });
    if (!response.ok) return { status: 'error' };
    return parseCompanyBacktestResponse(await response.json() as unknown, input.symbol);
  };
  try {
    const [before, after] = await Promise.all([input.before ? run(input.before) : Promise.resolve(null), run(input.after)]);
    if (after.status !== 'ready') return { status: 'unavailable', reason: after.status === 'unavailable' ? after.code : 'The proposed strategy could not be tested.' };
    if (before && before.status !== 'ready') return { status: 'unavailable', reason: before.status === 'unavailable' ? before.code : 'The previous strategy could not be tested.' };
    if (before && (before.sourceRevision !== after.sourceRevision || before.asOf !== after.asOf)) {
      return { status: 'unavailable', reason: 'Market data changed during the comparison. Run the test again.' };
    }
    return {
      status: 'ready', symbol: input.symbol,
      beforeReturnPct: before?.metrics.totalReturnPct ?? null,
      afterReturnPct: after.metrics.totalReturnPct,
      deltaReturnPct: before ? after.metrics.totalReturnPct - before.metrics.totalReturnPct : null,
      beforeDrawdownPct: before?.metrics.maxDrawdownPct ?? null,
      afterDrawdownPct: after.metrics.maxDrawdownPct,
      sourceRevision: after.sourceRevision, asOf: after.asOf,
    };
  } catch { return { status: 'unavailable', reason: 'The backtest is temporarily unavailable.' }; }
}
