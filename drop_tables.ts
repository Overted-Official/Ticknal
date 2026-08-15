import { sql } from 'drizzle-orm';
import { db } from './src/db';

async function main() {
  console.log('Dropping conflicting tables...');
  await db.execute(sql`DROP TABLE IF EXISTS "orders" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "strategy_signals" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "ticker_alerts" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "signal_notifications" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "push_subscriptions" CASCADE;`);
  console.log('Done dropping tables. Now drizzle-kit push should run cleanly.');
  process.exit(0);
}

main().catch(console.error);
