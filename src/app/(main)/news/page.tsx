import { Suspense } from 'react';
import type { Metadata } from 'next';
import NewsPageView from '@/components/platform/news/NewsPageView';
import { db } from '@/db';
import { marketNews } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface NewsPageProps {
  searchParams: Promise<{ item?: string; lang?: string }>;
}

export async function generateMetadata({ searchParams }: NewsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const itemId = params?.item;
  const lang = params?.lang === 'ar' ? 'ar' : 'en';

  const defaultTitle = 'News | Ticknal';
  const defaultDesc =
    'Real-time Egyptian market news, EGX corporate disclosures, Central Bank of Egypt policy notices, and macroeconomic intelligence.';

  if (!itemId) {
    return {
      title: defaultTitle,
      description: defaultDesc,
      openGraph: {
        title: defaultTitle,
        description: defaultDesc,
        url: 'https://ticknal.com/news',
        siteName: 'ticknal',
        type: 'website',
        images: [
          {
            url: '/api/news/og',
            width: 1200,
            height: 675,
            alt: 'Ticknal Market Intelligence',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDesc,
        images: ['/api/news/og'],
      },
    };
  }

  try {
    const rows = await db.select().from(marketNews).where(eq(marketNews.id, itemId)).limit(1);
    const row = rows[0];
    if (!row) {
      return { title: defaultTitle, description: defaultDesc };
    }

    const titleParts = (row.title || '').split(/\s*---AR---\s*|\s*\|\|\|\s*/);
    const cleanTitle =
      lang === 'ar' && row.content ? row.content.trim() : (titleParts[0] || row.title).trim();

    const summaryParts = (row.summary || '').split(/\s*---AR---\s*|\s*\|\|\|\s*/);
    const cleanSummary =
      lang === 'ar' && summaryParts[1]
        ? summaryParts[1].trim()
        : (summaryParts[0] || row.summary || defaultDesc).trim();

    const ogImageUrl = `/api/news/og?id=${encodeURIComponent(itemId)}&lang=${lang}`;
    const postUrl = `https://ticknal.com/news?item=${encodeURIComponent(itemId)}${lang === 'ar' ? '&lang=ar' : ''}`;

    return {
      title: `${cleanTitle} | ticknal`,
      description: cleanSummary,
      openGraph: {
        title: cleanTitle,
        description: cleanSummary,
        url: postUrl,
        siteName: 'ticknal',
        type: 'article',
        publishedTime: row.publishedAt ? new Date(row.publishedAt).toISOString() : undefined,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 675,
            alt: cleanTitle,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: cleanTitle,
        description: cleanSummary,
        images: [ogImageUrl],
      },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDesc,
    };
  }
}

export default function NewsPage() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden">
      <Suspense fallback={<div className="flex-1 bg-black" />}>
        <NewsPageView />
      </Suspense>
    </div>
  );
}
