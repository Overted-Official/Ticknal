'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function QuickStartSection() {
  return (
    <section className="bg-[#F9F9F9] py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-10 w-full max-w-full overflow-hidden flex justify-center items-center">
      <div className="max-w-[1360px] w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-[20px] bg-[#191919] p-3 sm:p-4 overflow-hidden flex flex-col lg:flex-row items-stretch border border-white/[0.06] shadow-2xl"
        >
          {/* Left: Text & Button */}
          <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-center items-start gap-8 z-10">
            <div className="flex flex-col gap-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-[#969290]">
                <span className="w-1.5 h-1.5 bg-[#969290] inline-block rounded-none" />
                <span>Start Trading</span>
              </div>

              {/* Heading */}
              <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-serif font-light text-white tracking-[-0.05em] leading-[1.2] max-w-md">
                See Why Top Traders Rely on Ticknal
              </h3>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-white/60 font-sans font-normal leading-relaxed max-w-sm">
                Access high-conviction signals, quantitative backtesting, and automated risk analytics today.
              </p>
            </div>

            {/* CTA Button */}
            <div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#080808] font-medium text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all font-sans"
              >
                Launch Terminal
              </Link>
            </div>
          </div>

          {/* Right: Dashboard UI Image */}
          <div className="lg:w-[58%] rounded-[12px] overflow-hidden bg-black/40 flex items-center justify-center relative min-h-[260px] sm:min-h-[340px] lg:min-h-[420px]">
            <img
              src="/images/landing/xDRVUBMMcJprOBkxsznD23x3Oc.png"
              alt="Ticknal Terminal Preview"
              className="w-full h-full object-cover object-left"
              loading="lazy"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}


