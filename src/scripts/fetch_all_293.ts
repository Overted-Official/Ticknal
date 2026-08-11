import fs from 'fs';
import path from 'path';
import TradingView from '@mathieuc/tradingview';

// Read the JSON list of 293 tickers
const tickersJsonPath = path.join(__dirname, 'full_293_tickers.json');
const tickersRaw = fs.readFileSync(tickersJsonPath, 'utf-8');
const tickersList = JSON.parse(tickersRaw);

// Output paths
const pricesCsvPath = path.join(process.cwd(), 'consolidated_prices_new.csv');
const tickersCsvPath = path.join(process.cwd(), 'tickers_new.csv');

// We are resuming from index 172 (MASR)
const START_INDEX = 172;

if (START_INDEX === 0) {
  // Initialize CSVs with headers
  fs.writeFileSync(pricesCsvPath, 'tickerSymbol,date,open,high,low,close,volume\n');
  fs.writeFileSync(tickersCsvPath, 'symbol,companyName,website,exchange,sector,industry\n');
}

// Escape CSV string
function escapeCsv(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Write with retry for EBUSY on Windows
function writeWithRetry(filepath: string, content: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.appendFileSync(filepath, content);
      return;
    } catch (e: any) {
      if (e.code === 'EBUSY' && i < retries - 1) {
        console.warn(`File busy, retrying ${filepath}... (${i + 1}/${retries})`);
        // wait synchronously for 500ms
        const start = Date.now();
        while (Date.now() - start < 500) {}
      } else {
        throw e;
      }
    }
  }
}

// Fetch Metadata (Sector/Industry)
function fetchMetadata(client: any, quoteSession: any, symbol: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      const tvSymbol = `EGX:${symbol}`;
      const market = new quoteSession.Market(tvSymbol);

      const timeout = setTimeout(() => {
        market.close();
        resolve({ sector: '', industry: '' });
      }, 5000);

      market.onData((data: any) => {
        clearTimeout(timeout);
        market.close();
        resolve({ sector: data.sector || '', industry: data.industry || '' });
      });

      market.onError(() => {
        clearTimeout(timeout);
        market.close();
        resolve({ sector: '', industry: '' });
      });
    } catch (e) {
      resolve({ sector: '', industry: '' });
    }
  });
}

// Fetch OHLCV Chart data
function fetchChartData(client: any, symbol: string): Promise<any[]> {
  return new Promise((resolve) => {
    try {
      const tvSymbol = `EGX:${symbol}`;
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: 5000 // 5000 daily bars
      });
      
      const timeout = setTimeout(() => {
        chart.delete();
        resolve([]);
      }, 10000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods || [];
        // sort ascending by time
        data.sort((a, b) => a.time - b.time);
        chart.delete();
        resolve(data);
      });
      
      chart.onError(() => {
        clearTimeout(timeout);
        chart.delete();
        resolve([]);
      });

    } catch(e) {
      resolve([]);
    }
  });
}

async function run() {
  console.log(`Resuming fetch data from index ${START_INDEX}...`);
  
  const client = new TradingView.Client();
  const quoteSession = new client.Session.Quote({
    customFields: ['sector', 'industry']
  });

  let successCount = 0;

  for (let i = START_INDEX; i < tickersList.length; i++) {
    const t = tickersList[i];
    const symbol = t.symbol.replace('.CA', ''); // sanitize
    const companyName = t.companyName || '';
    
    console.log(`[${i + 1}/${tickersList.length}] Fetching data for ${symbol}...`);

    // 1. Fetch metadata
    const meta = await fetchMetadata(client, quoteSession, symbol);
    
    // Append to tickers CSV
    const tickerLine = `${symbol},${escapeCsv(companyName)},,EGX,${escapeCsv(meta.sector)},${escapeCsv(meta.industry)}\n`;
    writeWithRetry(tickersCsvPath, tickerLine);

    // 2. Fetch OHLCV data
    const chartData = await fetchChartData(client, symbol);
    
    if (chartData.length > 0) {
      let pricesCsvLines = '';
      for (const d of chartData) {
        const dateStr = new Date(d.time * 1000).toISOString().split('T')[0];
        pricesCsvLines += `${symbol},${dateStr},${d.open},${d.max},${d.min},${d.close},${d.volume}\n`;
      }
      writeWithRetry(pricesCsvPath, pricesCsvLines);
      console.log(` -> Saved ${chartData.length} records. (Sector: ${meta.sector || 'N/A'})`);
      successCount++;
    } else {
      console.log(` -> No historical data found for ${symbol}.`);
    }

    // Delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  
  quoteSession.delete();
  client.end();
  console.log(`\nFinished! Successfully extracted OHLCV for the remaining tickers.`);
  console.log(`Files updated:\n- ${pricesCsvPath}\n- ${tickersCsvPath}`);
  process.exit(0);
}

run();
