import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db';
import { signals } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const ticker = 'COMI';
  
  // 1. Read JSON file
  const jsonPath = path.join(__dirname, '../quant_engine/comi_meta_signals.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const signalData = JSON.parse(rawData);
  
  console.log(`Loaded ${signalData.length} signals for ${ticker}`);
  
  // 2. Delete all existing signals for COMI to avoid conflicts/duplicates
  console.log(`Clearing existing signals for ${ticker}...`);
  await db.delete(signals).where(eq(signals.tickerSymbol, ticker));
  
  // 3. Insert new signals
  const insertData = signalData.map((s: any) => ({
    tickerSymbol: ticker,
    date: s.date,
    signal: s.signal,
    confidence: s.confidence.toString(), // numeric in DB
    modelVersion: 'v2-dual-meta'
  }));
  
  if (insertData.length > 0) {
    console.log(`Inserting ${insertData.length} signals into DB...`);
    await db.insert(signals).values(insertData);
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
