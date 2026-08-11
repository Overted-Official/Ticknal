import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { dailyPrices } from '../src/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

async function test() {
  console.log('Testing connection to Supabase database...');
  try {
    const data = await db.select({
      tickerSymbol: dailyPrices.tickerSymbol,
      date: dailyPrices.date,
      close: dailyPrices.close,
      volume: dailyPrices.volume
    })
    .from(dailyPrices)
    .where(inArray(dailyPrices.tickerSymbol, ['COMI', 'ISPH', 'ADIB']))
    .orderBy(desc(dailyPrices.date))
    .limit(15);
    
    console.log('\n--- Random Sample of Recently Seeded Data ---');
    console.table(data);
    
  } catch (err) {
    console.error('Database connection failed:', err);
  }
  process.exit(0);
}
test();
