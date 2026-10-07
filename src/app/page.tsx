import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPageView from '@/components/landing/LandingPageView';
import {
  getLandingMarqueeTickers,
  getLandingCoverageCardsData,
} from '@/lib/server/landing-queries';

export default async function LandingPage() {
  const headerList = await headers();
  const userId = headerList.get('x-user-id');
  if (userId) {
    redirect('/home');
  }

  let tickers: any[] = [];
  let coverageCards: any[] = [];
  try {
    const [fetchedTickers, fetchedCards] = await Promise.all([
      getLandingMarqueeTickers(),
      getLandingCoverageCardsData(),
    ]);
    tickers = fetchedTickers;
    coverageCards = fetchedCards;
  } catch (err) {
    console.error('Error loading landing page data:', err);
  }

  return (
    <LandingPageView
      initialTickers={tickers}
      initialCoverageCards={coverageCards}
    />
  );
}
