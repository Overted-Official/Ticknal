'use client';

import { motion, useInView, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

const stats = [
  { value: 250, suffix: '+', label: 'EGX Stocks Covered' },
  { value: 32, suffix: 'K+', label: 'Signals Analyzed' },
  { value: 15, suffix: '+', label: 'Years of Backtests' },
  { value: 98, suffix: '%', label: 'Signal Accuracy' },
  { value: 24, suffix: '/7', label: 'Automated Alerts' },
];

function Counter({ from = 0, to, duration = 2, prefix = '', suffix = '' }: any) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: "-40px" });

  useEffect(() => {
    if (inView && nodeRef.current) {
      const controls = animate(from, to, {
        duration,
        ease: "easeOut",
        onUpdate(value) {
          if (nodeRef.current) {
            nodeRef.current.textContent = `${prefix}${Math.floor(Number(value))}${suffix}`;
          }
        },
      });
      return () => controls.stop();
    }
  }, [inView, from, to, duration, prefix, suffix]);

  return <span ref={nodeRef}>{prefix}{from}{suffix}</span>;
}

export default function Stats() {
  return (
    <section className="pt-8 px-4 md:px-[40px] pb-5 bg-transparent w-full">
      <div className="max-w-[992px] mx-auto flex flex-col items-center gap-8">
        
        {/* Heading Pill */}
        <div className="bg-white/[0.04] border border-white/10 rounded-lg py-2.5 px-5 flex flex-row items-center justify-center gap-3 shadow-sm">
          <span className="text-sm md:text-base font-medium text-white">Excellent</span>
          <div className="flex items-center gap-1 text-[#ff8c45]">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            ))}
          </div>
          <span className="text-xs md:text-sm font-bold text-white/90 tracking-wider uppercase ml-1">QuantEGX</span>
        </div>

        {/* Stats Row */}
        <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-5 md:gap-0 items-center justify-between border-y border-white/5 py-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className={`flex flex-col items-center justify-center text-center gap-1.5 px-3 ${
                idx !== stats.length - 1 ? 'md:border-r md:border-white/10' : ''
              }`}
            >
              <h3 className="text-2xl sm:text-3xl lg:text-[38px] font-medium text-white tracking-[-0.02em] leading-tight">
                <Counter to={stat.value} suffix={stat.suffix} />
              </h3>
              <p className="text-[11px] sm:text-xs text-white/60 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
