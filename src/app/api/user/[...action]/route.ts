import { NextResponse } from 'next/server';
import {
  handlePositionsGet,
  handlePositionsPost,
  handlePositionsPatch,
  handlePositionsDelete,
  handleAvatarPost,
  handleSystemLogsGet,
} from '@/lib/user-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'positions':
      return handlePositionsGet(req);
    case 'system-logs':
      return handleSystemLogsGet();
    default:
      return NextResponse.json({ error: `Unknown user action: ${sub}` }, { status: 404 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'positions':
      return handlePositionsPost(req);
    case 'avatar':
      return handleAvatarPost(req);
    default:
      return NextResponse.json({ error: `Unknown user action: ${sub}` }, { status: 404 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'positions':
      return handlePositionsPatch(req);
    default:
      return NextResponse.json({ error: `Unknown user action: ${sub}` }, { status: 404 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'positions':
      return handlePositionsDelete(req);
    default:
      return NextResponse.json({ error: `Unknown user action: ${sub}` }, { status: 404 });
  }
}
