import { db } from '../db/index';
import { tickers } from '../db/schema';
import { eq } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';

// Helper to fetch sector metadata for one symbol using a promise
function fetchMetadata(client: any, quoteSession: any, symbol: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      const tvSymbol = `EGX:${symbol.replace('.CA', '')}`;
      const market = new quoteSession.Market(tvSymbol);

      const timeout = setTimeout(() => {
        market.close();
        resolve(null);
      }, 5000);

      market.onData((data: any) => {
        clearTimeout(timeout);
        market.close();
        resolve(data);
      });

      market.onError((err: any) => {
        clearTimeout(timeout);
        market.close();
        console.error(`Error for ${symbol}:`, err.message || err);
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

async function run() {
  console.log('Fetching all tickers from database...');
  const allTickers = await db.select().from(tickers);
  console.log(`Found ${allTickers.length} tickers.`);

  const client = new TradingView.Client();
  const quoteSession = new client.Session.Quote({
    customFields: ['sector', 'industry', 'description', 'type']
  });

  let updatedCount = 0;

  for (const t of allTickers) {
    console.log(`Fetching metadata for ${t.symbol}...`);
    const data = await fetchMetadata(client, quoteSession, t.symbol);

    if (data && data.sector) {
      await db.update(tickers)
        .set({
          sector: data.sector,
          industry: data.industry || null,
        })
        .where(eq(tickers.symbol, t.symbol));
        
      console.log(`Updated ${t.symbol} -> Sector: ${data.sector} | Industry: ${data.industry}`);
      updatedCount++;
    } else {
      console.log(`No sector data found for ${t.symbol}`);
    }

    // Sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  quoteSession.delete();
  client.end();
  console.log(`Finished updating ${updatedCount} tickers.`);
  process.exit(0);
}

run();
