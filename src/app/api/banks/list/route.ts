import { NextResponse } from 'next/server';
import { db } from '@/db';
import { banks } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
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
