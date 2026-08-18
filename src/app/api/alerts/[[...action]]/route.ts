import { NextResponse } from 'next/server';
import {
  handleAlertsGet,
  handleAlertsPost,
  handleAlertsDelete,
  handlePreferencesGet,
  handlePreferencesPost,
} from '@/lib/alerts-handlers';

export async function GET(req: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action } = await context.params;
  const sub = action?.[0];

  if (!sub) {
    return handleAlertsGet();
  }

  switch (sub) {
    case 'preferences':
      return handlePreferencesGet();
    default:
      return NextResponse.json({ error: `Unknown alert action: ${sub}` }, { status: 404 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action } = await context.params;
  const sub = action?.[0];

  if (!sub) {
    return handleAlertsPost(req);
  }

  switch (sub) {
    case 'preferences':
      return handlePreferencesPost(req);
    default:
      return NextResponse.json({ error: `Unknown alert action: ${sub}` }, { status: 404 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action } = await context.params;
  const sub = action?.[0];

  if (!sub) {
    return handleAlertsDelete(req);
  }

  return NextResponse.json({ error: `Unknown alert action: ${sub}` }, { status: 404 });
}
