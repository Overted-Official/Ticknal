import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.DATABASE_URL + '?sslmode=require';
const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client);

async function cleanDatabase() {
  console.log('Cleaning database tables...');
  try {
    await db.execute(sql`TRUNCATE TABLE tickers CASCADE;`);
    console.log('Database tables successfully cleaned!');
  } catch (err) {
    console.error('Failed to clean database:', err);
  } finally {
    process.exit(0);
  }
}

cleanDatabase();
