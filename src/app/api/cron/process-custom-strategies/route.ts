import { verifyCronAuth } from '@/lib/cron-auth';
import { dispatchPendingCustomStrategyPush } from '@/lib/notifications/pushNotifications';
import { cairoMarketDate } from '@/lib/notifications/market-session';
import { processCustomStrategyAlertBatch } from '@/lib/strategies/server/process-custom-strategy-alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const unauthorized = process.env.NODE_ENV === 'production'
    ? (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
      ? { error: 'Unauthorized', status: 401 } : null)
    : verifyCronAuth(request);
  if (unauthorized) return Response.json({ error: unauthorized.error }, { status: unauthorized.status });
  try {
    const batches = [];
    const started = Date.now();
    const marketDate = cairoMarketDate(new Date(started));
    let strategiesDrained = false;
    let skippedSession = false;
    let staleSession: string | null = null;
    for (let index = 0; Date.now() - started < 270_000; index += 1) {
      const batch = await processCustomStrategyAlertBatch();
      batches.push(batch);
      if (batch.session !== null && batch.session !== marketDate) {
        staleSession = batch.session;
        break;
      }
      if (!batch.checked) {
        strategiesDrained = batch.session === marketDate && !batch.error;
        skippedSession = batch.session === null && !batch.error;
        break;
      }
    }
    const pushBatches = [];
    let pushDrained = false;
    while (Date.now() - started < 285_000) {
      const push = await dispatchPendingCustomStrategyPush(20);
      pushBatches.push(push);
      if (!push.processed) { pushDrained = true; break; }
    }
    const complete = (strategiesDrained || skippedSession) && pushDrained;
    const status = staleSession ? 'stale-session' : skippedSession ? 'skipped' : complete ? 'ok' : 'incomplete';
    return Response.json({ status, complete: complete && !staleSession, batches, pushBatches }, { status: complete && !staleSession ? 200 : 503 });
  } catch (error) {
    console.error('[process-custom-strategies] Failed.', error);
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
