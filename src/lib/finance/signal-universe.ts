import type { PriceBar } from '@/strategies/PSI/psiStrategy';

const EXCLUDED_SIGNAL_SYMBOLS = new Set([
  'EGX30',
  'EGX70',
  'EGX100',
  'USDEGP',
  'GC1!',
  'SI1!',
  'CI_QUANT',
  'OSOUL',
  'COF',
]);

type SignalAssetMeta = {
  sector?: string | null;
};

export function isSignalEligibleEquity(
  symbol: string,
  meta?: SignalAssetMeta | null,
): boolean {
  const normalizedSymbol = symbol.replace(/\.CA$/i, '').toUpperCase();
  const normalizedSector = meta?.sector?.trim().toLowerCase() ?? '';

  if (EXCLUDED_SIGNAL_SYMBOLS.has(normalizedSymbol)) return false;

  return !['index', 'indice', 'macro', 'fund'].some((assetType) =>
    normalizedSector.includes(assetType),
  );
}

export function getLatestBarDate(bars: PriceBar[]): string | null {
  let latestDate: string | null = null;

  for (const bar of bars) {
    const date = String(bar.date).split('T')[0];
    if (!latestDate || date > latestDate) latestDate = date;
  }

  return latestDate;
}
