import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';

// Helper for rate limiting
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function run() {
  const { default: YahooFinance } = await import('yahoo-finance2');
  const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

  const dataDir = path.join(process.cwd(), 'Data');
  const symbolsPath = path.join(dataDir, 'symbols.json');
  const tickersCsvPath = path.join(dataDir, 'tickers.csv');
  const dailyPricesCsvPath = path.join(dataDir, 'daily_prices.csv');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Initialize CSVs with headers
  fs.writeFileSync(tickersCsvPath, 'symbol,company_name,exchange\n', 'utf8');
  fs.writeFileSync(dailyPricesCsvPath, 'ticker_symbol,date,open,high,low,close,volume\n', 'utf8');

  console.log('Reading symbols from JSON...');
  const EGX_TICKERS = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));

  console.log('Writing tickers to CSV...');
  for (const t of EGX_TICKERS) {
    const symbolClean = t.symbol;
    const nameClean = (t.companyName || '').replace(/,/g, ''); // strip commas for CSV
    fs.appendFileSync(tickersCsvPath, `${symbolClean},${nameClean},EGX\n`, 'utf8');
  }

  const period1Str = '2000-01-01';

  for (const t of EGX_TICKERS) {
    const symbolWithExt = t.symbol.includes('.') ? t.symbol : `${t.symbol}.CA`;
    console.log(`\nFetching historical data for ${symbolWithExt}...`);
    try {
      const result = await yahooFinance.chart(symbolWithExt, { period1: period1Str });
      if (result && result.quotes && result.quotes.length > 0) {
        let csvRows = '';
        for (const q of result.quotes) {
          if (q.close === null) continue;
          
          const date = q.date.toISOString().split('T')[0];
          const open = q.open || 0;
          const high = q.high || 0;
          const low = q.low || 0;
          const close = q.close || 0;
          const volume = q.volume || 0;

          csvRows += `${t.symbol},${date},${open},${high},${low},${close},${volume}\n`;
        }

        fs.appendFileSync(dailyPricesCsvPath, csvRows, 'utf8');
        console.log(`Fetched ${result.quotes.length} days of data for ${symbolWithExt}. Saved to CSV.`);
      } else {
        console.log(`No data returned for ${symbolWithExt}`);
      }
    } catch (error) {
      console.log(`Error fetching ${symbolWithExt}:`, (error as Error).message);
    }
    
    // Rate limit to avoid Yahoo Finance ban
    await delay(1000);
  }

  console.log('\nCSV Export completed!');
}

run().catch(console.error);
