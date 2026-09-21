/**
 * Shared signal-state rules for portfolio, opportunity, notifications, and chart
 * surfaces. A signal is only actionable when it is the latest BUY/SELL event in
 * the same trading-session window used by the UI.
 */
export const DEFAULT_SIGNAL_LOOKBACK_BARS = 5;

type DatedSignal = {
  date: string;
  signal: string;
};

type DatedBar = {
  date: string;
};

function normalizeDate(value: string): string {
  return String(value).split('T')[0];
}

function isActionableSignal(signal: string): boolean {
  return signal === 'BUY' || signal.startsWith('SELL');
}

export function getLatestActionableSignal<T extends DatedSignal>(
  signals: T[],
  bars: DatedBar[],
  lookbackBars: number = DEFAULT_SIGNAL_LOOKBACK_BARS,
): { signal: T; barsAgo: number } | null {
  if (!signals.length || !bars.length || lookbackBars <= 0) return null;

  const recentDates = new Set(
    bars.slice(-lookbackBars).map((bar) => normalizeDate(bar.date)),
  );

  for (let signalIndex = signals.length - 1; signalIndex >= 0; signalIndex -= 1) {
    const candidate = signals[signalIndex];
    const candidateDate = normalizeDate(candidate.date);
    if (!isActionableSignal(candidate.signal) || !recentDates.has(candidateDate)) continue;

    let barIndex = -1;
    for (let index = bars.length - 1; index >= 0; index -= 1) {
      if (normalizeDate(bars[index].date) === candidateDate) {
        barIndex = index;
        break;
      }
    }

    return {
      signal: candidate,
      barsAgo: barIndex >= 0 ? bars.length - 1 - barIndex : 0,
    };
  }

  return null;
}

export function signalWindowLabel(lookbackBars: number = DEFAULT_SIGNAL_LOOKBACK_BARS): string {
  return `last ${lookbackBars} trading sessions`;
}
