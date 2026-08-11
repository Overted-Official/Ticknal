import { db } from '../db/index';
import { tickers } from '../db/schema';
import TradingView from '@mathieuc/tradingview';
import fs from 'fs';
import path from 'path';

async function generateCsvForTicker(symbol: string, client: any) {
  return new Promise((resolve, reject) => {
    try {
      const tvSymbol = `EGX:${symbol.replace('.CA', '')}`; // Ensure proper TV format (e.g. EGX:COMI)
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: 5000 // 5000 daily bars
      });
      
      // Safety timeout in case TradingView hangs or symbol is invalid
      const timeout = setTimeout(() => {
        console.error(`Timeout fetching data for ${symbol}`);
        chart.delete();
        resolve(false);
      }, 10000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods;
        if (data && data.length > 0) {
          const csvLines = ['date,open,high,low,close,volume'];
          // data is usually sorted newest to oldest or oldest to newest depending on the lib
          // Actually mathieuc/tradingview returns newest to oldest based on index?
          // Wait, time is unix timestamp. Let's just sort it ascending.
          data.sort((a, b) => a.time - b.time);
          
          for (const d of data) {
            const dateStr = new Date(d.time * 1000).toISOString().split('T')[0];
            csvLines.push(`${dateStr},${d.open},${d.max},${d.min},${d.close},${d.volume}`);
          }
          
          const dir = path.join(process.cwd(), 'data');
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
          
          fs.writeFileSync(path.join(dir, `${symbol}.csv`), csvLines.join('\n'));
          console.log(`Saved ${data.length} records for ${symbol}`);
        } else {
          console.log(`No data received for ${symbol}`);
        }
        
        chart.delete();
        resolve(true);
      });
      
      chart.onError((err: any) => {
        clearTimeout(timeout);
        console.error(`Error for ${symbol}:`, err.message || err);
        chart.delete();
        resolve(false);
      });

    } catch(e) {
      console.error(e);
      resolve(false);
    }
  });
}

async function run() {
  console.log('Fetching all tickers from database...');
  const allTickers = await db.select().from(tickers);
  console.log(`Found ${allTickers.length} tickers.`);
  
  const client = new TradingView.Client();
  
  for (const t of allTickers) {
    console.log(`Fetching data for ${t.symbol}...`);
    await generateCsvForTicker(t.symbol, client);
    // Add a small delay between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  client.end();
  console.log('Finished generating CSV files.');
  process.exit(0);
}

run();
