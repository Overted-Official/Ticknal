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

export default function LandingPageView() {
  return (
    <SmoothScroll>
      <div className="min-h-screen w-full max-w-full overflow-x-clip bg-editorial-dark text-white selection:bg-white selection:text-black">
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
