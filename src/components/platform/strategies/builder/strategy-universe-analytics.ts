import type { UniverseBacktestItem } from '../../../../lib/strategies/server/run-simple-universe-backtest';
import { BACKTEST_GROUPS } from './strategy-builder-fixtures';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';

export type ParsedUniverseBacktestResponse =
  | { readonly status: 'ready'; readonly results: readonly UniverseBacktestItem[] }
  | { readonly status: 'error' };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseUniverseBacktestResponse(value: unknown, symbols: readonly string[]): ParsedUniverseBacktestResponse {
  if (!record(value) || value.status !== 'ok' || !Array.isArray(value.results) || value.results.length !== symbols.length) return { status: 'error' };
  const results: UniverseBacktestItem[] = [];
  for (let index = 0; index < symbols.length; index++) {
    const item: unknown = value.results[index];
    if (!record(item) || item.symbol !== symbols[index]) return { status: 'error' };
    if (item.status === 'unavailable' || item.status === 'invalid') {
      if (typeof item.code !== 'string') return { status: 'error' };
      results.push({ symbol: symbols[index], status: item.status, code: item.code });
      continue;
    }
    if (item.status !== 'ok' || !record(item.metrics)) return { status: 'error' };
    const metrics = item.metrics;
    if (typeof metrics.totalReturnPct !== 'number' || !Number.isFinite(metrics.totalReturnPct)
      || typeof metrics.maxDrawdownPct !== 'number' || !Number.isFinite(metrics.maxDrawdownPct)
      || typeof metrics.closedTrades !== 'number' || !Number.isSafeInteger(metrics.closedTrades) || metrics.closedTrades < 0
      || (metrics.winRatePct !== null && (typeof metrics.winRatePct !== 'number' || !Number.isFinite(metrics.winRatePct)))
      || typeof item.sourceRevision !== 'string' || typeof item.asOf !== 'string') return { status: 'error' };
    results.push({ symbol: symbols[index], status: 'ok', metrics: {
      totalReturnPct: metrics.totalReturnPct, maxDrawdownPct: metrics.maxDrawdownPct,
      closedTrades: metrics.closedTrades, winRatePct: metrics.winRatePct as number | null,
    }, sourceRevision: item.sourceRevision, asOf: item.asOf });
  }
  return { status: 'ready', results };
}

export interface UniverseGroupSummary {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string;
  readonly selected: number;
  readonly completed: number;
  readonly unavailable: number;
  readonly meanReturnPct: number | null;
  readonly closedTrades: number;
  readonly items: readonly UniverseBacktestItem[];
}

export interface UniverseSummary {
  readonly selected: number;
  readonly completed: number;
  readonly unavailable: number;
  readonly profitable: number;
  readonly meanReturnPct: number | null;
  readonly closedTrades: number;
  readonly groups: readonly UniverseGroupSummary[];
}

function meanReturn(items: readonly UniverseBacktestItem[]): number | null {
  const ready = items.filter((item) => item.status === 'ok');
  return ready.length === 0 ? null : ready.reduce((sum, item) => sum + item.metrics.totalReturnPct, 0) / ready.length;
}

export function summarizeUniverseBacktest(items: readonly UniverseBacktestItem[], universe?: readonly StrategyUniverseCompany[]): UniverseSummary {
  const completed = items.filter((item) => item.status === 'ok');
  const liveGroups = new Map<string, Set<string>>();
  if (universe) for (const company of universe) {
    const symbols = liveGroups.get(company.group) ?? new Set<string>();
    symbols.add(company.symbol);
    liveGroups.set(company.group, symbols);
  }
  const catalogueGroups = universe
    ? [...liveGroups].map(([name, symbols]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, nameAr: name, symbols }))
    : BACKTEST_GROUPS.map((group) => ({ id: group.id, name: group.name, nameAr: group.nameAr, symbols: new Set(group.tickers.map((ticker) => ticker.symbol)) }));
  const knownSymbols = new Set(catalogueGroups.flatMap((group) => [...group.symbols]));
  const groupSources = [
    ...catalogueGroups,
    { id: 'other', name: 'Other companies', nameAr: 'شركات أخرى', symbols: new Set(items.map((item) => item.symbol).filter((symbol) => !knownSymbols.has(symbol))) },
  ];
  const groups = groupSources.map((group): UniverseGroupSummary => {
    const groupItems = items.filter((item) => group.symbols.has(item.symbol));
    const groupCompleted = groupItems.filter((item) => item.status === 'ok');
    return {
      id: group.id, name: group.name, nameAr: group.nameAr,
      selected: groupItems.length, completed: groupCompleted.length, unavailable: groupItems.length - groupCompleted.length,
      meanReturnPct: meanReturn(groupItems),
      closedTrades: groupCompleted.reduce((sum, item) => sum + item.metrics.closedTrades, 0),
      items: groupItems,
    };
  }).filter((group) => group.selected > 0);
  return {
    selected: items.length, completed: completed.length, unavailable: items.length - completed.length,
    profitable: completed.filter((item) => item.metrics.totalReturnPct > 0).length,
    meanReturnPct: meanReturn(items),
    closedTrades: completed.reduce((sum, item) => sum + item.metrics.closedTrades, 0),
    groups,
  };
}
