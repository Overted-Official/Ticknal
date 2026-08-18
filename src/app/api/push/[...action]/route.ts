import { NextResponse } from 'next/server';
import {
  handleSubscribeGet,
  handleSubscribePost,
  handleSubscribeDelete,
  handleVapidKeyGet,
} from '@/lib/push-handlers';

export async function GET(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'subscribe':
      return handleSubscribeGet();
    case 'vapid-key':
      return handleVapidKeyGet();
    default:
      return NextResponse.json({ error: `Unknown push action: ${sub}` }, { status: 404 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'subscribe':
      return handleSubscribePost(req);
    default:
      return NextResponse.json({ error: `Unknown push action: ${sub}` }, { status: 404 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'subscribe':
      return handleSubscribeDelete(req);
    default:
      return NextResponse.json({ error: `Unknown push action: ${sub}` }, { status: 404 });
  }
}
