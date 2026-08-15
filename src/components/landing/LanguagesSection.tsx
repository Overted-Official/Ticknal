'use client';

import { motion } from 'framer-motion';

const languages = [
  { name: 'Arabic (العربية)', flag: '🇪🇬' },
  { name: 'English (US)', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Canada', flag: '🇨🇦' },
];

export default function LanguagesSection() {
  return (
    <section className="pt-[128px] px-5 md:px-[40px] pb-[96px] bg-transparent w-full">
      <div className="max-w-[992px] mx-auto flex flex-col gap-[64px] items-center">
        
        {/* Heading */}
        <div className="flex flex-col gap-6 items-center text-center max-w-[654px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-tv-border text-white/80 text-xs font-medium w-fit"
          >
            Languages & Coverage
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[32px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize"
          >
            Customer Support in 18 Languages
          </motion.h2>
        </div>

        {/* Badges Grid (scaled 80%) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-3 max-w-[800px] mx-auto"
        >
          {languages.map((lang, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, borderColor: 'rgba(255, 100, 13, 0.6)' }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2.5 px-[20px] py-[10px] rounded-full bg-[#1a1717]/60 border border-[rgba(255,255,255,0.16)] text-white/85 text-xs sm:text-sm font-medium shadow-sm hover:bg-[#1a1717] hover:text-white transition-all cursor-default"
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
