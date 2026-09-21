import fs from 'fs';
import path from 'path';
import TradingView from '@mathieuc/tradingview';

// 1. Target output directory for 1-Hour datasets
const outputDir = path.resolve(__dirname, '../../_playground/QE-V1-Upgrade/_dataset/Intraday/1h');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 2. Load 293 tickers list
const tickersJsonPath = path.join(__dirname, 'full_293_tickers.json');
const tickersRaw = fs.readFileSync(tickersJsonPath, 'utf-8');
const tickersList: { symbol: string; companyName: string }[] = JSON.parse(tickersRaw);

console.log(`Loaded ${tickersList.length} EGX tickers from full_293_tickers.json`);
console.log(`Output Directory: ${outputDir}`);

// Range: up to 5,000 1-Hour bars
const TIMEFRAME = '60'; // 60 minutes = 1 Hour
const RANGE = 5000;

function fetchTicker1h(symbol: string): Promise<{ symbol: string; barsCount: number; status: 'SUCCESS' | 'NO_DATA' | 'ERROR'; error?: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let client: any = null;
    let chart: any = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        if (chart) chart.delete();
        if (client) client.end();
      } catch {}
    };

    const done = (result: { symbol: string; barsCount: number; status: 'SUCCESS' | 'NO_DATA' | 'ERROR'; error?: string }) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    try {
      client = new TradingView.Client();
      const tvSymbol = `EGX:${symbol}`;
      chart = new client.Session.Chart();

      chart.setMarket(tvSymbol, {
        timeframe: TIMEFRAME,
        range: RANGE,
      });

      timeoutId = setTimeout(() => {
        done({ symbol, barsCount: 0, status: 'ERROR', error: 'Timeout after 12s' });
      }, 12000);

      chart.onUpdate(() => {
        const data = chart.periods || [];
        if (!data || data.length === 0) return;

        // Sort ascending by time
        data.sort((a: any, b: any) => a.time - b.time);

        let csv = 'datetime,open,high,low,close,volume\n';
        for (const bar of data) {
          const dateStr = new Date(bar.time * 1000).toISOString();
          const open = bar.open ?? 0;
          const high = bar.max ?? bar.high ?? open;
          const low = bar.min ?? bar.low ?? open;
          const close = bar.close ?? open;
          const volume = bar.volume ?? 0;
          csv += `${dateStr},${open},${high},${low},${close},${volume}\n`;
        }

        const outPath = path.join(outputDir, `${symbol}.csv`);
        fs.writeFileSync(outPath, csv, 'utf8');

        done({ symbol, barsCount: data.length, status: 'SUCCESS' });
      });

      chart.onError((err: any) => {
        done({ symbol, barsCount: 0, status: 'ERROR', error: String(err?.message || err) });
      });
    } catch (err: any) {
      done({ symbol, barsCount: 0, status: 'ERROR', error: String(err?.message || err) });
    }
  });
}

async function runExtraction() {
  console.log(`\n================================================================================`);
  console.log(`=== STARTING 1-HOUR INTRADAY EXTRACTION FOR ${tickersList.length} TICKERS ===`);
  console.log(`================================================================================\n`);

  let successCount = 0;
  let emptyCount = 0;
  let failCount = 0;

  // Process in small sequential batches with short delay to preserve WebSocket rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < tickersList.length; i += BATCH_SIZE) {
    const batch = tickersList.slice(i, i + BATCH_SIZE);
    const promises = batch.map((item) => fetchTicker1h(item.symbol));
    const results = await Promise.all(promises);

    for (const res of results) {
      const idx = tickersList.findIndex((t) => t.symbol === res.symbol) + 1;
      const pct = ((idx / tickersList.length) * 100).toFixed(1);

      if (res.status === 'SUCCESS') {
        successCount++;
        console.log(`[${idx.toString().padStart(3, ' ')}/${tickersList.length}] (${pct}%) 🟢 ${res.symbol.padEnd(8, ' ')}: Extracted ${res.barsCount.toString().padStart(5, ' ')} bars`);
      } else if (res.status === 'NO_DATA') {
        emptyCount++;
        console.log(`[${idx.toString().padStart(3, ' ')}/${tickersList.length}] (${pct}%) 🟡 ${res.symbol.padEnd(8, ' ')}: No 1H data available`);
      } else {
        failCount++;
        console.log(`[${idx.toString().padStart(3, ' ')}/${tickersList.length}] (${pct}%) 🔴 ${res.symbol.padEnd(8, ' ')}: Failed (${res.error})`);
      }
    }

    // Brief delay between batches
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n================================================================================`);
  console.log(`=== EXTRACTION COMPLETE ===`);
  console.log(`Successfully Extracted: ${successCount} tickers`);
  console.log(`No Data Available     : ${emptyCount} tickers`);
  console.log(`Failed / Timed Out    : ${failCount} tickers`);
  console.log(`Output Directory      : ${outputDir}`);
  console.log(`================================================================================\n`);
}

runExtraction();
