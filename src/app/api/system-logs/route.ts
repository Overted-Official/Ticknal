import { NextResponse } from 'next/server';
import { db } from '@/db';
import { systemLogs } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
