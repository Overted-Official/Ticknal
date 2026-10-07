import { NextResponse, type NextRequest } from 'next/server';
import { getMarketNewsItems, createMarketNewsItem, type MarketNewsItemDTO } from '@/lib/news/news-service';

export type MarketNewsItem = MarketNewsItemDTO;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const ticker = searchParams.get('ticker') || undefined;
    const query = searchParams.get('q') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const data = await getMarketNewsItems({
      category,
      ticker,
      query,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /api/news] Error querying database market news:', error);
    return NextResponse.json({ error: 'Failed to fetch market news from database' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.summary || !body.category || !body.source) {
      return NextResponse.json(
        { error: 'Missing required fields: title, summary, category, source' },
        { status: 400 }
      );
    }

    const id = body.id || `news-${Date.now()}`;
    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();

    const created = await createMarketNewsItem({
      id,
      title: body.title,
      summary: body.summary,
      content: body.content || null,
      category: body.category,
      categoryLabel: body.categoryLabel || body.category,
      tickers: Array.isArray(body.tickers) ? body.tickers : [],
      sentiment: body.sentiment || 'neutral',
      source: body.source,
      sourceUrl: body.sourceUrl || null,
      importance: body.importance || 'normal',
      impactMetric: body.impactMetric || null,
      readTime: body.readTime || '2 min read',
      publishedAt,
    });

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error) {
    console.error('[API /api/news POST] Failed to create market news record:', error);
    return NextResponse.json({ error: 'Failed to create news record' }, { status: 500 });
  }
}
