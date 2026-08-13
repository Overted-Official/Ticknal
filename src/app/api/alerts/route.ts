import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tickerAlerts } from '@/db/schema';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!isValidDeviceId(deviceId)) {
    return NextResponse.json({ error: 'A valid deviceId is required' }, { status: 400 });
  }

  try {
    const rows = await db.select().from(tickerAlerts).where(eq(tickerAlerts.deviceId, deviceId));
    return NextResponse.json({
      alerts: rows.map((alert) => ({
        symbol: alert.tickerSymbol,
        enabled: alert.enabled,
      })),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId : null;
    const symbol = normalizeTickerSymbol(String(body.symbol ?? ''));
    const enabled = body.enabled !== false;

    if (!isValidDeviceId(deviceId) || !symbol) {
      return NextResponse.json({ error: 'deviceId and symbol are required' }, { status: 400 });
    }

    const [alert] = await db
      .insert(tickerAlerts)
      .values({
        deviceId,
        tickerSymbol: symbol,
        enabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tickerAlerts.deviceId, tickerAlerts.tickerSymbol],
        set: {
          enabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      alert: {
        symbol: alert.tickerSymbol,
        enabled: alert.enabled,
      },
    });
  } catch (error) {
    console.error('Error saving alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const symbol = normalizeTickerSymbol(searchParams.get('symbol') ?? '');

  if (!isValidDeviceId(deviceId) || !symbol) {
    return NextResponse.json({ error: 'deviceId and symbol are required' }, { status: 400 });
  }

  try {
    await db
      .delete(tickerAlerts)
      .where(and(eq(tickerAlerts.deviceId, deviceId), eq(tickerAlerts.tickerSymbol, symbol)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function isValidDeviceId(deviceId: string | null): deviceId is string {
  return Boolean(deviceId && /^[a-zA-Z0-9-]{12,64}$/.test(deviceId));
}
