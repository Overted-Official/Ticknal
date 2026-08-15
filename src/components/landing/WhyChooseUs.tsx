'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-5 h-5 text-tv-accent" />,
    title: '01 Fully Automated Alerts',
    description: 'Set your strategy parameters once and receive push notifications on desktop and mobile when a signal triggers. No more staring at charts all day.'
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-tv-accent" />,
    title: '02 Data-Driven Strategies',
    description: 'Our proprietary PSI indicator is specifically backtested and optimized for the Egyptian Stock Exchange, adapting dynamically to local market volatility.'
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-tv-accent" />,
    title: '03 Secure & Private',
    description: 'Your strategy settings and portfolio data are completely isolated. We only monitor the tickers you specify.'
  }
];

export default function WhyChooseUs() {
  return (
    <section className="pt-[128px] px-5 md:px-[40px] pb-0 bg-transparent w-full" id="about">
      <div className="max-w-[992px] mx-auto flex flex-col items-center">
        
        <div className="flex flex-col gap-6 items-center text-center max-w-[654px] w-full mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-tv-border text-white/80 text-xs font-medium w-fit"
          >
            Why Choose Us
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[34px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize"
          >
            Built for the Modern EGX Trader
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[19px] w-full">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-[#1a1717]/50 border border-[rgba(255,255,255,0.16)] p-[26px] rounded-lg hover:bg-[#1a1717] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-full bg-tv-accent/10 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h5 className="text-[22px] font-medium text-white leading-[1.3] tracking-[-0.02em] mb-3">{feature.title}</h5>
                <p className="text-[13px] font-medium text-white/70 leading-[1.4] tracking-[-0.02em]">
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
