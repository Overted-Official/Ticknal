import { NextResponse } from 'next/server';
import {
  generateTheTicknalTakePosts,
  retryPendingTicknalTakePosts,
} from '@/lib/news/ticknal-take-generator';
import { getKeyPoolStatus, resetKeyCooldowns } from '@/lib/ai/openrouter-client';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const isRetry = action === 'retry' || url.searchParams.get('retry') === 'true';
    const isStatus = action === 'status' || url.searchParams.get('pool') === 'true';
    const isReset = action === 'reset_cooldowns';

    if (isReset) {
      resetKeyCooldowns();
      return NextResponse.json({
        message: 'Key cooldowns reset successfully.',
        keyPool: getKeyPoolStatus(),
      });
    }

    if (isStatus) {
      return NextResponse.json({
        keyPool: getKeyPoolStatus(),
      });
    }

    if (isRetry) {
      const targetDate = url.searchParams.get('date') || undefined;
      const retryResult = await retryPendingTicknalTakePosts(targetDate);

      try {
        revalidatePath('/news');
        revalidatePath('/home');
        revalidatePath('/markets');
      } catch {}

      return NextResponse.json(retryResult, { status: 200 });
    }

    const result = await generateTheTicknalTakePosts();

    try {
      revalidatePath('/news');
      revalidatePath('/home');
      revalidatePath('/markets');
    } catch {}

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/news/ticknal-take:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
