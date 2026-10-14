import { verifyCronAuth } from '@/lib/cron-auth';
import { dispatchPendingCustomStrategyPush } from '@/lib/notifications/pushNotifications';
import { processCustomStrategyAlertBatch } from '@/lib/strategies/server/process-custom-strategy-alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const unauthorized = process.env.NODE_ENV === 'production'
    ? (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
      ? { error: 'Unauthorized', status: 401 } : null)
    : verifyCronAuth(request);
  if (unauthorized) return Response.json({ error: unauthorized.error }, { status: unauthorized.status });
  try {
    const batches = [];
    const started = Date.now();
    for (let index = 0; index < 4 && Date.now() - started < 40_000; index += 1) {
      const batch = await processCustomStrategyAlertBatch();
      batches.push(batch);
      if (!batch.checked) break;
    }
    const push = await dispatchPendingCustomStrategyPush();
    return Response.json({ status: 'ok', batches, push });
  } catch (error) {
    console.error('[process-custom-strategies] Failed.', error);
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
