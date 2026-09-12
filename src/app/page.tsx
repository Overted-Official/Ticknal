import SmoothScroll from '@/components/landing/SmoothScroll';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import WhyChooseUs from '@/components/landing/WhyChooseUs';
import BentoGrid from '@/components/landing/BentoGrid';
import LanguagesSection from '@/components/landing/LanguagesSection';
import Testimonials from '@/components/landing/Testimonials';
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
      <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#030303] text-white selection:bg-white selection:text-black">
        <Navbar />
        <Hero />
        <WhyChooseUs />
        <BentoGrid />
        <LanguagesSection />
        <Testimonials />
        <FAQ />
        <QuickStartSection />
        <Footer />
      </div>
    </SmoothScroll>
  );
}

