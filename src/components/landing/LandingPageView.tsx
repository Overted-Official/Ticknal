'use client';

import React from 'react';
import SmoothScroll from '@/components/landing/SmoothScroll';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingHero from '@/components/landing/LandingHero';
import LandingTickerMarquee from '@/components/landing/LandingTickerMarquee';
import LandingAssetCoverage from '@/components/landing/LandingAssetCoverage';
import LandingWorkflowPipeline from '@/components/landing/LandingWorkflowPipeline';
import LandingBrokerWorkflowSection from '@/components/landing/LandingBrokerWorkflowSection';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingCtaSection from '@/components/landing/LandingCtaSection';
import LandingFaqSection from '@/components/landing/LandingFaqSection';
import LandingFooter from '@/components/landing/LandingFooter';
import type {
  LandingMarqueeTicker,
  LandingCoverageCard,
} from '@/lib/server/landing-queries';
import type { SerializedSubscriptionPlan } from '@/components/landing/LandingPricingSection';

interface LandingPageViewProps {
  initialTickers?: LandingMarqueeTicker[];
  initialCoverageCards?: LandingCoverageCard[];
  initialPlans?: SerializedSubscriptionPlan[];
}

export default function LandingPageView({
  initialTickers = [],
  initialCoverageCards = [],
  initialPlans = [],
}: LandingPageViewProps) {
  return (
    <SmoothScroll>
      <div className="relative min-h-screen w-full bg-black text-white flex flex-col justify-between selection:bg-white selection:text-black font-sans overflow-x-hidden">
        {/* Floating TradingView-Inspired Top Navigation Bar */}
        <LandingNavbar />

        <main className="relative z-10 flex-1 w-full flex flex-col bg-transparent">
          {/* 1. Hero Section with iPad Pro 13" / iPhone 16 Pro Mockups */}
          <LandingHero />

          {/* 2. 293 EGX Equities Live Marquee Wall */}
          <LandingTickerMarquee tickers={initialTickers} />

          {/* 3. The 3 Asset Pillars: Equities, Mutual Funds, and Precious Metals */}
          <LandingAssetCoverage initialCards={initialCoverageCards} />

          {/* 4. The 4-Step Calm Investing Workflow Pipeline */}
          <LandingWorkflowPipeline />

          {/* 5. Broker Execution & Ticknal Edge Workflow: Strategies -> Alerts -> Broker Execution */}
          <LandingBrokerWorkflowSection />

          {/* 6. Transparent Local Pricing in EGP */}
          <LandingPricingSection initialPlans={initialPlans} />

          {/* 8. Final Call to Action: Stop Trading in the Dark */}
          <LandingCtaSection />

          {/* 9. Frequently Asked Questions */}
          <LandingFaqSection />
        </main>

        {/* 10. Institutional Egyptian Financial Ecosystem Footer */}
        <LandingFooter />
      </div>
    </SmoothScroll>
  );
}
