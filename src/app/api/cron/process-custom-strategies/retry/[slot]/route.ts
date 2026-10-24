import { GET as processCustomStrategies } from '../../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Separate once-daily Vercel cron paths resume the same leased/idempotent queue.
// This does not create additional notifications for a completed session.
export async function GET(request: Request): Promise<Response> {
  return processCustomStrategies(request);
}
