import fs from 'fs';
import path from 'path';
import { db } from '../db/index';
import { intradayCandles, tickers } from '../db/schema';
import { sql } from 'drizzle-orm';

const inputDir = path.resolve(__dirname, '../../_playground/QE-V1-Upgrade/_dataset/Intraday/1h');

async function seedIntradayCandles() {
  console.log(`Starting 1H Intraday Candles Database Seeder...`);
  console.log(`Reading 1H CSV files from: ${inputDir}`);

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.csv'));
  console.log(`Found ${files.length} CSV files to process.`);

  // Get known tickers from DB to avoid foreign key errors on unseeded tickers
  const dbTickers = await db.select({ symbol: tickers.symbol }).from(tickers);
  const knownSymbols = new Set(dbTickers.map((t) => t.symbol.toUpperCase()));
  console.log(`Found ${knownSymbols.size} registered tickers in database.`);

  let totalInserted = 0;
  let skippedTickers = 0;

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const file = files[fileIdx];
    const symbol = file.replace('.csv', '').toUpperCase();

    if (!knownSymbols.has(symbol)) {
      skippedTickers++;
      continue;
    }

    const filePath = path.join(inputDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) continue;

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dateIdx = headers.findIndex((h) => h === 'datetime' || h === 'date' || h === 'time');
    const openIdx = headers.indexOf('open');
    const highIdx = headers.indexOf('high');
    const lowIdx = headers.indexOf('low');
    const closeIdx = headers.indexOf('close');
    const volIdx = headers.indexOf('volume');

    const candleBatch: Array<{
      tickerSymbol: string;
      timeframe: string;
      timestamp: Date;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 5) continue;
      const dateStr = parts[dateIdx];
      const o = parts[openIdx];
      const h = parts[highIdx];
      const l = parts[lowIdx];
      const c = parts[closeIdx];
      const v = volIdx >= 0 ? parts[volIdx] : '0';

      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;

      candleBatch.push({
        tickerSymbol: symbol,
        timeframe: '1h',
        timestamp: d,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v || '0',
      });
    }

    if (candleBatch.length === 0) continue;

    // Chunked insert (500 rows at a time)
    const CHUNK_SIZE = 500;
    for (let c = 0; c < candleBatch.length; c += CHUNK_SIZE) {
      const chunk = candleBatch.slice(c, c + CHUNK_SIZE);
      try {
        await db.insert(intradayCandles).values(chunk).onConflictDoNothing();
      } catch (err: any) {
        console.error(`Error inserting chunk for ${symbol}:`, err?.message || err);
      }
    }

    totalInserted += candleBatch.length;
    if ((fileIdx + 1) % 25 === 0 || fileIdx === files.length - 1) {
      console.log(`[${fileIdx + 1}/${files.length}] Processed ${symbol} (${candleBatch.length} bars) | Total Processed: ${totalInserted}`);
    }
  }

  console.log(`\n================================================================================`);
  console.log(`=== SEEDING COMPLETE ===`);
  console.log(`Total 1H Candles Processed: ${totalInserted}`);
  console.log(`Skipped Tickers (not in DB tickers table): ${skippedTickers}`);
  console.log(`================================================================================\n`);
}

seedIntradayCandles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
