'use client';

import { motion } from 'framer-motion';
import { Globe2 } from '@/components/ui/icon-library';

const languages = [
  'Arabic (العربية)',
  'English (US)',
  'United Kingdom',
  'Saudi Arabia',
  'United Arab Emirates',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Sweden',
  'Switzerland',
  'Singapore',
  'Japan',
  'Canada',
];

export default function LanguagesSection() {
  return (
    <section className="pt-20 sm:pt-28 md:pt-32 px-4 sm:px-6 md:px-10 pb-16 sm:pb-24 bg-transparent w-full" id="coverage">
      <div className="max-w-248 mx-auto flex flex-col gap-8 sm:gap-16 items-center">

        {/* Heading */}
        <div className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-164 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-tv-border text-plt-subtle text-xs font-medium w-fit"
          >
            Languages & Coverage
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize"
          >
            Customer Support in 18 Languages
          </motion.h2>
        </div>

        {/* Badges Grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 max-w-200 mx-auto"
        >
          {languages.map((language) => (
            <motion.div
              key={language}
              whileHover={{ scale: 1.05, borderColor: 'var(--plt-accent-border)' }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 rounded-full bg-plt-muted-surface/60 border border-plt-border-strong text-plt-text/85 text-xs sm:text-sm font-medium shadow-sm hover:bg-plt-muted-surface hover:text-plt-text transition-all cursor-default"
            >
              <Globe2 className="h-4 w-4 text-plt-muted" aria-hidden="true" />
              <span>{language}</span>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
