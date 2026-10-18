import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { db } from '@/db';
import { marketNews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { resolveLocalizedChartSvg, xmlEscape, type ChartVariant } from '@/lib/news/ticknal-take-charts';
import { CAIRO_ARABIC_WOFF2_BASE64 } from '@/lib/news/cairo-font-base64';

export const dynamic = 'force-dynamic';

function wrapTextLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    const remainingWords = words.slice(lines.join(' ').split(' ').filter(Boolean).length);
    const tail = remainingWords.join(' ');
    lines.push(tail.length > maxCharsPerLine ? `${tail.slice(0, maxCharsPerLine - 1)}…` : tail);
  }
  return lines.slice(0, maxLines);
}

function buildWireSocialCardSvg(params: {
  source: string;
  categoryLabel: string;
  dateStr: string;
  title: string;
  summary: string;
  tickers: string[];
  sentiment: string;
  locale: 'en' | 'ar';
  variant: ChartVariant;
}): Buffer {
  const isSquare = params.variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = params.locale === 'ar';
  const esc = xmlEscape;

  const sentColor =
    params.sentiment === 'bullish' ? '#10b981' : params.sentiment === 'bearish' ? '#f43f5e' : '#00BCE6';
  const sentLabel =
    params.sentiment === 'bullish'
      ? ar ? 'إشارة إيجابية صاعدة' : 'BULLISH SIGNAL'
      : params.sentiment === 'bearish'
      ? ar ? 'إشارة سلبية هابطة' : 'BEARISH SIGNAL'
      : ar ? 'تحديث السوق' : 'MARKET WIRE';

  const titleLines = wrapTextLines(params.title, isSquare ? 42 : 52, 3);
  const summaryLines = wrapTextLines(params.summary, isSquare ? 64 : 78, isSquare ? 6 : 4);

  const tickersRow = (params.tickers || [])
    .slice(0, 5)
    .map((t, idx) => {
      const x = ar ? W - 64 - 102 - idx * 116 : 64 + idx * 116;
      return `
      <g transform="translate(${x}, ${H - 138})">
        <rect width="102" height="34" rx="8" fill="#111113" stroke="#27272a" stroke-width="1.2" />
        <text x="51" y="22" fill="#00BCE6" font-size="13.5" font-weight="700" text-anchor="middle">@${esc(t.replace(/^[@$]/, ''))}</text>
      </g>`;
    })
    .join('');

  const fontFaceStyle = ar
    ? `<style>
        @font-face {
          font-family: 'Cairo';
          font-style: normal;
          font-weight: 400 800;
          src: url(data:font/woff2;base64,${CAIRO_ARABIC_WOFF2_BASE64}) format('woff2');
        }
        text, tspan { font-family: 'Cairo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        .ticknal-brand-text { font-family: EuclidCircularSemibold, Inter, -apple-system, sans-serif !important; font-weight: 600; letter-spacing: -0.04em; }
      </style>`
    : `<style>
        .ticknal-brand-text { font-family: EuclidCircularSemibold, Inter, -apple-system, sans-serif; font-weight: 600; letter-spacing: -0.04em; }
      </style>`;
  const rootFont = ar
    ? "'Cairo',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
    : "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const cardInnerW = W - 128;
  const textX = ar ? cardInnerW - 40 : 40;
  const textAnchor = ar ? 'end' : 'start';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#000000;font-family:${rootFont};">
    <defs>
      ${fontFaceStyle}
      <linearGradient id="wireGlow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${sentColor}" stop-opacity="0.14" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#000000" />
    <rect width="${W}" height="${H}" fill="url(#wireGlow)" />

    ${
      ar
        ? `<g transform="translate(64, 50)">
             <rect width="190" height="32" rx="8" fill="${sentColor}" fill-opacity="0.12" stroke="${sentColor}" stroke-opacity="0.45" stroke-width="1.2" />
             <text x="95" y="21" fill="${sentColor}" font-size="12" font-weight="700" text-anchor="middle">${esc(sentLabel)}</text>
           </g>
           <g transform="translate(${W - 64 - 120}, 52)">
             <svg x="90" y="0" viewBox="5 6 54 54" width="30" height="30" fill="none">
               <path fill="#FFFFFF" d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z" />
             </svg>
             <text x="80" y="23" fill="#FFFFFF" font-size="25" font-weight="600" letter-spacing="-0.04em" text-anchor="end" class="ticknal-brand-text">ticknal</text>
             <rect x="-152" y="2" width="136" height="26" rx="7" fill="#000000" stroke="#2e2e32" stroke-width="1.2" />
             <text x="-84" y="19" fill="#a1a1aa" font-size="12" font-weight="600" text-anchor="middle">${esc(params.source)}</text>
             <text x="-166" y="20" fill="#71717a" font-size="12" font-weight="700" text-anchor="end">${esc(params.categoryLabel)} ·</text>
           </g>`
        : `<g transform="translate(64, 52)">
             <svg viewBox="5 6 54 54" width="30" height="30" fill="none">
               <path fill="#FFFFFF" d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z" />
             </svg>
             <text x="42" y="23" fill="#FFFFFF" font-size="25" font-weight="600" letter-spacing="-0.04em" class="ticknal-brand-text">ticknal</text>
             <rect x="134" y="2" width="136" height="26" rx="7" fill="#000000" stroke="#2e2e32" stroke-width="1.2" />
             <text x="202" y="19" fill="#a1a1aa" font-size="12" font-weight="600" text-anchor="middle">${esc(params.source)}</text>
             <text x="284" y="20" fill="#71717a" font-size="12" font-weight="700" letter-spacing="0.06em">· ${esc(params.categoryLabel.toUpperCase())}</text>
           </g>
           <g transform="translate(${W - 64 - 190}, 50)">
             <rect width="190" height="32" rx="8" fill="${sentColor}" fill-opacity="0.12" stroke="${sentColor}" stroke-opacity="0.45" stroke-width="1.2" />
             <text x="95" y="21" fill="${sentColor}" font-size="12" font-weight="700" text-anchor="middle">${esc(sentLabel)}</text>
           </g>`
    }

    <line x1="64" y1="108" x2="${W - 64}" y2="108" stroke="#222222" stroke-width="1.5" />

    <!-- Main Intelligence Card -->
    <g transform="translate(64, 140)">
      <rect width="${cardInnerW}" height="${H - 304}" rx="18" fill="#000000" stroke="#222222" stroke-width="1.5" />
      <rect x="${ar ? cardInnerW - 6 : 0}" y="0" width="6" height="${H - 304}" rx="3" fill="${sentColor}" />

      <text x="${textX}" y="46" fill="#71717a" font-size="13" font-weight="600" text-anchor="${textAnchor}">${esc(ar ? `${params.dateStr} · إفصاح سوق موثق` : `${params.dateStr} · VERIFIED MARKET DISCLOSURE`)}</text>

      ${titleLines
        .map(
          (line, idx) =>
            `<text x="${textX}" y="${96 + idx * 42}" fill="#ffffff" font-size="${isSquare ? 30 : 32}" font-weight="700" text-anchor="${textAnchor}">${esc(line)}</text>`
        )
        .join('')}

      <line x1="40" y1="${112 + titleLines.length * 42}" x2="${W - 168}" y2="${112 + titleLines.length * 42}" stroke="#1c1c1f" stroke-width="1" />

      ${summaryLines
        .map(
          (line, idx) =>
            `<text x="${textX}" y="${152 + titleLines.length * 42 + idx * 32}" fill="#a1a1aa" font-size="18.5" font-weight="500" text-anchor="${textAnchor}">${esc(line)}</text>`
        )
        .join('')}
    </g>

    ${tickersRow}

    <!-- Footer -->
    <line x1="64" y1="${H - 76}" x2="${W - 64}" y2="${H - 76}" stroke="#222222" stroke-width="1" />
    ${
      ar
        ? `<text x="64" y="${H - 44}" fill="#ffffff" font-size="14" font-weight="700" text-anchor="start">ticknal.com/news</text>
           <text x="${W - 64}" y="${H - 44}" fill="#71717a" font-size="13.5" font-weight="600" text-anchor="end">منصة تكنال للتحليل الكمي · تغطية لحظية للبورصة المصرية والأسواق</text>`
        : `<text x="64" y="${H - 44}" fill="#71717a" font-size="13" font-weight="500">Ticknal Quantitative Terminal · Real-Time EGX &amp; Macro Intelligence</text>
           <text x="${W - 64}" y="${H - 44}" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">ticknal.com/news</text>`
    }
  </svg>`;

  return Buffer.from(svg, 'utf8');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    const lang = (searchParams.get('lang') === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
    const variant = (searchParams.get('variant') === 'square' ? 'square' : 'wide') as ChartVariant;
    const format = searchParams.get('format') || 'png';

    let row: typeof marketNews.$inferSelect | undefined;
    if (id) {
      const rows = await db.select().from(marketNews).where(eq(marketNews.id, id)).limit(1);
      row = rows[0];
    }

    let svgBuffer: Buffer | null = null;

    if (row?.imageUrl) {
      const resolvedDataUri = resolveLocalizedChartSvg(row.imageUrl, lang, variant);
      if (resolvedDataUri && resolvedDataUri.startsWith('data:image/svg+xml;base64,')) {
        const b64 = resolvedDataUri.replace('data:image/svg+xml;base64,', '');
        svgBuffer = Buffer.from(b64, 'base64');
      }
    }

    if (!svgBuffer) {
      const rawTitle = row?.title || 'Ticknal Market Intelligence';
      const titleParts = rawTitle.split(/\s*---AR---\s*|\s*\|\|\|\s*/);
      const cleanTitle = lang === 'ar' && row?.content ? row.content : titleParts[0] || rawTitle;

      const rawSummary = row?.summary || 'Real-time Egyptian Exchange (EGX) quantitative intelligence, institutional flows, and corporate disclosures.';
      const summaryParts = rawSummary.split(/\s*---AR---\s*|\s*\|\|\|\s*/);
      const cleanSummary =
        lang === 'ar' && summaryParts[1] ? summaryParts[1].trim() : (summaryParts[0] || rawSummary).trim();

      const tickers: string[] = Array.isArray(row?.tickers) ? row.tickers : [];

      const dateStr = row?.publishedAt ? new Date(row.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

      svgBuffer = buildWireSocialCardSvg({
        source: row?.source || 'Ticknal take',
        categoryLabel: row?.categoryLabel || row?.category || 'Market Intelligence',
        dateStr,
        title: cleanTitle,
        summary: cleanSummary,
        tickers,
        sentiment: row?.sentiment || 'neutral',
        locale: lang,
        variant,
      });
    }

    if (format === 'svg') {
      return new NextResponse(new Uint8Array(svgBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const pngBuffer = await sharp(svgBuffer).png({ compressionLevel: 8 }).toBuffer();

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[/api/news/og] Error generating social image:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
