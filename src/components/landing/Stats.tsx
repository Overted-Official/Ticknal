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
    <section className="pt-8 px-4 md:px-10 pb-6 bg-transparent w-full max-w-full overflow-hidden">
      <div className="max-w-248 w-full max-w-full min-w-0 mx-auto flex flex-col items-center gap-6 sm:gap-8">

        {/* Heading Pill */}
        <div className="bg-plt-hover border border-plt-border rounded-xl py-2 px-6 flex flex-row items-center justify-center gap-4 shadow-sm">
          <span className="text-sm md:text-base font-medium text-plt-text">Excellent</span>
          <div className="flex items-center gap-2 text-plt-text">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            ))}
          </div>
          <span className="text-xs md:text-sm font-medium text-plt-text/90 tracking-wider ml-2">QuantEGX</span>
        </div>

        {/* Stats Row */}
        <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-0 items-center justify-between border-y border-plt-border py-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className={`flex flex-col items-center justify-center text-center gap-2 px-4 ${
                idx === stats.length - 1 ? 'col-span-2 md:col-span-1' : ''
              } ${
                idx !== stats.length - 1 ? 'md:border-r md:border-plt-border' : ''
              }`}
            >
              <h3 className="text-2xl sm:text-3xl lg:text-stat font-medium text-plt-text tracking-normal leading-tight">
                <Counter to={stat.value} suffix={stat.suffix} />
              </h3>
              <p className="text-caption sm:text-xs text-plt-subtle font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
