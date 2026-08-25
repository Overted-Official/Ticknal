import { NextResponse } from 'next/server';

export const maxDuration = 60;

import {
  handleAlertsGet,
  handleAlertsPost,
  handleAlertsDelete,
  handlePreferencesGet,
  handlePreferencesPost,
} from '@/lib/alerts-handlers';
import {
  handleAccountsGet,
  handleAccountsPost,
  handleAccountsPut,
  handleAccountsDelete,
  handleListGet,
  handleSnapshotsGet,
  handleSnapshotsPost,
  handleTransactionsGet,
  handleTransactionsPost,
  handleTransactionsDelete,
} from '@/lib/banks-handlers';
import {
  handleUpdateStocks,
  handleUpdateFunds,
  handleUpdateCommodities,
  handleUpdateMacro,
  handleProcessSignals,
  handleSignals as handleCronSignals,
  handleWatchdog,
} from '@/lib/cron-handlers';
import {
  handleQuoteGet,
  handleTickersGet,
  handleInflationGet,
} from '@/lib/market-handlers';
import {
  handleNotificationsGet,
  handleNotificationsDelete,
  handleCheckNotifications,
  handleTestNotification,
} from '@/lib/notifications-handlers';
import {
  handleSubscribeGet,
  handleSubscribePost,
  handleSubscribeDelete,
  handleVapidKeyGet,
} from '@/lib/push-handlers';
import {
  handlePerformanceGet,
  handleSignalsGet as handleSectorSignalsGet,
} from '@/lib/sectors-handlers';
import {
  handleSignalsGet,
  handleMetricsGet,
  handleLevelsGet,
  handleReportGet,
  handlePredictPost,
} from '@/lib/strategy-handlers';
import {
  handlePositionsGet,
  handlePositionsPost,
  handlePositionsPatch,
  handlePositionsDelete,
  handleAvatarPost,
  handleSystemLogsGet,
} from '@/lib/user-handlers';
import {
  handleBotStatusGet,
  handleBotSettingsPost,
  handleBotTickersGet,
  handleBotTickerTogglePost,
  handleBotTickerBudgetPost,
  handleBotPositionClosePost,
  handleBotActivityGet,
  handleBotTradesGet,
  handleBotSystemLogsGet,
} from '@/lib/intraday-bot-handlers';

import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getPathSegments(slug?: string[]): string[] {
  return (slug || []).map((s) => s.toLowerCase());
}

// ----------------------------------------------------
// GET HANDLER
// ----------------------------------------------------
export async function GET(req: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const segments = getPathSegments(slug);
  const root = segments[0] || '';
  const sub = segments[1] || '';

  // 0. Auth Callback
  if (root === 'auth' && sub === 'callback') {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const isLocalEnv = process.env.NODE_ENV === 'development';

    let siteOrigin = requestUrl.origin;
    if (!isLocalEnv && forwardedHost) {
      siteOrigin = `${forwardedProto}://${forwardedHost}`;
    }

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const destination = next.startsWith('/') ? next : `/${next}`;
        return NextResponse.redirect(new URL(destination, siteOrigin).toString());
      }
    }
    return NextResponse.redirect(new URL('/?error=auth', siteOrigin).toString());
  }

  // 1. Cron
  if (root === 'cron') {
    switch (sub) {
      case 'update-stocks':
        return handleUpdateStocks(req);
      case 'update-funds':
        return handleUpdateFunds(req);
      case 'update-commodities':
        return handleUpdateCommodities(req);
      case 'update-macro':
        return handleUpdateMacro(req);
      case 'process-signals':
        return handleProcessSignals(req);
      case 'signals':
        return handleCronSignals(req);
      case 'watchdog':
        return handleWatchdog(req);
      default:
        return NextResponse.json({ error: `Unknown cron job: ${sub}` }, { status: 404 });
    }
  }

  // 2. Banks
  if (root === 'banks') {
    switch (sub) {
      case 'accounts':
        return handleAccountsGet();
      case 'list':
        return handleListGet();
      case 'snapshots':
        return handleSnapshotsGet(req);
      case 'transactions':
        return handleTransactionsGet(req);
      default:
        return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
    }
  }

  // 3. Alerts
  if (root === 'alerts') {
    if (!sub) return handleAlertsGet();
    if (sub === 'preferences') return handlePreferencesGet();
    return NextResponse.json({ error: `Unknown alerts action: ${sub}` }, { status: 404 });
  }

  // 4. Notifications
  if (root === 'notifications') {
    if (!sub) return handleNotificationsGet();
    if (sub === 'check') return handleCheckNotifications(req);
    return NextResponse.json({ error: `Unknown notification action: ${sub}` }, { status: 404 });
  }

  // 5. Push
  if (root === 'push') {
    if (sub === 'subscribe') return handleSubscribeGet();
    if (sub === 'vapid-key') return handleVapidKeyGet();
    return NextResponse.json({ error: `Unknown push action: ${sub}` }, { status: 404 });
  }

  // 6. Sectors
  if (root === 'sectors') {
    if (sub === 'performance') return handlePerformanceGet(req);
    if (sub === 'signals') return handleSectorSignalsGet(req);
    return NextResponse.json({ error: `Unknown sectors action: ${sub}` }, { status: 404 });
  }

  // 7. Strategy & Signals
  if (root === 'signals' || (root === 'strategy' && sub === 'signals')) {
    return handleSignalsGet(req);
  }
  if (root === 'metrics' || (root === 'strategy' && sub === 'metrics')) {
    return handleMetricsGet(req);
  }
  if (root === 'strategy-levels' || (root === 'strategy' && sub === 'levels')) {
    return handleLevelsGet(req);
  }
  if (root === 'strategy-report' || (root === 'strategy' && sub === 'report')) {
    return handleReportGet(req);
  }

  // 8. Market / Quotes / Tickers / Macro
  if (root === 'quote' || (root === 'market' && sub === 'quote')) {
    return handleQuoteGet(req);
  }
  if (root === 'tickers' || (root === 'market' && sub === 'tickers')) {
    return handleTickersGet();
  }
  if (
    (root === 'macro' && sub === 'inflation') ||
    (root === 'market' && sub === 'inflation') ||
    root === 'inflation'
  ) {
    return handleInflationGet(req);
  }

  // 9. User / Positions / System Logs
  if (root === 'positions' || (root === 'user' && sub === 'positions')) {
    return handlePositionsGet(req);
  }
  if (root === 'system-logs' || (root === 'user' && sub === 'system-logs')) {
    return handleSystemLogsGet();
  }

  // 10. Intraday Trading Bot
  if (root === 'bot') {
    if (sub === 'status' || !sub) return handleBotStatusGet();
    if (sub === 'tickers') return handleBotTickersGet(req);
    if (sub === 'trades') return handleBotTradesGet(req);
    if (sub === 'logs' || sub === 'system-logs') return handleBotSystemLogsGet(req);
    if (sub === 'activity') return handleBotActivityGet();
    return NextResponse.json({ error: `Unknown bot action: ${sub}` }, { status: 404 });
  }

  return NextResponse.json({ error: `API route not found: /api/${segments.join('/')}` }, { status: 404 });
}

// ----------------------------------------------------
// POST HANDLER
// ----------------------------------------------------
export async function POST(req: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const segments = getPathSegments(slug);
  const root = segments[0] || '';
  const sub = segments[1] || '';

  // 1. Banks
  if (root === 'banks') {
    switch (sub) {
      case 'accounts':
        return handleAccountsPost(req);
      case 'snapshots':
        return handleSnapshotsPost(req);
      case 'transactions':
        return handleTransactionsPost(req);
      default:
        return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
    }
  }

  // 2. Alerts
  if (root === 'alerts') {
    if (!sub) return handleAlertsPost(req);
    if (sub === 'preferences') return handlePreferencesPost(req);
    return NextResponse.json({ error: `Unknown alerts action: ${sub}` }, { status: 404 });
  }

  // 3. Notifications
  if (root === 'notifications') {
    if (sub === 'check') return handleCheckNotifications(req);
    if (sub === 'test') return handleTestNotification();
    return NextResponse.json({ error: `Unknown notification action: ${sub}` }, { status: 404 });
  }

  // 4. Push
  if (root === 'push') {
    if (sub === 'subscribe') return handleSubscribePost(req);
    return NextResponse.json({ error: `Unknown push action: ${sub}` }, { status: 404 });
  }

  // 5. Predict
  if (root === 'predict' || (root === 'strategy' && sub === 'predict')) {
    return handlePredictPost(req);
  }

  // 6. User / Positions / Avatar
  if (root === 'positions' || (root === 'user' && sub === 'positions')) {
    return handlePositionsPost(req);
  }
  if (root === 'user' && sub === 'avatar') {
    return handleAvatarPost(req);
  }

  // 7. Intraday Trading Bot
  if (root === 'bot') {
    if (sub === 'settings' || sub === 'toggle') return handleBotSettingsPost(req);
    if (sub === 'tickers' && segments[2] === 'toggle') return handleBotTickerTogglePost(req);
    if (sub === 'tickers' && segments[2] === 'budget') return handleBotTickerBudgetPost(req);
    if (sub === 'positions' && segments[2] === 'close') return handleBotPositionClosePost(req);
    return NextResponse.json({ error: `Unknown bot action: ${sub}` }, { status: 404 });
  }

  return NextResponse.json({ error: `API route not found: /api/${segments.join('/')}` }, { status: 404 });
}

// ----------------------------------------------------
// PUT HANDLER
// ----------------------------------------------------
export async function PUT(req: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const segments = getPathSegments(slug);
  const root = segments[0] || '';
  const sub = segments[1] || '';

  if (root === 'banks' && sub === 'accounts') {
    return handleAccountsPut(req);
  }

  return NextResponse.json({ error: `API route not found: /api/${segments.join('/')}` }, { status: 404 });
}

// ----------------------------------------------------
// PATCH HANDLER
// ----------------------------------------------------
export async function PATCH(req: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const segments = getPathSegments(slug);
  const root = segments[0] || '';
  const sub = segments[1] || '';

  if (root === 'banks' && sub === 'accounts') {
    return handleAccountsPut(req);
  }

  if (root === 'positions' || (root === 'user' && sub === 'positions')) {
    return handlePositionsPatch(req);
  }

  return NextResponse.json({ error: `API route not found: /api/${segments.join('/')}` }, { status: 404 });
}

// ----------------------------------------------------
// DELETE HANDLER
// ----------------------------------------------------
export async function DELETE(req: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const segments = getPathSegments(slug);
  const root = segments[0] || '';
  const sub = segments[1] || '';

  // 1. Banks
  if (root === 'banks') {
    if (sub === 'accounts') return handleAccountsDelete(req);
    if (sub === 'transactions') return handleTransactionsDelete(req);
    return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
  }

  // 2. Alerts
  if (root === 'alerts' && !sub) {
    return handleAlertsDelete(req);
  }

  // 3. Notifications
  if (root === 'notifications' && !sub) {
    return handleNotificationsDelete(req);
  }

  // 4. Push
  if (root === 'push' && sub === 'subscribe') {
    return handleSubscribeDelete(req);
  }

  // 5. Positions
  if (root === 'positions' || (root === 'user' && sub === 'positions')) {
    return handlePositionsDelete(req);
  }

  return NextResponse.json({ error: `API route not found: /api/${segments.join('/')}` }, { status: 404 });
}
