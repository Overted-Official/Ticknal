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

async function finalVerification() {
  console.log('--- FINAL DATABASE VERIFICATION ---');
  
  // 1. Count CSV Rows
  const csvPath = path.join(process.cwd(), '_data', 'consolidated_prices_new.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n');
  let csvDataRowCount = 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      csvDataRowCount++;
    }
  }

  // 2. Count DB Rows
  try {
    const dbRows = await db.execute(sql`
      SELECT count(*) as count
      FROM daily_prices;
    `);
    
    const dbDataRowCount = parseInt(dbRows[0].count as string, 10);

    console.log(`\nTotal Valid Data Rows in Local CSV:  ${csvDataRowCount}`);
    console.log(`Total Valid Data Rows in Supabase:   ${dbDataRowCount}`);

    if (csvDataRowCount === dbDataRowCount) {
      console.log('\n[SUCCESS] The local CSV and the remote database match perfectly down to the exact row.');
    } else {
      console.log(`\n[WARNING] There is a difference of ${csvDataRowCount - dbDataRowCount} rows.`);
    }

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

finalVerification();
