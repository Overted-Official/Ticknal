import { NextResponse } from 'next/server';
import {
  handleQuoteGet,
  handleTickersGet,
  handleInflationGet,
} from '@/lib/market-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'quote':
      return handleQuoteGet(req);
    case 'tickers':
      return handleTickersGet();
    case 'inflation':
      return handleInflationGet(req);
    default:
      return NextResponse.json({ error: `Unknown market action: ${sub}` }, { status: 404 });
  }
}
