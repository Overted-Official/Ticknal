'use client';

const testimonials = [
  {
    name: 'Ahmed El-Sayed',
    role: 'Quantitative EGX Day Trader',
    content: 'QuantEGX completely transformed my approach to the EGX30. The real-time signals are mathematically sound, and the push notifications mean I never miss an inflection point.',
    avatar: 'A',
  },
  {
    name: 'Khaled Mansour',
    role: 'Portfolio Manager, Cairo Capital',
    content: 'Backtesting the PSI strategies across 15 years of Egyptian market cycles gave our investment committee absolute confidence in algorithmic execution.',
    avatar: 'K',
  },
  {
    name: 'Sarah Tarek',
    role: 'Active Swing Trader',
    content: 'I used to spend 6 hours daily scanning candlestick charts on TradingView. Now I get automated multi-timeframe alerts directly on my phone with clear entry and ATR stops.',
    avatar: 'S',
  },
  {
    name: 'Omar Farouk',
    role: 'Derivatives & Equity Analyst',
    content: 'The TradingView Lightweight Charts integration with custom overlay indicators makes validating signals effortless. The platform responsiveness is elite.',
    avatar: 'O',
  },
  {
    name: 'Youssef Hassan',
    role: 'Independent Investor',
    content: 'The mark-to-market portfolio snapshots and EGX volume anomaly scanner give individual traders an institutional-grade edge without thousands in terminal fees.',
    avatar: 'Y',
  },
];

export default function Testimonials() {
  return (
    <section className="py-[112px] px-5 md:px-[40px] bg-transparent overflow-hidden relative w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-tv-accent/5 rounded-full blur-[110px] pointer-events-none" />
      
      {/* Heading */}
      <div className="max-w-[992px] mx-auto mb-12 text-center relative z-10 flex flex-col gap-3 items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs uppercase tracking-widest font-semibold">
          Community Feedback
        </div>
        <h2 className="text-[32px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize">
          What Our Traders Say
        </h2>
      </div>

      {/* Infinite Marquee Strip (scaled cards: 304px) */}
      <div className="relative flex overflow-x-hidden w-full group">
        <div className="animate-marquee flex gap-5 px-3 group-hover:pause">
          {[...testimonials, ...testimonials].map((t, idx) => (
            <div
              key={idx}
              className="w-[304px] shrink-0 bg-[#0f0f0f] border border-[rgba(255,255,255,0.12)] p-6 rounded-xl flex flex-col justify-between shadow-xl hover:border-tv-accent/50 transition-colors"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4 text-[#ff8c45]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                ))}
              </div>

              {/* Review Text */}
              <p className="text-white/85 text-xs sm:text-[13px] leading-relaxed mb-5 font-normal">
                "{t.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-2.5 mt-auto pt-3 border-t border-white/5">
                <div className="w-8 h-8 rounded-full bg-tv-accent/20 border border-tv-accent/30 flex items-center justify-center text-tv-accent font-bold text-xs">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold text-xs">{t.name}</h4>
                  <p className="text-white/50 text-[10px]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
