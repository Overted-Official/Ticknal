import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tickers } from '@/db/schema';

export async function GET() {
  try {
    const allTickers = await db.select().from(tickers);
    return NextResponse.json(allTickers);
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return NextResponse.json({ error: 'Failed to fetch tickers' }, { status: 500 });
  }
}
