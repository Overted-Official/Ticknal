import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { dailyPrices } from '../db/schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require', max: 5 });
const db = drizzle(client);

async function fixSeed() {
  console.log('Fetching existing rows to find what was missed...');
  const pricesPath = path.join(process.cwd(), 'Data', 'consolidated_prices_new.csv');
  const pricesContent = fs.readFileSync(pricesPath, 'utf8').split('\n');
  
  const batchSize = 4000;
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

    if (batch.length === batchSize) {
      batch = []; // we already inserted these, just clear them
    }
  }

  // The leftover items in `batch` are the ones that were missed!
  if (batch.length > 0) {
    console.log(`Found ${batch.length} missed rows. Inserting them now...`);
    try {
      // Chunk them just in case
      for (let j = 0; j < batch.length; j += batchSize) {
        const subBatch = batch.slice(j, j + batchSize);
        await db.insert(dailyPrices).values(subBatch).onConflictDoNothing();
      }
      console.log(`Successfully inserted the missing ${batch.length} rows!`);
    } catch (e: any) {
      console.error('Error inserting missing batch:', e.message);
    }
  } else {
    console.log('No missing rows found!');
  }

  process.exit(0);
}

fixSeed();
