import SmoothScroll from '@/components/landing/SmoothScroll';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import TrustedBy from '@/components/landing/TrustedBy';
import WhyChooseUs from '@/components/landing/WhyChooseUs';
import BentoGrid from '@/components/landing/BentoGrid';
import LanguagesSection from '@/components/landing/LanguagesSection';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import CompareSection from '@/components/landing/CompareSection';
import FAQ from '@/components/landing/FAQ';
import QuickStartSection from '@/components/landing/QuickStartSection';
import Footer from '@/components/landing/Footer';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-plt-base overflow-x-hidden font-sans text-plt-text selection:bg-tv-accent selection:text-plt-inverse">
        <Navbar />
        <Hero />
        <Stats />
        <TrustedBy />
        <WhyChooseUs />
        <BentoGrid />
        <LanguagesSection />
        <Testimonials />
        <Pricing />
        <CompareSection />
        <FAQ />
        <QuickStartSection />
        <Footer />
      </div>
    </SmoothScroll>
  );
}
