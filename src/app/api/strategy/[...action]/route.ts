import { NextResponse } from 'next/server';
import {
  handleSignalsGet,
  handleMetricsGet,
  handleLevelsGet,
  handlePredictPost,
} from '@/lib/strategy-handlers';

export async function GET(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'signals':
      return handleSignalsGet(req);
    case 'metrics':
      return handleMetricsGet(req);
    case 'levels':
      return handleLevelsGet(req);
    default:
      return NextResponse.json({ error: `Unknown strategy action: ${sub}` }, { status: 404 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'predict':
      return handlePredictPost(req);
    default:
      return NextResponse.json({ error: `Unknown strategy action: ${sub}` }, { status: 404 });
  }
}
