import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(':5432', ':6543');
}
import { db } from '../db/index';
import { tickers, dailyPrices } from '../db/schema';

async function seed() {
  const symbol = 'CI_QUANT';
  
  // Insert ticker
  await db.insert(tickers).values({
    symbol,
    companyName: 'CI The Quant Fund',
    exchange: 'EGX',
    sector: 'Fund',
    industry: 'Fund',
  }).onConflictDoNothing();

  const csvPath = path.resolve(process.cwd(), 'quant_fund_prices.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.trim().split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split(',');
    const dateStr = parts[0]; // M/D/YYYY
    const price = parseFloat(parts[1]);
    
    // Convert M/D/YYYY to YYYY-MM-DD
    const dateParts = dateStr.split('/');
    const month = dateParts[0].padStart(2, '0');
    const day = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    const formattedDate = `${year}-${month}-${day}`;
    
    await db.insert(dailyPrices).values({
      tickerSymbol: symbol,
      date: formattedDate,
      open: price.toString(),
      high: price.toString(),
      low: price.toString(),
      close: price.toString(),
      volume: '0',
    }).onConflictDoNothing();
  }
  
  console.log('Done seeding CI The Quant Fund');
  process.exit(0);
}

seed().catch(console.error);
