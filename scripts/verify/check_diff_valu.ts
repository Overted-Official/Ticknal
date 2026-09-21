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

async function checkDiff() {
  const csvPath = path.join(process.cwd(), '_data', 'consolidated_prices_new.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n');

  const csvDates = new Set();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const ticker = parts[0];
    if (ticker === 'VALU') {
      csvDates.add(parts[1]);
    }
  }

  try {
    const dbRows = await db.execute(sql`
      SELECT date
      FROM daily_prices
      WHERE ticker_symbol = 'VALU'
      ORDER BY date ASC;
    `);

    const dbDates = new Set(dbRows.map(r => r.date as string));

    console.log(`VALU in CSV: ${csvDates.size}`);
    console.log(`VALU in DB: ${dbDates.size}`);

    console.log('Dates in DB but NOT in CSV:');
    for (const d of dbDates) {
      if (!csvDates.has(d)) {
        console.log(d);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkDiff();
