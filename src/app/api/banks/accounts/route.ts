import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { banks, userBankAccounts } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await db
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

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch bank accounts', accounts: [] }, { status: 500 });
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
      bankId,
      customBankName,
      accountName,
      accountNumber,
      accountType = 'CURRENT',
      currency = 'EGP',
      balance = 0,
      color,
    } = body;

    if (!accountName || !accountName.trim()) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }

    const [newAccount] = await db
      .insert(userBankAccounts)
      .values({
        userId: user.id,
        bankId: bankId ? Number(bankId) : null,
        customBankName: customBankName ? String(customBankName).trim() : null,
        accountName: String(accountName).trim(),
        accountNumber: accountNumber ? String(accountNumber).trim() : null,
        accountType: String(accountType).toUpperCase(),
        currency: String(currency).toUpperCase() === 'USD' ? 'USD' : 'EGP',
        balance: String(Number(balance) || 0),
        color: color ? String(color) : null,
        isArchived: false,
      })
      .returning();

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, accountName, accountNumber, accountType, currency, balance, color, isArchived } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const updateData: Partial<typeof userBankAccounts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (accountName !== undefined) updateData.accountName = String(accountName).trim();
    if (accountNumber !== undefined) updateData.accountNumber = String(accountNumber).trim();
    if (accountType !== undefined) updateData.accountType = String(accountType).toUpperCase();
    if (currency !== undefined) updateData.currency = String(currency).toUpperCase() === 'USD' ? 'USD' : 'EGP';
    if (balance !== undefined) updateData.balance = String(Number(balance) || 0);
    if (color !== undefined) updateData.color = color;
    if (isArchived !== undefined) updateData.isArchived = Boolean(isArchived);

    const [updated] = await db
      .update(userBankAccounts)
      .set(updateData)
      .where(and(eq(userBankAccounts.id, Number(id)), eq(userBankAccounts.userId, user.id)))
      .returning();

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
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
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await db
      .delete(userBankAccounts)
      .where(and(eq(userBankAccounts.id, Number(id)), eq(userBankAccounts.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}
