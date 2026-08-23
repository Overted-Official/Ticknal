import Link from 'next/link';
import { connection } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { positions, pushSubscriptions, tickerAlerts } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { getCachedTickers, getCachedRecentPrices } from '@/lib/data-cache';
import SettingsView, {
  type SettingsUserProfile,
  type DeviceInfo,
  type MonitoredTicker,
  type TickerOption
} from '@/components/platform/SettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-auto bg-tv-base text-tv-text items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-medium mb-4">QuantEGX Settings</h2>
        <p className="text-tv-muted mb-6">Please sign in to manage your account profile, devices, and alert triggers.</p>
        <Link href="/" className="btn-token btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  let deviceRows: (typeof pushSubscriptions.$inferSelect)[] = [];
  let openRows: (typeof positions.$inferSelect)[] = [];
  let alertRows: (typeof tickerAlerts.$inferSelect)[] = [];
  let cachedTickers: Awaited<ReturnType<typeof getCachedTickers>> = [];
  let cachedPrices: Array<Record<string, unknown>> = [];

  try {
    const [devRes, openRes, alertRes, tickRes, priceRes] = await Promise.allSettled([
      db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).orderBy(desc(pushSubscriptions.createdAt)),
      db.select().from(positions).where(and(eq(positions.userId, user.id), eq(positions.status, 'OPEN'))),
      db.select().from(tickerAlerts).where(eq(tickerAlerts.userId, user.id)),
      getCachedTickers(),
      getCachedRecentPrices(),
    ]);

    if (devRes.status === 'fulfilled') deviceRows = devRes.value;
    if (openRes.status === 'fulfilled') openRows = openRes.value;
    if (alertRes.status === 'fulfilled') alertRows = alertRes.value;
    if (tickRes.status === 'fulfilled') cachedTickers = tickRes.value;
    if (priceRes.status === 'fulfilled') cachedPrices = priceRes.value;
  } catch (err) {
    console.error('Error loading settings data:', err);
  }

  // Build price map
  const priceMap: Record<string, number> = {};
  for (const row of cachedPrices) {
    if (Number(row.rn) === 1) {
      priceMap[String(row.ticker_symbol)] = Number(row.close);
    }
  }

  // Build ticker metadata map
  const tickerMap: Record<string, { companyName: string; sector: string; logoUrl: string | null }> = {};
  const allTickerOptions: TickerOption[] = [];
  for (const t of cachedTickers) {
    tickerMap[t.symbol] = {
      companyName: t.companyName ?? t.symbol,
      sector: t.sector ?? 'Unclassified',
      logoUrl: t.logoUrl ?? null,
    };
    allTickerOptions.push({
      symbol: t.symbol,
      companyName: t.companyName ?? t.symbol,
      sector: t.sector ?? 'Unclassified',
      logoUrl: t.logoUrl ?? null,
    });
  }

  // Extract Google / OAuth profile details
  const metadata = user.user_metadata ?? {};
  const identityData = user.identities?.[0]?.identity_data ?? {};
  const avatarUrl =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    (typeof identityData.avatar_url === 'string' && identityData.avatar_url) ||
    (typeof identityData.picture === 'string' && identityData.picture) ||
    null;

  const name =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof identityData.full_name === 'string' && identityData.full_name) ||
    (typeof identityData.name === 'string' && identityData.name) ||
    user.email?.split('@')[0] ||
    'Trader';

  const userProfile: SettingsUserProfile = {
    id: user.id,
    email: user.email ?? 'No email provided',
    emailConfirmed: Boolean(user.email_confirmed_at),
    name,
    avatarUrl,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    provider: user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? 'email',
  };

  const devices: DeviceInfo[] = deviceRows.map((d) => ({
    id: d.id,
    endpoint: d.endpoint,
    userAgent: d.userAgent,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  // Build monitored tickers map
  const monitoredMap = new Map<string, MonitoredTicker>();

  // 1. Add all active open positions (auto-monitored)
  for (const pos of openRows) {
    const symbol = pos.tickerSymbol.trim().toUpperCase();
    const qty = Number(pos.quantity);
    const entryPrice = Number(pos.entryPrice);
    const meta = tickerMap[symbol];

    if (monitoredMap.has(symbol)) {
      const existing = monitoredMap.get(symbol)!;
      const totalCost = ((existing.positionAvgEntry ?? 0) * (existing.positionQuantity ?? 0)) + (entryPrice * qty);
      const newQty = (existing.positionQuantity ?? 0) + qty;
      existing.positionQuantity = newQty;
      existing.positionAvgEntry = newQty > 0 ? totalCost / newQty : 0;
    } else {
      monitoredMap.set(symbol, {
        symbol,
        companyName: meta?.companyName ?? symbol,
        sector: meta?.sector ?? 'Unclassified',
        logoUrl: meta?.logoUrl ?? null,
        isPosition: true,
        positionQuantity: qty,
        positionAvgEntry: entryPrice,
        isExplicitAlert: false,
        alertEnabled: true,
        currentPrice: priceMap[symbol],
      });
    }
  }

  // 2. Add or merge explicit alerts
  for (const alert of alertRows) {
    const symbol = alert.tickerSymbol.trim().toUpperCase();
    const meta = tickerMap[symbol];

    if (monitoredMap.has(symbol)) {
      const existing = monitoredMap.get(symbol)!;
      existing.isExplicitAlert = true;
      existing.alertEnabled = alert.enabled;
    } else {
      monitoredMap.set(symbol, {
        symbol,
        companyName: meta?.companyName ?? symbol,
        sector: meta?.sector ?? 'Unclassified',
        logoUrl: meta?.logoUrl ?? null,
        isPosition: false,
        isExplicitAlert: true,
        alertEnabled: alert.enabled,
        currentPrice: priceMap[symbol],
      });
    }
  }

  const monitoredTickers = Array.from(monitoredMap.values()).sort((a, b) => {
    if (a.isPosition && !b.isPosition) return -1;
    if (!a.isPosition && b.isPosition) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <SettingsView
      userProfile={userProfile}
      initialDevices={devices}
      initialMonitoredTickers={monitoredTickers}
      allTickers={allTickerOptions}
    />
  );
}
