import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import TradingView from '@mathieuc/tradingview';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { tickers, dailyPrices } from '../db/schema';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

const macroAssets = [
  { tvSymbol: 'COMEX:GC1!', dbSymbol: 'GC1!', name: 'Gold Futures', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals' },
  { tvSymbol: 'COMEX:SI1!', dbSymbol: 'SI1!', name: 'Silver Futures', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals' },
  { tvSymbol: 'FX_IDC:USDEGP', dbSymbol: 'USDEGP', name: 'USD to EGP', exchange: 'FX_IDC', sector: 'Macro', industry: 'Forex' }
];

// Output paths for appending
const pricesCsvPath = path.join(process.cwd(), '_playground', '_random', 'consolidated_prices_new.csv');
const tickersCsvPath = path.join(process.cwd(), '_playground', '_random', 'tickers_new.csv');

async function run() {
  const tvClient = new TradingView.Client();

  for (const asset of macroAssets) {
    console.log(`\nProcessing ${asset.dbSymbol}...`);

    // 1. Insert Ticker into DB
    try {
      await db.insert(tickers).values({
        symbol: asset.dbSymbol, // Fixed key: symbol, not tickerSymbol
        companyName: asset.name,
        exchange: asset.exchange,
        sector: asset.sector,
        industry: asset.industry
      }).onConflictDoNothing();
      console.log(`Inserted ticker ${asset.dbSymbol} into DB.`);
    } catch (e: any) {
      console.error(`Failed to insert ticker ${asset.dbSymbol}:`, e.message);
    }

    // 1.5. Append Ticker to CSV
    const tickerLine = `\n${asset.dbSymbol},${asset.name},,${asset.exchange},${asset.sector},${asset.industry}`;
    fs.appendFileSync(tickersCsvPath, tickerLine);

    // 2. Fetch Chart Data
    console.log(`Fetching 5000 bars for ${asset.tvSymbol}...`);
    const chartData: any[] = await new Promise(resolve => {
      const chart = new tvClient.Session.Chart();
      chart.setMarket(asset.tvSymbol, { timeframe: 'D', range: 5000 });
      
      const timeout = setTimeout(() => {
        chart.delete();
        resolve([]);
      }, 10000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods || [];
        data.sort((a: any, b: any) => a.time - b.time);
        chart.delete();
        resolve(data);
      });

      chart.onError(() => {
        clearTimeout(timeout);
        chart.delete();
        resolve([]);
      });
    });

    if (chartData.length > 0) {
      // 3. Format Data
      const batch = [];
      let csvLines = '';

      for (const d of chartData) {
        const dateStr = new Date(d.time * 1000).toISOString().split('T')[0];
        
        // Push to DB batch
        batch.push({
          tickerSymbol: asset.dbSymbol,
          date: dateStr,
          open: d.open.toString(),
          high: d.max.toString(),
          low: d.min.toString(),
          close: d.close.toString(),
          volume: (d.volume || 0).toString(),
        });

        // Append to CSV lines
        csvLines += `${asset.dbSymbol},${dateStr},${d.open},${d.max},${d.min},${d.close},${d.volume || 0}\n`;
      }

      // 4. Insert into DB (Batching 4000 at a time)
      console.log(`Inserting ${batch.length} rows into DB...`);
      for (let j = 0; j < batch.length; j += 4000) {
        const subBatch = batch.slice(j, j + 4000);
        try {
          await db.insert(dailyPrices).values(subBatch).onConflictDoNothing();
        } catch (e: any) {
          console.error(`Failed to insert batch:`, e.message);
        }
      }

      // 5. Append to CSV
      fs.appendFileSync(pricesCsvPath, csvLines);
      console.log(`Successfully seeded ${chartData.length} bars for ${asset.dbSymbol}.`);
      
    } else {
      console.log(`No data found for ${asset.tvSymbol}.`);
    }

    // Delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  tvClient.end();
  console.log(`\nFinished! Macro data successfully extracted and seeded.`);
  process.exit(0);
}

run();
