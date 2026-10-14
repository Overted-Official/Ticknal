import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { screenAndIngestWires } from '@/lib/news/wire-screener';
import { generateAllDailyTakes } from '@/lib/news/ticknal-take-generator';
import { purgeLegacyNews } from '@/lib/news/news-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function handleNewsSync(request: NextRequest) {
  const url = new URL(request.url);
  const action = (url.searchParams.get('action') || 'wire').toLowerCase();

  try {
    let result: Record<string, unknown> = {};

    switch (action) {
      case 'purge': {
        const purgeResult = await purgeLegacyNews(false);
        result = { action: 'purge', ...purgeResult };
        break;
      }
      case 'takes': {
        const takesResult = await generateAllDailyTakes();
        result = { action: 'takes', ...takesResult };
        break;
      }
      case 'full':
      case 'full_pipeline': {
        const wireResult = await screenAndIngestWires();
        const takesResult = await generateAllDailyTakes();
        result = { action: 'full_pipeline', wire: wireResult, takes: takesResult };
        break;
      }
      case 'wire':
      default: {
        const wireResult = await screenAndIngestWires();
        result = { action: 'wire', ...wireResult };
        break;
      }
    }

    try {
      revalidatePath('/news');
      revalidatePath('/home');
      revalidatePath('/markets');
    } catch {}

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API /api/news/sync] Error processing news action:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process news pipeline' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleNewsSync(request);
}

export async function GET(request: NextRequest) {
  return handleNewsSync(request);
}
