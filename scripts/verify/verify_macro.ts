import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

async function verifyMacro() {
  try {
    const dbRows = await db.execute(sql`
      SELECT ticker_symbol, count(*), min(date), max(date)
      FROM daily_prices
      WHERE ticker_symbol IN ('GC1!', 'SI1!', 'USDEGP')
      GROUP BY ticker_symbol;
    `);

    console.table(dbRows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

verifyMacro();
