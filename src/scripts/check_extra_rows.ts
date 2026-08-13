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

async function checkExtraRows() {
  const csvPath = path.join(process.cwd(), '_data', 'consolidated_prices_new.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n');

  const csvCounts: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const ticker = line.split(',')[0];
    csvCounts[ticker] = (csvCounts[ticker] || 0) + 1;
  }

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

    const extraTickers = [];
    for (const ticker of Object.keys(dbCounts)) {
      const csvCount = csvCounts[ticker] || 0;
      const dbCount = dbCounts[ticker];
      if (dbCount > csvCount) {
        extraTickers.push({ ticker, diff: dbCount - csvCount, csvCount, dbCount });
      }
    }

    if (extraTickers.length === 0) {
      console.log('No tickers have more rows in DB than CSV.');
    } else {
      console.log(`Found ${extraTickers.length} tickers with EXTRA data in DB!`);
      console.table(extraTickers);
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkExtraRows();
