import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { banks, bankTransactions, userBankAccounts } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
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

export async function POST(req: Request) {
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
      type, // DEPOSIT, WITHDRAWAL, TRANSFER, EXPENSE, INCOME, BROKER_INJECTION, BROKER_WITHDRAWAL
      amount,
      currency = 'EGP',
      category = 'Other',
      transactionDate,
      notes,
    } = body;

    const numAmount = Math.abs(Number(amount));
    if (!accountId || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid Account ID and positive amount are required' }, { status: 400 });
    }

    const dateStr = transactionDate || new Date().toISOString().split('T')[0];

    // 1. Insert Transaction
    const [newTx] = await db
      .insert(bankTransactions)
      .values({
        userId: user.id,
        accountId: Number(accountId),
        toAccountId: toAccountId ? Number(toAccountId) : null,
        type: String(type).toUpperCase(),
        amount: String(numAmount),
        currency: String(currency).toUpperCase(),
        category: String(category).trim(),
        transactionDate: dateStr,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    // 2. Adjust Account Balances based on transaction type
    const txType = String(type).toUpperCase();
    if (txType === 'EXPENSE' || txType === 'WITHDRAWAL' || txType === 'BROKER_INJECTION') {
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} - ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, Number(accountId)), eq(userBankAccounts.userId, user.id)));
    } else if (txType === 'INCOME' || txType === 'DEPOSIT' || txType === 'BROKER_WITHDRAWAL') {
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} + ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, Number(accountId)), eq(userBankAccounts.userId, user.id)));
    } else if (txType === 'TRANSFER' && toAccountId) {
      // Decrement source account
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} - ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, Number(accountId)), eq(userBankAccounts.userId, user.id)));

      // Increment destination account
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} + ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, Number(toAccountId)), eq(userBankAccounts.userId, user.id)));
    }

    return NextResponse.json({ transaction: newTx }, { status: 201 });
  } catch (error) {
    console.error('Error logging bank transaction:', error);
    return NextResponse.json({ error: 'Failed to log transaction' }, { status: 500 });
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
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Find the transaction to reverse balance
    const [tx] = await db
      .select()
      .from(bankTransactions)
      .where(and(eq(bankTransactions.id, Number(id)), eq(bankTransactions.userId, user.id)));

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const numAmount = Number(tx.amount);
    const txType = tx.type;

    // Reverse balance
    if (txType === 'EXPENSE' || txType === 'WITHDRAWAL' || txType === 'BROKER_INJECTION') {
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} + ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, tx.accountId), eq(userBankAccounts.userId, user.id)));
    } else if (txType === 'INCOME' || txType === 'DEPOSIT' || txType === 'BROKER_WITHDRAWAL') {
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} - ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, tx.accountId), eq(userBankAccounts.userId, user.id)));
    } else if (txType === 'TRANSFER' && tx.toAccountId) {
      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} + ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, tx.accountId), eq(userBankAccounts.userId, user.id)));

      await db
        .update(userBankAccounts)
        .set({
          balance: sql`${userBankAccounts.balance} - ${numAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(userBankAccounts.id, tx.toAccountId), eq(userBankAccounts.userId, user.id)));
    }

    // Delete row
    await db
      .delete(bankTransactions)
      .where(and(eq(bankTransactions.id, Number(id)), eq(bankTransactions.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
