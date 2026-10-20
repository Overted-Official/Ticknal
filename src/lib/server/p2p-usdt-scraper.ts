/**
 * Real-Time USDT / EGP P2P Market Scraper
 * Fetches live retail clearing rates from Binance P2P and Bybit P2P.
 * The most liquid, transparent parallel shadow exchange proxy in Egypt.
 */

export interface UsdtEgpQuote {
  success: boolean;
  rate: number;
  binanceRate: number | null;
  bybitRate: number | null;
  source: 'composite_p2p' | 'binance_p2p' | 'bybit_p2p' | 'cached' | 'fallback_estimate';
  timestamp: string;
}

let cachedQuote: { quote: UsdtEgpQuote; expiresAt: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function computeMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

async function fetchBinanceP2P(timeoutMs = 5000): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        asset: 'USDT',
        fiat: 'EGP',
        merchantCheck: false,
        page: 1,
        rows: 10,
        tradeType: 'BUY',
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const ads = data?.data || [];
      const prices = ads
        .map((a: any) => parseFloat(a?.adv?.price))
        .filter((p: number) => !isNaN(p) && p > 20 && p < 200);

      if (prices.length > 0) {
        return computeMedian(prices);
      }
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn('Binance P2P fetch warning:', err instanceof Error ? err.message : String(err));
  }
  return null;
}

async function fetchBybitP2P(timeoutMs = 5000): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        tokenId: 'USDT',
        currencyId: 'EGP',
        side: '1', // 1 = Buy USDT
        size: '10',
        page: '1',
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const items = data?.result?.items || [];
      const prices = items
        .map((i: any) => parseFloat(i?.price))
        .filter((p: number) => !isNaN(p) && p > 20 && p < 200);

      if (prices.length > 0) {
        return computeMedian(prices);
      }
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn('Bybit P2P fetch warning:', err instanceof Error ? err.message : String(err));
  }
  return null;
}

export async function fetchLiveUsdtEgp(): Promise<UsdtEgpQuote> {
  const now = Date.now();
  if (cachedQuote && cachedQuote.expiresAt > now) {
    return { ...cachedQuote.quote, source: 'cached' };
  }

  const [binanceRate, bybitRate] = await Promise.all([
    fetchBinanceP2P(5000),
    fetchBybitP2P(5000),
  ]);

  let finalRate: number;
  let source: UsdtEgpQuote['source'];

  if (binanceRate && bybitRate) {
    // Both returned live prices: take average of medians
    finalRate = Number(((binanceRate + bybitRate) / 2).toFixed(2));
    source = 'composite_p2p';
  } else if (binanceRate) {
    finalRate = Number(binanceRate.toFixed(2));
    source = 'binance_p2p';
  } else if (bybitRate) {
    finalRate = Number(bybitRate.toFixed(2));
    source = 'bybit_p2p';
  } else if (cachedQuote) {
    return { ...cachedQuote.quote, source: 'cached' };
  } else {
    // Fallback baseline if network is down
    finalRate = 54.48;
    source = 'fallback_estimate';
  }

  const quote: UsdtEgpQuote = {
    success: source !== 'fallback_estimate',
    rate: finalRate,
    binanceRate: binanceRate ? Number(binanceRate.toFixed(2)) : null,
    bybitRate: bybitRate ? Number(bybitRate.toFixed(2)) : null,
    source,
    timestamp: new Date().toISOString(),
  };

  cachedQuote = { quote, expiresAt: now + CACHE_TTL_MS };
  return quote;
}
