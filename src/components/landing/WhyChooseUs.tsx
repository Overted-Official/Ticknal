'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, TrendingUp } from '@/components/ui/icon-library';

const features = [
  {
    icon: <Zap className="w-6 h-6 text-tv-accent" />,
    title: '01 Fully Automated Alerts',
    description: 'Set your strategy parameters once and receive push notifications on desktop and mobile when a signal triggers. No more staring at charts all day.'
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-tv-accent" />,
    title: '02 Data-Driven Strategies',
    description: 'Our proprietary PSI indicator is specifically backtested and optimized for the Egyptian Stock Exchange, adapting dynamically to local market volatility.'
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-tv-accent" />,
    title: '03 Secure & Private',
    description: 'Your strategy settings and portfolio data are completely isolated. We only monitor the tickers you specify.'
  }
];

export default function WhyChooseUs() {
  return (
    <section className="pt-20 sm:pt-28 md:pt-32 px-4 sm:px-6 md:px-10 pb-0 bg-transparent w-full" id="about">
      <div className="max-w-248 mx-auto flex flex-col items-center">

        <div className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-164 w-full mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-tv-border text-plt-subtle text-xs font-medium w-fit"
          >
            Why Choose Us
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize"
          >
            Built for the Modern EGX Trader
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="card-shell p-5 sm:p-6 hover:bg-plt-muted-surface transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-full bg-tv-accent/10 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h5 className="text-base sm:text-card-title font-medium text-plt-text leading-snug tracking-normal mb-3">{feature.title}</h5>
                <p className="text-xs sm:text-body font-normal text-plt-subtle leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
