import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { marketNews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { dispatchNewsPushNotification } from '@/lib/notifications/pushNotifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const itemId = body.itemId || body.id || 'take-2026-10-20-market-snapshot';

    const [item] = await db.select().from(marketNews).where(eq(marketNews.id, itemId)).limit(1);

    if (!item) {
      return NextResponse.json({ error: `Article ${itemId} not found` }, { status: 404 });
    }

    const result = await dispatchNewsPushNotification({
      id: item.id,
      title: item.title,
      summary: item.summary || '',
      urgencyScore: item.urgencyScore ?? 10,
      imageUrl: item.imageUrl,
      category: item.category,
      tickers: (Array.isArray(item.tickers) ? item.tickers : []) as string[],
      publishedAt: item.publishedAt,
    });

    return NextResponse.json({
      success: true,
      article: {
        id: item.id,
        title: item.title,
        urgencyScore: item.urgencyScore,
      },
      dispatch: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to dispatch news push';
    console.error('[/api/news/push] Error dispatching news push notification:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
