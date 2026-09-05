'use client';

const testimonials = [
  {
    name: 'Ahmed El-Sayed',
    role: 'Quantitative EGX Day Trader',
    content: 'Ticknal completely transformed my approach to the EGX30. The real-time signals are mathematically sound, and the push notifications mean I never miss an inflection point.',
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
    <section className="py-20 sm:py-28 px-4 sm:px-6 md:px-10 bg-transparent overflow-hidden relative w-full max-w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-tv-accent/5 rounded-full blur-28 pointer-events-none" />

      {/* Heading */}
      <div className="max-w-248 w-full max-w-full min-w-0 mx-auto mb-8 sm:mb-12 text-center relative z-10 flex flex-col gap-4 items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-plt-border text-plt-subtle text-xs tracking-widest font-medium">
          Community Feedback
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize">
          What Our Traders Say
        </h2>
      </div>

      {/* Infinite Marquee Strip */}
      <div className="relative flex overflow-hidden w-full max-w-full min-w-0 group">
        <div className="animate-marquee flex gap-4 sm:gap-6 px-4 group-hover:pause min-w-0">
          {[...testimonials, ...testimonials].map((t, idx) => (
            <div
              key={idx}
              className="w-76 shrink-0 bg-plt-surface border border-plt-border p-6 rounded-xl flex flex-col justify-between shadow-xl hover:border-tv-accent/50 transition-colors"
            >
              {/* Stars */}
              <div className="flex items-center gap-2 mb-4 text-plt-text">
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
              <p className="text-plt-text/85 text-xs sm:text-body leading-relaxed mb-6 font-normal">
                "{t.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-plt-border">
                <div className="w-8 h-8 rounded-full bg-tv-accent/20 border border-tv-accent/30 flex items-center justify-center text-tv-accent font-medium text-xs">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-plt-text font-medium text-xs">{t.name}</h4>
                  <p className="text-plt-muted text-mini">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
