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
    <section className="pt-20 sm:pt-28 md:pt-32 px-4 sm:px-6 md:px-10 pb-0 bg-transparent w-full" id="features">
      <div className="max-w-248 mx-auto flex flex-col items-center">

        {/* Heading */}
        <div className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-164 w-full mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-tv-border text-plt-subtle text-xs font-medium w-fit"
          >
            Our Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize"
          >
            Our Powerful Dashboard Enables over 234,000 Analytics Everyday
          </motion.h2>
        </div>

        {/* Grid Body */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full">

          {/* Top Row */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full items-stretch">

            {/* FeatureBox 1 (60%) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="card-shell p-5 sm:p-7 lg:w-3/5 flex-shrink-0 relative overflow-hidden flex flex-col gap-6 justify-start items-start"
            >
              <div className="max-w-94 flex flex-col gap-3 relative z-10">
                <h5 className="text-base sm:text-card-title font-medium text-plt-text leading-snug tracking-normal">Real-time Market Insight</h5>
                <p className="text-xs sm:text-body font-normal text-plt-subtle leading-relaxed">
                  QuantEGX processes live EGX market data and volume metrics so you can spot momentum shifts before they hit the mainstream news.
                </p>
              </div>
              <div className="w-full relative h-56 sm:h-74 mt-auto">
                <Image src="https://framerusercontent.com/images/zTqDSkCJXFOajXZDvE21gUe2ccc.png" alt="Market Insight" fill className="object-cover object-top rounded-xl" />
              </div>
            </motion.div>

            {/* FeatureBox 2 (40%) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="card-shell p-5 sm:p-7 lg:flex-1 relative overflow-hidden flex flex-col justify-start min-h-[380px] lg:h-108"
            >
              <div className="flex flex-col gap-3 relative z-10">
                <h5 className="text-base sm:text-card-title font-medium text-plt-text leading-snug tracking-normal">Advanced Account Analysis</h5>
                <p className="text-xs sm:text-body font-normal text-plt-subtle leading-relaxed">
                  Customize the lookback periods and entry levels to match your exact risk profile.
                </p>
              </div>
              <div className="absolute top-40 right-6 w-40 h-24 rounded-xl overflow-hidden shadow-xl z-20">
                <Image src="https://framerusercontent.com/images/Qo4L5o21ONZT8qYq8oW210qt1jo.png" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-60 z-10">
                <Image src="https://framerusercontent.com/images/WLblAG7UB4PU4WU8f6mZ1fM7Lw.png" alt="Strategy" fill className="object-contain object-bottom" />
              </div>
            </motion.div>

          </div>

          {/* Bottom Row */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full items-stretch">

            {/* FeatureBox 3 (40%) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="card-shell p-5 sm:p-7 lg:flex-1 relative overflow-hidden flex flex-col justify-start min-h-[380px] lg:h-108"
            >
              <div className="flex flex-col gap-3 mb-4 relative z-10">
                <h5 className="text-base sm:text-card-title font-medium text-plt-text leading-snug tracking-normal">Portfolio Management</h5>
                <p className="text-xs sm:text-body font-normal text-plt-subtle leading-relaxed">
                  Easily tweak your trading journey with our interactive dashboard!
                </p>
              </div>

              {/* 3 Real SVG Ticker Rows */}
              <div className="flex flex-col gap-2 w-full mt-auto mb-4 overflow-hidden">
                {/* Row 1 */}
                <div className="flex gap-2 w-max animate-marquee">
                  {[...tickerRow1, ...tickerRow1, ...tickerRow1].map((src, idx) => (
                    <div key={`r1-${idx}`} className="w-36 h-20 relative flex-shrink-0">
                      <Image src={src} alt="Ticker Card" fill className="object-contain" />
                    </div>
                  ))}
                </div>

                {/* Row 2 (Reverse) */}
                <div className="marquee-reverse flex gap-2 w-max animate-marquee">
                  {[...tickerRow2, ...tickerRow2, ...tickerRow2].map((src, idx) => (
                    <div key={`r2-${idx}`} className="w-36 h-20 relative flex-shrink-0">
                      <Image src={src} alt="Ticker Card" fill className="object-contain" />
                    </div>
                  ))}
                </div>

                {/* Row 3 */}
                <div className="marquee-slow flex gap-2 w-max animate-marquee">
                  {[...tickerRow3, ...tickerRow3, ...tickerRow3].map((src, idx) => (
                    <div key={`r3-${idx}`} className="w-36 h-20 relative flex-shrink-0">
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
              className="card-shell p-5 sm:p-7 lg:w-3/5 flex-shrink-0 relative overflow-hidden flex flex-col min-h-[380px] lg:h-108"
            >
              <div className="flex flex-col gap-3 max-w-94 relative z-10">
                <h5 className="text-base sm:text-card-title font-medium text-plt-text leading-snug tracking-normal">Advanced Charting Tools</h5>
                <p className="text-xs sm:text-body font-normal text-plt-subtle leading-relaxed">
                  Integrated natively with TradingView's Lightweight Charts for buttery smooth historical data replays and real-time visualization of signals.
                </p>
              </div>
              <div className="absolute top-40 right-6 w-40 h-24 rounded-xl overflow-hidden shadow-xl z-20">
                <Image src="https://framerusercontent.com/images/PPtjqFf8yiy2Z80VVeYHEgrsw.png" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-62 z-10">
                <Image src="https://framerusercontent.com/images/vwPc4QOhE21NLvKenQecx7eWGA.png" alt="Charting Tools" fill className="object-contain object-bottom" />
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
}
