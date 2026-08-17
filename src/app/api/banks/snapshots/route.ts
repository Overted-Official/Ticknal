import { NextResponse } from 'next/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bankMonthlySnapshots, userBankAccounts } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    let query = db
      .select()
      .from(bankMonthlySnapshots)
      .where(
        accountId
          ? and(
              eq(bankMonthlySnapshots.userId, user.id),
              eq(bankMonthlySnapshots.accountId, Number(accountId))
            )
          : eq(bankMonthlySnapshots.userId, user.id)
      )
      .orderBy(asc(bankMonthlySnapshots.yearMonth));

    const rows = await query;

    return NextResponse.json({ snapshots: rows || [] });
  } catch (error) {
    console.error('Error fetching bank monthly snapshots:', error);
    return NextResponse.json({ snapshots: [], error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, snapshots, updateCurrentBalance } = body as {
      accountId: number;
      snapshots: Array<{ yearMonth: string; closingBalance: number | string }>;
      updateCurrentBalance?: boolean;
    };

    if (!accountId || !Array.isArray(snapshots)) {
      return NextResponse.json({ error: 'Invalid payload: accountId and snapshots array required' }, { status: 400 });
    }

    // Verify account ownership
    const [acc] = await db
      .select()
      .from(userBankAccounts)
      .where(and(eq(userBankAccounts.id, Number(accountId)), eq(userBankAccounts.userId, user.id)));

    if (!acc) {
      return NextResponse.json({ error: 'Bank account not found or access denied' }, { status: 404 });
    }

    // Upsert snapshots
    for (const snap of snapshots) {
      if (!snap.yearMonth || snap.closingBalance === undefined || snap.closingBalance === null) continue;

      const ym = String(snap.yearMonth).trim();
      const bal = String(Number(snap.closingBalance) || 0);

      await db
        .insert(bankMonthlySnapshots)
        .values({
          userId: user.id,
          accountId: Number(accountId),
          yearMonth: ym,
          closingBalance: bal,
        })
        .onConflictDoUpdate({
          target: [bankMonthlySnapshots.accountId, bankMonthlySnapshots.yearMonth],
          set: {
            closingBalance: bal,
          },
        });
    }

    // Optionally update current account balance to latest snapshot
    if (updateCurrentBalance && snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
      const latest = sorted[sorted.length - 1];
      if (latest && latest.closingBalance !== undefined) {
        await db
          .update(userBankAccounts)
          .set({
            balance: String(Number(latest.closingBalance) || 0),
            updatedAt: new Date(),
          })
          .where(and(eq(userBankAccounts.id, Number(accountId)), eq(userBankAccounts.userId, user.id)));
      }
    }

    const updatedSnapshots = await db
      .select()
      .from(bankMonthlySnapshots)
      .where(and(eq(bankMonthlySnapshots.userId, user.id), eq(bankMonthlySnapshots.accountId, Number(accountId))))
      .orderBy(asc(bankMonthlySnapshots.yearMonth));

    return NextResponse.json({ success: true, snapshots: updatedSnapshots });
  } catch (error) {
    console.error('Error saving bank monthly snapshots:', error);
    return NextResponse.json({ error: 'Failed to save snapshots' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Snapshot ID is required' }, { status: 400 });
    }

    await db
      .delete(bankMonthlySnapshots)
      .where(and(eq(bankMonthlySnapshots.id, Number(id)), eq(bankMonthlySnapshots.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 });
  }
}
