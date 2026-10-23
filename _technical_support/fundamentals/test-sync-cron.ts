import { GET } from '../../src/app/api/cron/sync-fundamentals/route';
import { db } from '../../src/db';
import {
  companyFinancialStatements,
  companyValuationMetrics,
  marketNews,
} from '../../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// Ensure development mode or valid CRON_SECRET for test invocation
if (!process.env.CRON_SECRET) {
  process.env.NODE_ENV = 'development';
}

async function runCronSyncTests() {
  console.log('================================================================');
  console.log('Automated Daily Fundamentals Sync & Earnings Alerts Test Suite');
  console.log('================================================================\n');

  const authHeaders: Record<string, string> = {};
  if (process.env.CRON_SECRET) {
    authHeaders['authorization'] = `Bearer ${process.env.CRON_SECRET}`;
  }

  // -------------------------------------------------------------------------
  // Test 1: Normal Invocation (Delta Sync Scan)
  // -------------------------------------------------------------------------
  console.log('[Test 1] Running standard daily fundamentals sync invocation...');
  const normalReq = new Request('http://localhost:3000/api/cron/sync-fundamentals', {
    method: 'GET',
    headers: authHeaders,
  });

  const normalStart = Date.now();
  const normalRes = await GET(normalReq);
  const normalDuration = Date.now() - normalStart;
  const normalJson = await normalRes.json();

  console.log(`  - Status: ${normalRes.status}`);
  console.log(`  - Response:`, JSON.stringify(normalJson, null, 2));

  if (!normalJson.success) {
    throw new Error(`Test 1 Failed: Expected success=true, received: ${JSON.stringify(normalJson)}`);
  }
  if (typeof normalJson.scannedTickersCount !== 'number' || normalJson.scannedTickersCount <= 0) {
    throw new Error(`Test 1 Failed: Expected positive scannedTickersCount, got: ${normalJson.scannedTickersCount}`);
  }
  if (!Array.isArray(normalJson.updatedTickers)) {
    throw new Error(`Test 1 Failed: Expected updatedTickers array, got: ${typeof normalJson.updatedTickers}`);
  }
  if (typeof normalJson.durationMs !== 'number') {
    throw new Error(`Test 1 Failed: Expected durationMs number, got: ${normalJson.durationMs}`);
  }

  console.log(`  ✓ Scan completed in ${normalJson.durationMs}ms (total roundtrip ${normalDuration}ms)`);
  console.log(`  ✓ Scanned ${normalJson.scannedTickersCount} tickers with ${normalJson.newReportsDetected} new reports detected`);
  console.log('  [PASS] Test 1: Normal invocation verified.\n');

  // -------------------------------------------------------------------------
  // Test 2: Targeted Invocation with ?forceTicker=COMI
  // -------------------------------------------------------------------------
  console.log('[Test 2] Running targeted sync for ?forceTicker=COMI...');
  const targetReq = new Request('http://localhost:3000/api/cron/sync-fundamentals?forceTicker=COMI', {
    method: 'GET',
    headers: authHeaders,
  });

  const targetStart = Date.now();
  const targetRes = await GET(targetReq);
  const targetDuration = Date.now() - targetStart;
  const targetJson = await targetRes.json();

  console.log(`  - Status: ${targetRes.status}`);
  console.log(`  - Response:`, JSON.stringify(targetJson, null, 2));

  if (!targetJson.success) {
    throw new Error(`Test 2 Failed: Expected success=true, received: ${JSON.stringify(targetJson)}`);
  }
  if (!targetJson.updatedTickers.includes('COMI')) {
    throw new Error(`Test 2 Failed: Expected updatedTickers to include 'COMI', got: ${targetJson.updatedTickers}`);
  }

  console.log(`  ✓ Forced sync processed COMI in ${targetJson.durationMs}ms`);

  // Verify DB state for COMI
  console.log('  - Verifying DB persistence for COMI...');

  // 1. Financial statements
  const statements = await db
    .select()
    .from(companyFinancialStatements)
    .where(eq(companyFinancialStatements.symbol, 'COMI'))
    .orderBy(desc(companyFinancialStatements.reportDate))
    .limit(5);

  if (statements.length === 0) {
    throw new Error('Test 2 Failed: No financial statements found for COMI in DB.');
  }
  console.log(`  ✓ Found ${statements.length} latest statements in DB (Latest: ${statements[0].periodType} ${statements[0].fiscalPeriod} ${statements[0].fiscalYear} on ${statements[0].reportDate})`);

  // 2. Valuation metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const valuations = await db
    .select()
    .from(companyValuationMetrics)
    .where(and(eq(companyValuationMetrics.symbol, 'COMI'), eq(companyValuationMetrics.date, todayStr)));

  if (valuations.length === 0) {
    throw new Error(`Test 2 Failed: No valuation metric snapshot found for COMI on ${todayStr}`);
  }
  const val = valuations[0];
  console.log(`  ✓ Valuation snapshot exists for ${val.date}: PE=${val.peRatioTtm ?? 'N/A'}, F-Score=${val.piotroskiFScore ?? 'N/A'}, Z-Score=${val.altmanZScore ?? 'N/A'}`);

  // 3. Market News earnings event
  const newsList = await db
    .select()
    .from(marketNews)
    .where(eq(marketNews.category, 'earnings'))
    .orderBy(desc(marketNews.publishedAt))
    .limit(5);

  const comiEarningsNews = newsList.find((n) => Array.isArray(n.tickers) && n.tickers.includes('COMI'));
  if (!comiEarningsNews) {
    throw new Error('Test 2 Failed: No earnings event found in marketNews for COMI.');
  }
  if (!comiEarningsNews.id.startsWith('earnings-comi-')) {
    throw new Error(`Test 2 Failed: Expected deterministic newsId starting with earnings-comi-, got: ${comiEarningsNews.id}`);
  }
  console.log(`  ✓ Deterministic news ID verified: "${comiEarningsNews.id}"`);
  console.log(`  ✓ Earnings event generated in marketNews: "${comiEarningsNews.title}" [${comiEarningsNews.sentiment.toUpperCase()}]`);
  console.log(`    Summary: "${comiEarningsNews.summary}"`);
  console.log(`  ✓ Alerts generated count: ${targetJson.alertsGenerated}`);

  console.log('  [PASS] Test 2: Targeted delta sync and news emission verified.\n');

  console.log('================================================================');
  console.log('ALL FUNDAMENTALS CRON TESTS PASSED SUCCESSFULLY (Exit Code 0)');
  console.log('================================================================');
  process.exit(0);
}

runCronSyncTests().catch((err) => {
  console.error('\n[FATAL TEST ERROR]:', err);
  process.exit(1);
});
