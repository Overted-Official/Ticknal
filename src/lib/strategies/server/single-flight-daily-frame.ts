import { normalizeLiveTicker } from '../../indicators/server/types';

export function createSingleFlightDailyFrameLoader<T>(source: (symbol: string) => Promise<T>) {
  const inFlight = new Map<string, Promise<T>>();

  return (rawSymbol: string): Promise<T> => {
    const symbol = normalizeLiveTicker(rawSymbol);
    if (!symbol) return Promise.reject(new RangeError('Invalid strategy symbol.'));

    const existing = inFlight.get(symbol);
    if (existing) return existing;

    let requested: Promise<T>;
    try {
      requested = source(symbol);
    } catch (error) {
      return Promise.reject(error);
    }
    const tracked = requested.finally(() => {
      if (inFlight.get(symbol) === tracked) inFlight.delete(symbol);
    });
    inFlight.set(symbol, tracked);
    return tracked;
  };
}
