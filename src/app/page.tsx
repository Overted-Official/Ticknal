import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPageView from '@/components/landing/LandingPageView';
import {
  getLandingMarqueeTickers,
  getLandingCoverageCardsData,
} from '@/lib/server/landing-queries';
import { getSubscriptionPlans } from '@/lib/server/plans-service';

export default async function LandingPage() {
  const headerList = await headers();
  const userId = headerList.get('x-user-id');
  if (userId) {
    redirect('/home');
  }

  let tickers: any[] = [];
  let coverageCards: any[] = [];
  let plans: any[] = [];
  try {
    const [fetchedTickers, fetchedCards, fetchedPlans] = await Promise.all([
      getLandingMarqueeTickers(),
      getLandingCoverageCardsData(),
      getSubscriptionPlans(),
    ]);
    tickers = fetchedTickers;
    coverageCards = fetchedCards;
    // Map to JSON-serializable structure for Client Component
    plans = fetchedPlans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      monthlyPriceEgp: p.monthlyPriceEgp,
      annualPriceEgp: p.annualPriceEgp,
      annualDiscountPct: p.annualDiscountPct,
      badge: p.badge,
      color: p.color,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
      limits: p.limits,
      features: p.features,
    }));
  } catch (err) {
    console.error('Error loading landing page data:', err);
  }

  return (
    <LandingPageView
      initialTickers={tickers}
      initialCoverageCards={coverageCards}
      initialPlans={plans}
    />
  );
}
