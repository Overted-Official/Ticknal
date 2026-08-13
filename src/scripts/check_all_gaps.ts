import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

async function checkAllGaps() {
  console.log('Reading local CSV counts...');
  const csvPath = path.join(process.cwd(), '_data', 'consolidated_prices_new.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n');

  const csvCounts: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const ticker = line.split(',')[0];
    csvCounts[ticker] = (csvCounts[ticker] || 0) + 1;
  }

  console.log('Querying DB counts...');
  try {
    const dbRows = await db.execute(sql`
      SELECT ticker_symbol, count(*) as count
      FROM daily_prices
      GROUP BY ticker_symbol;
    `);

    const dbCounts: Record<string, number> = {};
    for (const r of dbRows) {
      dbCounts[r.ticker_symbol as string] = parseInt(r.count as string, 10);
    }

    const missingTickers = [];
    let totalMissingRows = 0;

    for (const ticker of Object.keys(csvCounts)) {
      const csvCount = csvCounts[ticker];
      const dbCount = dbCounts[ticker] || 0;
      if (dbCount < csvCount) {
        const diff = csvCount - dbCount;
        missingTickers.push({ ticker, diff, csvCount, dbCount });
        totalMissingRows += diff;
      }
    }

    if (missingTickers.length === 0) {
      console.log('No discrepancies found! Local CSV and DB are 100% aligned.');
    } else {
      console.log(`Found ${missingTickers.length} tickers with missing data in the DB!`);
      console.log(`Total missing rows across all tickers: ${totalMissingRows}`);
      console.table(missingTickers);
    }

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

checkAllGaps();
