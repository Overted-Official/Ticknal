'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const tickerRow1 = [
  'https://framerusercontent.com/images/MVdFFtR0dYqoAB8A0HprrBnhRw.svg',
  'https://framerusercontent.com/images/bFLJ4lj6QeGRi2rlWHVIvGpAFmE.svg',
  'https://framerusercontent.com/images/sLLk8ztmq5L2gaQvGlA9hejnbY.svg',
  'https://framerusercontent.com/images/q8SZo4hSmSaVyAeLSiwjUpdE0.svg',
  'https://framerusercontent.com/images/MVdFFtR0dYqoAB8A0HprrBnhRw.svg',
];

const tickerRow2 = [
  'https://framerusercontent.com/images/LXyDxhsFoENCqFpmHWz2gATtns.svg',
  'https://framerusercontent.com/images/bFLJ4lj6QeGRi2rlWHVIvGpAFmE.svg',
  'https://framerusercontent.com/images/XVJZY3sD24jhqkDro0GmRsaZ8.svg',
  'https://framerusercontent.com/images/q8SZo4hSmSaVyAeLSiwjUpdE0.svg',
  'https://framerusercontent.com/images/LXyDxhsFoENCqFpmHWz2gATtns.svg',
];

const tickerRow3 = [
  'https://framerusercontent.com/images/bFLJ4lj6QeGRi2rlWHVIvGpAFmE.svg',
  'https://framerusercontent.com/images/yQujqN1UAPqlSiEtWmbppfT1tnI.svg',
  'https://framerusercontent.com/images/sLLk8ztmq5L2gaQvGlA9hejnbY.svg',
  'https://framerusercontent.com/images/eS9LrBe9HpbbjKIBNEXl4b7Y44.svg',
  'https://framerusercontent.com/images/6xI5kQjUKKrgVyRoUCVWR6cHX4.svg',
];

export default function BentoGrid() {
  return (
    <section className="pt-[128px] px-5 md:px-[40px] pb-0 bg-transparent w-full" id="features">
      <div className="max-w-[992px] mx-auto flex flex-col gap-[48px] items-center">
        
        {/* Heading */}
        <div className="flex flex-col gap-6 items-center text-center max-w-[654px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-tv-border text-white/80 text-xs font-medium w-fit"
          >
            Our Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[30px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize"
          >
            Our Powerful Dashboard Enables over 234,000 Analytics Everyday
          </motion.h2>
        </div>

        {/* Grid Body */}
        <div className="flex flex-col gap-[19px] w-full">
          
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row gap-[19px] w-full items-stretch">
            
            {/* FeatureBox 1 (60%) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:w-[60%] flex-shrink-0 rounded-lg border border-[rgba(255,255,255,0.16)] pt-[26px] px-[26px] relative overflow-hidden flex flex-col gap-6 justify-start items-start bg-cover bg-center"
              style={{ backgroundImage: 'url(https://framerusercontent.com/images/x3KbDL01c7lJBfh4hNVeUzTZZOc.jpg)' }}
            >
              <div className="max-w-[374px] flex flex-col gap-3.5 relative z-10">
                <h5 className="text-[22px] font-medium text-white leading-[1.3] tracking-[-0.02em]">Real-time Market Insight</h5>
                <p className="text-[13px] font-medium text-white/70 leading-[1.4] tracking-[-0.02em]">
                  QuantEGX processes live EGX market data and volume metrics so you can spot momentum shifts before they hit the mainstream news.
                </p>
              </div>
              <div className="w-full relative h-[296px] mt-auto">
                <Image src="https://framerusercontent.com/images/zTqDSkCJXFOajXZDvE21gUe2ccc.png" alt="Market Insight" fill className="object-cover object-top rounded-t-lg" />
              </div>
            </motion.div>

            {/* FeatureBox 2 (40%) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:flex-1 rounded-lg border border-[rgba(255,255,255,0.16)] pt-[26px] px-[26px] relative overflow-hidden flex flex-col justify-start h-[432px] bg-cover bg-center"
              style={{ backgroundImage: 'url(https://framerusercontent.com/images/x3KbDL01c7lJBfh4hNVeUzTZZOc.jpg)' }}
            >
              <div className="flex flex-col gap-3.5 relative z-10">
                <h5 className="text-[22px] font-medium text-white leading-[1.3] tracking-[-0.02em]">Advanced Account Analysis</h5>
                <p className="text-[13px] font-medium text-white/70 leading-[1.4] tracking-[-0.02em]">
                  Customize the lookback periods and entry levels to match your exact risk profile.
                </p>
              </div>
              <div className="absolute top-[162px] right-[22px] w-[160px] h-[97px] rounded-lg overflow-hidden shadow-xl z-20">
                <Image src="https://framerusercontent.com/images/Qo4L5o21ONZT8qYq8oW210qt1jo.png" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[242px] z-10">
                <Image src="https://framerusercontent.com/images/WLblAG7UB4PU4WU8f6mZ1fM7Lw.png" alt="Strategy" fill className="object-contain object-bottom" />
              </div>
            </motion.div>

          </div>

          {/* Bottom Row */}
          <div className="flex flex-col lg:flex-row gap-[19px] w-full items-stretch">
            
            {/* FeatureBox 3 (40%) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:flex-1 rounded-lg border border-[rgba(255,255,255,0.16)] pt-[26px] relative overflow-hidden flex flex-col justify-start h-[432px] bg-cover bg-center"
              style={{ backgroundImage: 'url(https://framerusercontent.com/images/x3KbDL01c7lJBfh4hNVeUzTZZOc.jpg)' }}
            >
              <div className="flex flex-col gap-3.5 px-[26px] mb-4 relative z-10">
                <h5 className="text-[22px] font-medium text-white leading-[1.3] tracking-[-0.02em]">Portfolio Management</h5>
                <p className="text-[13px] font-medium text-white/70 leading-[1.4] tracking-[-0.02em]">
                  Easily tweak your trading journey with our interactive dashboard!
                </p>
              </div>
              
              {/* 3 Real SVG Ticker Rows (scaled 80%: 144px x 76px) */}
              <div className="flex flex-col gap-1.5 w-full mt-auto mb-3 overflow-hidden">
                {/* Row 1 */}
                <div className="flex gap-2.5 w-max animate-marquee">
                  {[...tickerRow1, ...tickerRow1, ...tickerRow1].map((src, idx) => (
                    <div key={`r1-${idx}`} className="w-[144px] h-[76px] relative flex-shrink-0">
                      <Image src={src} alt="Ticker Card" fill className="object-contain" />
                    </div>
                  ))}
                </div>

                {/* Row 2 (Reverse) */}
                <div className="flex gap-2.5 w-max animate-marquee" style={{ animationDirection: 'reverse', animationDuration: '35s' }}>
                  {[...tickerRow2, ...tickerRow2, ...tickerRow2].map((src, idx) => (
                    <div key={`r2-${idx}`} className="w-[144px] h-[76px] relative flex-shrink-0">
                      <Image src={src} alt="Ticker Card" fill className="object-contain" />
                    </div>
                  ))}
                </div>

                {/* Row 3 */}
                <div className="flex gap-2.5 w-max animate-marquee" style={{ animationDuration: '40s' }}>
                  {[...tickerRow3, ...tickerRow3, ...tickerRow3].map((src, idx) => (
                    <div key={`r3-${idx}`} className="w-[144px] h-[76px] relative flex-shrink-0">
                      <Image src={src} alt="Ticker Card" fill className="object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* FeatureBox 4 (60%) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="lg:w-[60%] flex-shrink-0 rounded-lg border border-[rgba(255,255,255,0.16)] pt-[26px] px-[26px] relative overflow-hidden flex flex-col h-[432px] bg-cover bg-center"
              style={{ backgroundImage: 'url(https://framerusercontent.com/images/x3KbDL01c7lJBfh4hNVeUzTZZOc.jpg)' }}
            >
              <div className="flex flex-col gap-3.5 max-w-[374px] relative z-10">
                <h5 className="text-[22px] font-medium text-white leading-[1.3] tracking-[-0.02em]">Advanced Charting Tools</h5>
                <p className="text-[13px] font-medium text-white/70 leading-[1.4] tracking-[-0.02em]">
                  Integrated natively with TradingView's Lightweight Charts for buttery smooth historical data replays and real-time visualization of signals.
                </p>
              </div>
              <div className="absolute top-[162px] right-[22px] w-[160px] h-[97px] rounded-lg overflow-hidden shadow-xl z-20">
                <Image src="https://framerusercontent.com/images/PPtjqFf8yiy2Z80VVeYHEgrsw.png" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-[251px] z-10">
                <Image src="https://framerusercontent.com/images/vwPc4QOhE21NLvKenQecx7eWGA.png" alt="Charting Tools" fill className="object-contain object-bottom" />
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
}
