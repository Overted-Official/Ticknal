export function verifyCronAuth(req: Request): { error: string; status: number } | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  // Local-only convenience when no secret is configured. Request headers are
  // caller controlled and must never prove that a request came from Vercel.
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return null;
  }
  return { error: 'Unauthorized', status: 401 };
}
