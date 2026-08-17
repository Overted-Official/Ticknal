export function verifyCronAuth(req: Request): { error: string; status: number } | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set.');
    return { error: 'Server misconfigured', status: 500 };
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { error: 'Unauthorized', status: 401 };
  }
  return null;
}
