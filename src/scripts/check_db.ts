import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

async function checkDb() {
  console.log('Querying database counts...');
  try {
    const tickersCount = await db.execute(sql`SELECT count(*) FROM tickers;`);
    console.log('Total tickers in DB:', tickersCount[0].count);

    const pricesCount = await db.execute(sql`SELECT count(*) FROM daily_prices;`);
    console.log('Total daily prices in DB:', pricesCount[0].count);

    const missingPrices = await db.execute(sql`
      SELECT t.symbol
      FROM tickers t
      LEFT JOIN daily_prices dp ON t.symbol = dp.ticker_symbol
      GROUP BY t.symbol
      HAVING count(dp.id) = 0;
    `);
    console.log('Tickers with 0 prices in DB:', missingPrices.map(r => r.symbol));

    const groupedCounts = await db.execute(sql`
      SELECT ticker_symbol, count(*) as count
      FROM daily_prices
      GROUP BY ticker_symbol
      ORDER BY count DESC
      LIMIT 5;
    `);
    console.log('Top 5 tickers with most rows:', groupedCounts);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

checkDb();
