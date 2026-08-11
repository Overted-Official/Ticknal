import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './src/db/index';
import { orders } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(orders).where(eq(orders.tickerSymbol, 'COMI'));
  console.log(result);
  process.exit(0);
}
main();
