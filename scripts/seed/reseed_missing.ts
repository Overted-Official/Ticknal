import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { dailyPrices } from '../db/schema';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

async function reseedMissing() {
  console.log('Extracting missing tickers from local CSV...');
  const csvPath = path.join(process.cwd(), '_data', 'consolidated_prices_new.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n');

  const targetTickers = ['CIEB', 'CIRA', 'DSCW', 'DTPP'];
  const batchSize = 4000;
  let batch = [];
  let totalInserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const ticker = line.split(',')[0];
    if (!targetTickers.includes(ticker)) continue;

    const cols = line.split(',');
    if (cols.length >= 7) {
      batch.push({
        tickerSymbol: cols[0],
        date: cols[1],
        open: cols[2] || '0',
        high: cols[3] || '0',
        low: cols[4] || '0',
        close: cols[5] || '0',
        volume: cols[6] || '0',
      });
    }

    if (batch.length === batchSize) {
      try {
        await db.insert(dailyPrices).values(batch).onConflictDoNothing();
        totalInserted += batch.length;
        console.log(`Pushed batch of ${batch.length}...`);
      } catch (e: any) {
        console.error('Error inserting batch:', e.message);
      }
      batch = [];
    }
  }

  // Insert remaining rows
  if (batch.length > 0) {
    try {
      await db.insert(dailyPrices).values(batch).onConflictDoNothing();
      totalInserted += batch.length;
      console.log(`Pushed final batch of ${batch.length}...`);
    } catch (e: any) {
      console.error('Error inserting final batch:', e.message);
    }
  }

  console.log(`Finished! Processed ${totalInserted} rows for the missing tickers.`);
  process.exit(0);
}

reseedMissing();
