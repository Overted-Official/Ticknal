import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

async function checkCiebDb() {
  console.log('Querying database for CIEB dates...');
  try {
    const dates = await db.execute(sql`
      SELECT date
      FROM daily_prices
      WHERE ticker_symbol = 'CIEB'
      ORDER BY date ASC;
    `);

    if (dates.length === 0) {
      console.log('No data found for CIEB in DB.');
    } else {
      console.log(`Found ${dates.length} rows for CIEB in DB.`);
      console.log(`First date: ${dates[0].date}`);
      console.log(`Last date: ${dates[dates.length - 1].date}`);
      
      let previousYear = parseInt(dates[0].date.split('-')[0]);
      let gapFound = false;
      for (let i = 1; i < dates.length; i++) {
        const currentYear = parseInt(dates[i].date.split('-')[0]);
        if (currentYear > previousYear + 1) {
          console.log(`Gap found in DB! Jumps from ${dates[i-1].date} to ${dates[i].date}`);
          gapFound = true;
        }
        previousYear = currentYear;
      }
      if (!gapFound) {
        console.log('No multi-year gaps found in DB!');
      }
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

checkCiebDb();
