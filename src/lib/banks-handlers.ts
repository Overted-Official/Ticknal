import { NextResponse } from 'next/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { banks, userBankAccounts, bankMonthlySnapshots, bankTransactions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { maskAccountNumber } from '@/lib/masking';

// Helper function: Process daily interest accruals for savings accounts
async function processAccountInterestAccruals(userId: string, accounts: any[]) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const updatedAccounts = [...accounts];

  for (let i = 0; i < updatedAccounts.length; i++) {
    const acc = updatedAccounts[i];
    const rate = Number(acc.interestRate);
    const isQualifyingType = ['SAVINGS', 'CD_TIME_DEPOSIT'].includes(acc.accountType);
    const isDaily = acc.interestFrequency === 'DAILY';

    if (!isQualifyingType || !rate || rate <= 0 || !isDaily) {
      continue;
    }

    // If last calc date is not set, initialize to today so calculation starts
    if (!acc.lastInterestCalcDate) {
      await db
        .update(userBankAccounts)
        .set({ lastInterestCalcDate: todayStr, updatedAt: new Date() })
        .where(eq(userBankAccounts.id, acc.id));
      acc.lastInterestCalcDate = todayStr;
      continue;
    }

    const lastCalc = new Date(acc.lastInterestCalcDate + 'T00:00:00Z');
    const nowUtc = new Date(todayStr + 'T00:00:00Z');
    const diffMs = nowUtc.getTime() - lastCalc.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      continue;
    }

    // Cap max catch-up to 365 days to prevent performance issues
    const daysToProcess = Math.min(diffDays, 365);
    let currentBalance = Number(acc.balance) || 0;

    for (let dayOffset = 1; dayOffset <= daysToProcess; dayOffset++) {
      if (currentBalance <= 0) break;

      const calcDate = new Date(lastCalc.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const calcDateStr = calcDate.toISOString().split('T')[0];

      // Daily interest = Balance * (Annual Rate % / 36500)
      const dailyYield = currentBalance * (rate / (100 * 365));
      if (dailyYield > 0.0001) {
        currentBalance += dailyYield;

        // Log transaction for audit and cash flow tracking
        await db.insert(bankTransactions).values({
          userId,
          accountId: acc.id,
          type: 'INCOME',
          amount: String(dailyYield.toFixed(2)),
          currency: acc.currency || 'EGP',
          category: 'Interest & Yield',
          transactionDate: calcDateStr,
          notes: `${acc.accountName} Daily Interest (${rate.toFixed(2)}% APR)`,
        });
      }
    }

    // Update account with compounded balance and latest calculation date
    await db
      .update(userBankAccounts)
      .set({
        balance: String(currentBalance.toFixed(4)),
        lastInterestCalcDate: todayStr,
        updatedAt: new Date(),
      })
      .where(eq(userBankAccounts.id, acc.id));

    acc.balance = String(currentBalance.toFixed(4));
    acc.lastInterestCalcDate = todayStr;
  }

  return updatedAccounts;
}

// ----------------------------------------------------
// ACCOUNTS HANDLER
// ----------------------------------------------------
export async function handleAccountsGet() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let accounts = await db
      .select({
        id: userBankAccounts.id,
        userId: userBankAccounts.userId,
        bankId: userBankAccounts.bankId,
        customBankName: userBankAccounts.customBankName,
        accountName: userBankAccounts.accountName,
        accountNumber: userBankAccounts.accountNumber,
        accountType: userBankAccounts.accountType,
        currency: userBankAccounts.currency,
        balance: userBankAccounts.balance,
        interestRate: userBankAccounts.interestRate,
        interestFrequency: userBankAccounts.interestFrequency,
        lastInterestCalcDate: userBankAccounts.lastInterestCalcDate,
        color: userBankAccounts.color,
        isArchived: userBankAccounts.isArchived,
        createdAt: userBankAccounts.createdAt,
        updatedAt: userBankAccounts.updatedAt,
        bankName: banks.name,
        bankLogoUrl: banks.logoUrl,
        bankSlug: banks.slug,
      })
      .from(userBankAccounts)
      .leftJoin(banks, eq(userBankAccounts.bankId, banks.id))
      .where(and(eq(userBankAccounts.userId, user.id), eq(userBankAccounts.isArchived, false)))
      .orderBy(desc(userBankAccounts.balance));

    // Automatically process any pending daily interest compounding
    accounts = await processAccountInterestAccruals(user.id, accounts);

    const maskedAccounts = (accounts || []).map((acc) => ({
      ...acc,
      accountNumber: maskAccountNumber(acc.accountNumber),
    }));

    return NextResponse.json({ accounts: maskedAccounts });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ accounts: [], error: 'Failed to fetch bank accounts' }, { status: 200 });
  }
}

export async function handleAccountsPost(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      bankId,
      customBankName,
      accountName,
      accountNumber,
      accountType,
      currency,
      balance,
      interestRate,
      interestFrequency,
      color,
    } = body;

    if (!accountName || !accountType) {
      return NextResponse.json({ error: 'Missing required account fields' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const [newAccount] = await db
      .insert(userBankAccounts)
      .values({
        userId: user.id,
        bankId: bankId ? Number(bankId) : null,
        customBankName: customBankName || null,
        accountName,
        accountNumber: accountNumber || null,
        accountType,
        currency: currency || 'EGP',
        balance: balance ? String(balance) : '0',
        interestRate: interestRate ? String(interestRate) : null,
        interestFrequency: interestFrequency || (interestRate ? 'DAILY' : 'NONE'),
        lastInterestCalcDate: interestRate ? todayStr : null,
        color: color || 'var(--plt-accent)',
        isArchived: false,
      })
      .returning();

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 });
  }
}

export async function handleAccountsPut(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const [updatedAccount] = await db
      .update(userBankAccounts)
      .set({
        ...updates,
        bankId: updates.bankId !== undefined ? (updates.bankId ? Number(updates.bankId) : null) : undefined,
        balance: updates.balance !== undefined ? String(updates.balance) : undefined,
        interestRate: updates.interestRate !== undefined ? (updates.interestRate ? String(updates.interestRate) : null) : undefined,
        interestFrequency: updates.interestFrequency !== undefined ? updates.interestFrequency : undefined,
        lastInterestCalcDate: updates.lastInterestCalcDate !== undefined ? updates.lastInterestCalcDate : (updates.interestRate && !updates.lastInterestCalcDate ? todayStr : undefined),
        updatedAt: new Date(),
      })
      .where(and(eq(userBankAccounts.id, Number(id)), eq(userBankAccounts.userId, user.id)))
      .returning();

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}

export async function handleAccountsDelete(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    await db
      .update(userBankAccounts)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(userBankAccounts.id, Number(id)), eq(userBankAccounts.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}

// ----------------------------------------------------
// LIST HANDLER
// ----------------------------------------------------
export async function handleListGet() {
  try {
    const allBanks = await db.select().from(banks).orderBy(asc(banks.name));
    return NextResponse.json({ banks: allBanks }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching banks list:', error);
    return NextResponse.json({ error: 'Failed to fetch banks list', banks: [] }, { status: 500 });
  }
}

// ----------------------------------------------------
// SNAPSHOTS HANDLER
// ----------------------------------------------------
export async function handleSnapshotsGet(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    const query = db
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

export async function handleSnapshotsPost(req: Request) {
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

    const keepMonths = new Set(snapshots.map((s) => s.yearMonth));
    const existing = await db
      .select({ yearMonth: bankMonthlySnapshots.yearMonth })
      .from(bankMonthlySnapshots)
      .where(and(eq(bankMonthlySnapshots.userId, user.id), eq(bankMonthlySnapshots.accountId, Number(accountId))));

    for (const ex of existing) {
      if (!keepMonths.has(ex.yearMonth)) {
        await db
          .delete(bankMonthlySnapshots)
          .where(
            and(
              eq(bankMonthlySnapshots.userId, user.id),
              eq(bankMonthlySnapshots.accountId, Number(accountId)),
              eq(bankMonthlySnapshots.yearMonth, ex.yearMonth)
            )
          );
      }
    }

    for (const snap of snapshots) {
      await db
        .insert(bankMonthlySnapshots)
        .values({
          userId: user.id,
          accountId: Number(accountId),
          yearMonth: snap.yearMonth,
          closingBalance: String(snap.closingBalance),
        })
        .onConflictDoUpdate({
          target: [bankMonthlySnapshots.accountId, bankMonthlySnapshots.yearMonth],
          set: {
            closingBalance: String(snap.closingBalance),
          },
        });
    }

    if (updateCurrentBalance && snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
      const latest = sorted[sorted.length - 1];
      await db
        .update(userBankAccounts)
        .set({ balance: String(latest.closingBalance), updatedAt: new Date() })
        .where(and(eq(userBankAccounts.id, Number(accountId)), eq(userBankAccounts.userId, user.id)));
    }

    return NextResponse.json({ success: true, count: snapshots.length });
  } catch (error) {
    console.error('Error updating bank snapshots:', error);
    return NextResponse.json({ error: 'Failed to update snapshots' }, { status: 500 });
  }
}

// ----------------------------------------------------
// TRANSACTIONS HANDLER
// ----------------------------------------------------
export async function handleTransactionsGet(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    const conditions = [eq(bankTransactions.userId, user.id)];
    if (accountId) {
      conditions.push(eq(bankTransactions.accountId, Number(accountId)));
    }

    const transactions = await db
      .select({
        id: bankTransactions.id,
        userId: bankTransactions.userId,
        accountId: bankTransactions.accountId,
        toAccountId: bankTransactions.toAccountId,
        type: bankTransactions.type,
        amount: bankTransactions.amount,
        currency: bankTransactions.currency,
        category: bankTransactions.category,
        transactionDate: bankTransactions.transactionDate,
        notes: bankTransactions.notes,
        createdAt: bankTransactions.createdAt,
        accountName: userBankAccounts.accountName,
        accountType: userBankAccounts.accountType,
        bankLogoUrl: banks.logoUrl,
        bankName: banks.name,
      })
      .from(bankTransactions)
      .innerJoin(userBankAccounts, eq(bankTransactions.accountId, userBankAccounts.id))
      .leftJoin(banks, eq(userBankAccounts.bankId, banks.id))
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.createdAt))
      .limit(limit);

    return NextResponse.json({ transactions: transactions || [] });
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    return NextResponse.json({ transactions: [], error: 'Failed to fetch transactions' }, { status: 200 });
  }
}

export async function handleTransactionsPost(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      accountId,
      toAccountId,
      type,
      amount,
      currency,
      category,
      transactionDate,
      notes,
    } = body;

    if (!accountId || !type || !amount) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
    }

    const [tx] = await db
      .insert(bankTransactions)
      .values({
        userId: user.id,
        accountId: Number(accountId),
        toAccountId: toAccountId ? Number(toAccountId) : null,
        type,
        amount: String(amount),
        currency: currency || 'EGP',
        category: category || null,
        transactionDate: transactionDate || new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .returning();

    // Auto-update account balances
    if (type === 'INCOME') {
      await db
        .update(userBankAccounts)
        .set({ balance: sql`${userBankAccounts.balance} + ${Number(amount)}`, updatedAt: new Date() })
        .where(eq(userBankAccounts.id, Number(accountId)));
    } else if (type === 'EXPENSE') {
      await db
        .update(userBankAccounts)
        .set({ balance: sql`${userBankAccounts.balance} - ${Number(amount)}`, updatedAt: new Date() })
        .where(eq(userBankAccounts.id, Number(accountId)));
    } else if (type === 'TRANSFER' && toAccountId) {
      await db
        .update(userBankAccounts)
        .set({ balance: sql`${userBankAccounts.balance} - ${Number(amount)}`, updatedAt: new Date() })
        .where(eq(userBankAccounts.id, Number(accountId)));
      await db
        .update(userBankAccounts)
        .set({ balance: sql`${userBankAccounts.balance} + ${Number(amount)}`, updatedAt: new Date() })
        .where(eq(userBankAccounts.id, Number(toAccountId)));
    }

    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (error) {
    console.error('Error creating bank transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

export async function handleTransactionsDelete(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    await db
      .delete(bankTransactions)
      .where(and(eq(bankTransactions.id, Number(id)), eq(bankTransactions.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
