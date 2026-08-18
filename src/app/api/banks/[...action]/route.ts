import { NextResponse } from 'next/server';
import {
  handleAccountsGet,
  handleAccountsPost,
  handleAccountsPut,
  handleAccountsDelete,
  handleListGet,
  handleSnapshotsGet,
  handleSnapshotsPost,
  handleTransactionsGet,
  handleTransactionsPost,
  handleTransactionsDelete,
} from '@/lib/banks-handlers';

export async function GET(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'accounts':
      return handleAccountsGet();
    case 'list':
      return handleListGet();
    case 'snapshots':
      return handleSnapshotsGet(req);
    case 'transactions':
      return handleTransactionsGet(req);
    default:
      return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'accounts':
      return handleAccountsPost(req);
    case 'snapshots':
      return handleSnapshotsPost(req);
    case 'transactions':
      return handleTransactionsPost(req);
    default:
      return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'accounts':
      return handleAccountsPut(req);
    default:
      return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'accounts':
      return handleAccountsDelete(req);
    case 'transactions':
      return handleTransactionsDelete(req);
    default:
      return NextResponse.json({ error: `Unknown bank action: ${sub}` }, { status: 404 });
  }
}
