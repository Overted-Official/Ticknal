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

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-black overflow-x-hidden font-sans text-white selection:bg-tv-accent selection:text-black">
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
