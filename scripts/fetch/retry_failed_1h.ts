import fs from 'fs';
import path from 'path';
import TradingView from '@mathieuc/tradingview';

const outputDir = path.resolve(__dirname, '../../_playground/QE-V1-Upgrade/_dataset/Intraday/1h');
const tickersJsonPath = path.join(__dirname, 'full_293_tickers.json');
const tickersList: { symbol: string; companyName: string }[] = JSON.parse(fs.readFileSync(tickersJsonPath, 'utf-8'));

const existingFiles = new Set(
  fs.readdirSync(outputDir).filter((f) => f.endsWith('.csv')).map((f) => f.replace('.csv', ''))
);

const missingTickers = tickersList.filter((t) => !existingFiles.has(t.symbol));

console.log(`\nFound ${missingTickers.length} missing / failed tickers to retry.`);

function fetchSingleTicker(symbol: string): Promise<boolean> {
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

    const done = (success: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(success);
    };

    try {
      client = new TradingView.Client();
      const tvSymbol = `EGX:${symbol}`;
      chart = new client.Session.Chart();

      chart.setMarket(tvSymbol, {
        timeframe: '60',
        range: 5000,
      });

      timeoutId = setTimeout(() => {
        done(false);
      }, 20000);

      chart.onUpdate(() => {
        const data = chart.periods || [];
        if (!data || data.length === 0) return;

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
        done(true);
      });

      chart.onError(() => {
        done(false);
      });
    } catch {
      done(false);
    }
  });
}

async function runRetry() {
  let recovered = 0;
  for (let i = 0; i < missingTickers.length; i++) {
    const t = missingTickers[i];
    process.stdout.write(`[${i + 1}/${missingTickers.length}] Retrying ${t.symbol}... `);
    const ok = await fetchSingleTicker(t.symbol);
    if (ok) {
      recovered++;
      console.log(`🟢 Success!`);
    } else {
      console.log(`🔴 Still unavailable on TradingView`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  const finalCount = fs.readdirSync(outputDir).filter((f) => f.endsWith('.csv')).length;
  console.log(`\nRetry finished. Total 1H CSV Files in ${outputDir}: ${finalCount}/${tickersList.length}`);
}

runRetry();
