/**
 * Local Egyptian Gold Scraper (iSagha Market Parser)
 * Fetches real-time Cairo Sagha prices for 24k and 21k bullion grams and global spot ounces.
 */

export interface SaghaGoldQuote {
  success: boolean;
  price24k: number;
  price21k: number;
  price18k?: number;
  goldPound?: number;
  globalOunceUsd: number;
  impliedUsdEgp: number;
  source: 'live_isagha' | 'cached' | 'fallback_estimate';
  timestamp: string;
}

let cachedQuote: { quote: SaghaGoldQuote; expiresAt: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const OZ_TO_GRAMS = 31.1034768;

export async function fetchLiveSaghaGold(): Promise<SaghaGoldQuote> {
  const now = Date.now();
  if (cachedQuote && cachedQuote.expiresAt > now) {
    return { ...cachedQuote.quote, source: 'cached' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://market.isagha.com/prices', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const quote = parseIsaghaHtml(html);
      if (quote) {
        cachedQuote = { quote, expiresAt: now + CACHE_TTL_MS };
        return quote;
      }
    }
  } catch (err) {
    console.warn('Primary isagha scraper error, attempting fallback URL:', err);
  }

  // Secondary fallback attempt on isagha root
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const fallbackRes = await fetch('https://isagha.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (fallbackRes.ok) {
      const html = await fallbackRes.text();
      const quote = parseIsaghaHtml(html);
      if (quote) {
        cachedQuote = { quote, expiresAt: now + CACHE_TTL_MS };
        return quote;
      }
    }
  } catch (err) {
    console.warn('Secondary isagha scraper fallback error:', err);
  }

  // Graceful fallback values based on latest known Egypt Sagha benchmarks
  const fallback21k = 6180;
  const fallback24k = Number((fallback21k * (24 / 21)).toFixed(2));
  const fallbackOunce = 4160;
  const impliedRate = Number(((fallback24k * OZ_TO_GRAMS) / fallbackOunce).toFixed(2));

  return {
    success: false,
    price24k: fallback24k,
    price21k: fallback21k,
    globalOunceUsd: fallbackOunce,
    impliedUsdEgp: impliedRate,
    source: 'fallback_estimate',
    timestamp: new Date().toISOString(),
  };
}

function parseIsaghaHtml(html: string): SaghaGoldQuote | null {
  try {
    let p24k = 0;
    let p21k = 0;
    let p18k = 0;
    let pound = 0;
    let ounceUsd = 0;

    // Pattern for data-unit="24" ... <span data-testid="price-figure" class="tabular-nums">7062.75</span>
    const row24Match = html.match(/data-unit=["']24["'][\s\S]*?data-testid=["']board-sell["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i)
      || html.match(/data-unit=["']24["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i);
    if (row24Match) {
      p24k = parseFloat(row24Match[1].replace(/,/g, ''));
    }

    const row21Match = html.match(/data-unit=["']21["'][\s\S]*?data-testid=["']board-sell["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i)
      || html.match(/data-unit=["']21["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i);
    if (row21Match) {
      p21k = parseFloat(row21Match[1].replace(/,/g, ''));
    }

    const row18Match = html.match(/data-unit=["']18["'][\s\S]*?data-testid=["']board-sell["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i);
    if (row18Match) {
      p18k = parseFloat(row18Match[1].replace(/,/g, ''));
    }

    const poundMatch = html.match(/data-unit=["']pound["'][\s\S]*?data-testid=["']board-sell["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i);
    if (poundMatch) {
      pound = parseFloat(poundMatch[1].replace(/,/g, ''));
    }

    const ounceMatch = html.match(/data-unit=["']ounce["'][\s\S]*?<span[^>]*class=["'][^"']*tabular-nums[^"']*["'][^>]*>([\d,\.]+)<\/span>/i);
    if (ounceMatch) {
      ounceUsd = parseFloat(ounceMatch[1].replace(/,/g, ''));
    }

    // Mathematical purity fallback: if 24k is missing but 21k was parsed, compute 24k = 21k * (24/21)
    if (!p24k && p21k > 0) {
      p24k = Number((p21k * (24 / 21)).toFixed(2));
    } else if (p24k > 0 && !p21k) {
      p21k = Number((p24k * (21 / 24)).toFixed(2));
    }

    if (p24k <= 0) {
      return null;
    }

    if (!ounceUsd || ounceUsd <= 0) {
      ounceUsd = 4160; // baseline spot fallback
    }

    const impliedRate = Number(((p24k * OZ_TO_GRAMS) / ounceUsd).toFixed(2));

    return {
      success: true,
      price24k: p24k,
      price21k: p21k,
      price18k: p18k > 0 ? p18k : undefined,
      goldPound: pound > 0 ? pound : undefined,
      globalOunceUsd: ounceUsd,
      impliedUsdEgp: impliedRate,
      source: 'live_isagha',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error parsing isagha HTML:', err);
    return null;
  }
}
