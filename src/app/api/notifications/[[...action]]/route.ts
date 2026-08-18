import { NextResponse } from 'next/server';
import {
  handleNotificationsGet,
  handleNotificationsDelete,
  handleCheckNotifications,
  handleTestNotification,
} from '@/lib/notifications-handlers';

export async function GET(req: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action } = await context.params;
  const sub = action?.[0];

  if (!sub) {
    return handleNotificationsGet();
  }

  switch (sub) {
    case 'check':
      return handleCheckNotifications(req);
    default:
      return NextResponse.json({ error: `Unknown notification action: ${sub}` }, { status: 404 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action } = await context.params;
  const sub = action?.[0];

  switch (sub) {
    case 'check':
      return handleCheckNotifications(req);
    case 'test':
      return handleTestNotification();
    default:
      return NextResponse.json({ error: `Unknown notification action: ${sub}` }, { status: 404 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action } = await context.params;
  const sub = action?.[0];

  if (!sub) {
    return handleNotificationsDelete(req);
  }

  return NextResponse.json({ error: `Unknown notification action: ${sub}` }, { status: 404 });
}
