import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { tickers, dailyPrices } from '../db/schema';
import { sql } from 'drizzle-orm';

// Connect with SSL
const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require', max: 5 });
const db = drizzle(client);

async function seed() {
  console.log('Cleaning existing tables...');
  await db.execute(sql`TRUNCATE TABLE tickers CASCADE;`);
  
  console.log('Seeding tickers...');
  const tickersPath = path.join(process.cwd(), 'Data', 'tickers_new.csv');
  const tickersContent = fs.readFileSync(tickersPath, 'utf8').split('\n');
  
  const tickersData = [];
  for (let i = 1; i < tickersContent.length; i++) {
    const line = tickersContent[i].trim();
    if (!line) continue;
    
    // Simple CSV parse handling commas in quotes
    const cols = [];
    let cur = '';
    let inQuote = false;
    for(let j=0; j<line.length; j++) {
      if(line[j] === '"') inQuote = !inQuote;
      else if(line[j] === ',' && !inQuote) {
        cols.push(cur);
        cur = '';
      } else {
        cur += line[j];
      }
    }
    cols.push(cur);

    if (cols.length >= 6) {
      tickersData.push({
        symbol: cols[0],
        companyName: cols[1] || null,
        website: cols[2] || null,
        exchange: cols[3] || 'EGX',
        sector: cols[4] || null,
        industry: cols[5] || null,
      });
    }
  }

  // Insert tickers in one go (293 records is tiny)
  if (tickersData.length > 0) {
    await db.insert(tickers).values(tickersData).onConflictDoNothing();
    console.log(`Successfully seeded ${tickersData.length} tickers.`);
  }

  console.log('Seeding daily prices... This will take a moment.');
  const pricesPath = path.join(process.cwd(), 'Data', 'consolidated_prices_new.csv');
  const pricesContent = fs.readFileSync(pricesPath, 'utf8').split('\n');
  
  const batchSize = 4000; // 4000 rows * 7 columns = 28,000 parameters (under Postgres 65k limit)
  let batch = [];
  let totalInserted = 0;

  for (let i = 1; i < pricesContent.length; i++) {
    const line = pricesContent[i].trim();
    if (!line) continue;
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

    if (batch.length === batchSize || i === pricesContent.length - 1) {
      if (batch.length > 0) {
        try {
          await db.insert(dailyPrices).values(batch).onConflictDoNothing();
          totalInserted += batch.length;
          console.log(`Inserted ${totalInserted} / ${pricesContent.length - 1} rows...`);
        } catch (e: any) {
          console.error(`Error inserting batch at row ${i}:`, e.message);
        }
        batch = [];
      }
    }
  }

  console.log(`\nFinished! Successfully seeded ${totalInserted} daily prices.`);
  process.exit(0);
}

seed();
