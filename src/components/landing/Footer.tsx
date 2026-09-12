'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#000000] text-white w-full max-w-full overflow-hidden relative">
      <div className="max-w-[1440px] w-full mx-auto">
        {/* Top Banner */}
        <div className="px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-serif font-light text-white tracking-[-0.05em]">
            Supercharge Your Trading Performance
          </h3>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#080808] font-medium text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all font-sans whitespace-nowrap"
          >
            Start Trading
          </Link>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-white/[0.1]" />

        {/* Main Navigation */}
        <div className="px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex flex-col md:flex-row justify-between items-start gap-12">
          {/* Logo */}
          <div className="md:w-1/3">
            <Link href="/" className="inline-block w-[26px] h-[26px]">
              <img
                src="/logo-mark.svg"
                alt="Ticknal"
                className="w-full h-full object-contain"
              />
            </Link>
          </div>

          {/* Links Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-16 lg:gap-24 md:w-2/3 justify-between">
            {/* Product */}
            <div>
              <p className="text-sm font-medium text-white/50 mb-4 font-sans">Platform</p>
              <ul className="space-y-3 text-sm font-medium font-sans">
                <li>
                  <Link href="#signals" className="text-white hover:text-white/80 transition-colors">
                    Signals
                  </Link>
                </li>
                <li>
                  <Link href="#strategies" className="text-white hover:text-white/80 transition-colors">
                    Strategies
                  </Link>
                </li>
                <li>
                  <Link href="#solutions" className="text-white hover:text-white/80 transition-colors">
                    Markets
                  </Link>
                </li>
                <li>
                  <Link href="#customers" className="text-white hover:text-white/80 transition-colors">
                    Performance
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-sm font-medium text-white/50 mb-4 font-sans">Company</p>
              <ul className="space-y-3 text-sm font-medium font-sans">
                <li>
                  <Link href="#signals" className="text-white hover:text-white/80 transition-colors">
                    About Ticknal
                  </Link>
                </li>
                <li>
                  <Link href="#product" className="text-white hover:text-white/80 transition-colors">
                    Methodology
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="text-white hover:text-white/80 transition-colors">
                    Security
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-white hover:text-white/80 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <p className="text-sm font-medium text-white/50 mb-4 font-sans">Connect</p>
              <ul className="space-y-3 text-sm font-medium font-sans">
                <li>
                  <Link href="/login" className="text-white hover:text-white/80 transition-colors">
                    Terminal Login
                  </Link>
                </li>
                <li>
                  <a
                    href="https://t.me"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    Telegram
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    X (Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Giant Watermark */}
        <div className="px-6 sm:px-10 lg:px-12 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative min-h-[140px] sm:min-h-[220px]">
          {/* Copyright Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-xs relative z-10 font-sans">
            <span className="text-white/90 font-medium">
              Ticknal Quantitative Technologies
            </span>
            <span className="text-white/60">© Copyright 2026 Ticknal. All rights reserved.</span>
          </div>

          {/* Faded Watermark Logo */}
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-10 select-none overflow-hidden max-w-full flex justify-end items-end">
            <img
              src="/images/landing/ticknal_watermark.svg"
              alt="Ticknal"
              className="w-[450px] sm:w-[650px] md:w-[911px] h-auto object-contain translate-y-[10%]"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}


