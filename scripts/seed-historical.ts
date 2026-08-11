import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../src/db';
import { tickers, dailyPrices } from '../src/db/schema';
import fs from 'fs';
import path from 'path';

// Helper for rate limiting
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function seed() {
  const { default: YahooFinance } = await import('yahoo-finance2');
  const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

  console.log('Reading symbols from JSON...');
  const symbolsPath = path.join(process.cwd(), 'Data', 'symbols.json');
  const EGX_TICKERS = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));

  console.log('Seeding tickers...');
  for (const t of EGX_TICKERS) {
    const symbolWithExt = t.symbol.includes('.') ? t.symbol : `${t.symbol}.CA`;
    await db.insert(tickers)
      .values({
        symbol: t.symbol,
        companyName: t.companyName,
        exchange: 'EGX'
      })
      .onConflictDoNothing();
  }

  const period1Str = '2000-01-01';

  for (const t of EGX_TICKERS) {
    const symbolWithExt = t.symbol.includes('.') ? t.symbol : `${t.symbol}.CA`;
    console.log(`\nFetching historical data for ${symbolWithExt}...`);
    try {
      const result = await yahooFinance.chart(symbolWithExt, { period1: period1Str });
      if (result && result.quotes && result.quotes.length > 0) {
        console.log(`Fetched ${result.quotes.length} days of data for ${symbolWithExt}. Inserting...`);
        
        const priceData = result.quotes
          .filter(q => q.close !== null)
          .map(q => ({
            tickerSymbol: t.symbol,
            date: q.date.toISOString().split('T')[0],
            open: q.open?.toString() || '0',
            high: q.high?.toString() || '0',
            low: q.low?.toString() || '0',
            close: q.close?.toString() || '0',
            volume: q.volume?.toString() || '0'
          }));

        // Batch insert in chunks of 50 to avoid any query size limits
        for (let i = 0; i < priceData.length; i += 50) {
          const chunk = priceData.slice(i, i + 50);
          await db.insert(dailyPrices)
            .values(chunk)
            .onConflictDoNothing(); // Skip if date already exists for ticker
        }
        
        console.log(`Successfully seeded ${t.symbol}.`);
      } else {
        console.log(`No data returned for ${symbolWithExt}`);
      }
    } catch (error) {
      console.log(`Error fetching ${symbolWithExt}:`, (error as Error).message);
    }
    
    // Rate limit to avoid Yahoo Finance ban
    await delay(1000);
  }

  console.log('\nSeeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
