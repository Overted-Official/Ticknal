'use client';

import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black pt-12 pb-10 border-t border-[rgba(255,255,255,0.08)] w-full">
      <div className="max-w-[992px] mx-auto px-5">
        {/* Links Grid (scaled 80%) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-7 h-7 rounded-full bg-tv-accent flex items-center justify-center text-black font-bold">
                <BarChart2 size={15} strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-base tracking-tight">QuantEGX</span>
            </Link>
            <p className="text-white/50 text-xs leading-relaxed max-w-xs mb-5">
              The premier quantitative research and algorithmic trading platform engineered specifically for the Egyptian Stock Exchange (EGX).
            </p>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> EGX Live Feed Active
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#features" className="text-white/60 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-white/60 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="/invest" className="text-white/60 hover:text-white transition-colors">Invest & Charts</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#about" className="text-white/60 hover:text-white transition-colors">Why QuantEGX</Link></li>
              <li><Link href="#faq" className="text-white/60 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/positions" className="text-white/60 hover:text-white transition-colors">Portfolio Tracker</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="text-white/60 hover:text-white transition-colors">Risk Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-white/40">
          <p>© {new Date().getFullYear()} QuantEGX Inc. All algorithmic data is for informational purposes only.</p>
          <div className="flex items-center gap-4">
            <span>Built for Egyptian Capital Markets</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
