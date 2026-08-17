import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, systemLogs, macroInflationRates } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';
import { verifyCronAuth } from '@/lib/cron-auth';

async function triggerEndpoint(endpoint: string, host: string, secret: string) {
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const url = `${protocol}://${host}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'authorization': `Bearer ${secret}` }
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to trigger ${endpoint}:`, err);
    return false;
  }
}

export async function GET(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const cronSecret = process.env.CRON_SECRET!;
  const host = req.headers.get('host') || 'localhost:3000';
  
  try {
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now);
    const isWeekend = now.getDay() === 5 || now.getDay() === 6; // 5=Fri, 6=Sat

    if (isWeekend) {
      return NextResponse.json({ message: 'Weekend, watchdog skipping.' }, { status: 200 });
    }

    const maxDates = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        maxDate: sql<string>`MAX(${dailyPrices.date})`,
      })
      .from(dailyPrices)
      .groupBy(dailyPrices.tickerSymbol);

    let stocksMissing = false;
    let fundsMissing = false;

    for (const row of maxDates) {
      if (!row.tickerSymbol || !row.maxDate) continue;
      
      if (row.maxDate < todayStr) {
        if (row.tickerSymbol === 'CI_QUANT' || row.tickerSymbol === 'OSOUL') {
          fundsMissing = true;
        } else {
          stocksMissing = true;
        }
      }
    }

    // Macro Inflation Check
    let macroMissing = false;
    const latestMacro = await db.select().from(macroInflationRates).orderBy(desc(macroInflationRates.yearMonth)).limit(1);
    if (latestMacro.length > 0) {
      const latestYm = latestMacro[0].yearMonth;
      const [year, month] = latestYm.split('-');
      const latestDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const diffMonths = (now.getFullYear() - latestDate.getFullYear()) * 12 + (now.getMonth() - latestDate.getMonth());
      if (diffMonths > 2) {
        macroMissing = true;
      }
    } else {
      macroMissing = true;
    }

    let retryLog = [];

    // Trigger missing data pipelines
    if (stocksMissing) {
      retryLog.push('Triggered update-stocks');
      for (let i=0; i<3; i++) {
        const ok = await triggerEndpoint('/api/cron/update-stocks', host, cronSecret);
        if (ok) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (fundsMissing) {
      retryLog.push('Triggered update-funds');
      for (let i=0; i<3; i++) {
        const ok = await triggerEndpoint('/api/cron/update-funds', host, cronSecret);
        if (ok) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (macroMissing) {
      retryLog.push('Triggered update-macro');
      for (let i=0; i<3; i++) {
        const ok = await triggerEndpoint('/api/cron/update-macro', host, cronSecret);
        if (ok) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (retryLog.length > 0) {
      await db.insert(systemLogs).values({
        source: 'watchdog',
        level: 'WARNING',
        message: `Detected missing data for today (${todayStr}). Initiated retries.`,
        metadata: { actions: retryLog }
      });
      return NextResponse.json({ message: 'Watchdog executed retries', actions: retryLog }, { status: 200 });
    }

    await db.insert(systemLogs).values({
      source: 'watchdog',
      level: 'INFO',
      message: `All system data is up to date for ${todayStr}.`,
    });

    return NextResponse.json({ message: 'All data up to date' }, { status: 200 });

  } catch (error) {
    console.error('Watchdog error:', error);
    await db.insert(systemLogs).values({
      source: 'watchdog',
      level: 'ERROR',
      message: 'Watchdog encountered an internal error',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
