import { NextResponse, type NextRequest } from 'next/server';
import { syncExternalTradingViewNews } from '@/lib/news/news-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const result = await syncExternalTradingViewNews();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/news/sync] Error syncing external news:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync news' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const result = await syncExternalTradingViewNews();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/news/sync] Error syncing external news:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync news' },
      { status: 500 }
    );
  }
}
