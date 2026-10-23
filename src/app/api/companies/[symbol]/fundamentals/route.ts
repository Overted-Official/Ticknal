import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  companyFinancialStatements,
  companyValuationMetrics,
  tickers,
  CompanyFinancialStatement,
  CompanyValuationMetric,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export interface CompanyFundamentalsResponse {
  symbol: string;
  currency: string;
  valuation: CompanyValuationMetric | null;
  statements: {
    annual: CompanyFinancialStatement[];
    quarterly: CompanyFinancialStatement[];
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> | { symbol: string } }
) {
  try {
    const resolvedParams = await context.params;
    const rawSymbol = resolvedParams?.symbol || '';
    const cleanSymbol = decodeURIComponent(rawSymbol)
      .trim()
      .toUpperCase()
      .replace(/\.CA$/, '')
      .replace(/^EGX:/, '');

    if (!cleanSymbol) {
      return NextResponse.json(
        { error: 'Valid ticker symbol is required' },
        { status: 400 }
      );
    }

    const [tickerRows, valuationRows, statementRows] = await Promise.all([
      db.select().from(tickers).where(eq(tickers.symbol, cleanSymbol)).limit(1),
      db
        .select()
        .from(companyValuationMetrics)
        .where(eq(companyValuationMetrics.symbol, cleanSymbol))
        .orderBy(desc(companyValuationMetrics.date))
        .limit(1),
      db
        .select()
        .from(companyFinancialStatements)
        .where(eq(companyFinancialStatements.symbol, cleanSymbol))
        .orderBy(desc(companyFinancialStatements.reportDate)),
    ]);

    const ticker = tickerRows[0] || null;
    const valuation = valuationRows[0] || null;

    const annual = statementRows.filter(
      (s) => s.periodType?.toUpperCase() === 'ANNUAL'
    );
    const quarterly = statementRows.filter(
      (s) => s.periodType?.toUpperCase() === 'QUARTERLY'
    );

    const currency =
      ticker?.currency ||
      (valuation as any)?.currency ||
      annual[0]?.currency ||
      quarterly[0]?.currency ||
      'EGP';

    const payload: CompanyFundamentalsResponse = {
      symbol: cleanSymbol,
      currency,
      valuation: valuation || null,
      statements: {
        annual,
        quarterly,
      },
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Failed to query company fundamentals:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
