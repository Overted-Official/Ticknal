import { NextResponse } from 'next/server';
import {
  handleUpdateStocks,
  handleUpdateFunds,
  handleUpdateCommodities,
  handleUpdateMacro,
  handleProcessSignals,
  handleSignals,
  handleWatchdog,
} from '@/lib/cron-handlers';

export async function GET(req: Request, context: { params: Promise<{ job: string }> }) {
  const { job } = await context.params;

  switch (job) {
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
      return handleSignals(req);
    case 'watchdog':
      return handleWatchdog(req);
    default:
      return NextResponse.json({ error: `Unknown cron job: ${job}` }, { status: 404 });
  }
}
