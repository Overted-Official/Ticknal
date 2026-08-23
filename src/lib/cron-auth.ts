export function verifyCronAuth(req: Request): { error: string; status: number } | null {
  // 1. Allow native Vercel Cron invocation headers
  const isVercelCron =
    req.headers.get('x-vercel-cron') === '1' ||
    req.headers.get('user-agent')?.includes('vercel-cron');

  if (isVercelCron) {
    return null;
  }

  // 2. Allow Bearer token if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  // 3. Allow bypass in local development
  if (process.env.NODE_ENV === 'development' && (!cronSecret || !authHeader)) {
    return null;
  }

  // 4. Reject unauthorized external requests
  return { error: 'Unauthorized', status: 401 };
}
