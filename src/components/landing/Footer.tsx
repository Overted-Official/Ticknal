'use client';

import Link from 'next/link';
import { BarChart2 } from '@/components/ui/icon-library';

export default function Footer() {
  return (
    <footer className="bg-plt-base pt-12 pb-10 border-t border-plt-border-soft w-full max-w-full overflow-hidden">
      <div className="max-w-248 w-full max-w-full min-w-0 mx-auto px-4 sm:px-6">
        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-8 h-8 rounded-full bg-tv-accent flex items-center justify-center text-plt-inverse font-medium">
                <BarChart2 size={16} strokeWidth={2.5} />
              </div>
              <span className="text-plt-text font-medium text-base tracking-tight">Ticknal</span>
            </Link>
            <p className="text-plt-muted text-xs leading-relaxed max-w-xs mb-6">
              The premier quantitative research and algorithmic trading platform engineered specifically for the Egyptian Stock Exchange (EGX).
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-2 py-2 rounded-full bg-plt-profit/10 border border-plt-profit/20 text-plt-profit text-mini font-medium">
                <span className="w-2 h-2 rounded-full bg-plt-profit animate-pulse" /> EGX Live Feed Active
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-plt-text font-medium text-xs tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#features" className="text-plt-subtle hover:text-plt-text transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-plt-subtle hover:text-plt-text transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="text-plt-subtle hover:text-plt-text transition-colors">Dashboard</Link></li>
              <li><Link href="/invest" className="text-plt-subtle hover:text-plt-text transition-colors">Invest & Charts</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-plt-text font-medium text-xs tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#about" className="text-plt-subtle hover:text-plt-text transition-colors">Why Ticknal</Link></li>
              <li><Link href="#faq" className="text-plt-subtle hover:text-plt-text transition-colors">FAQ</Link></li>
              <li><Link href="/positions" className="text-plt-subtle hover:text-plt-text transition-colors">Portfolio Tracker</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-plt-text font-medium text-xs tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#" className="text-plt-subtle hover:text-plt-text transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-plt-subtle hover:text-plt-text transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="text-plt-subtle hover:text-plt-text transition-colors">Risk Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-plt-border flex flex-col md:flex-row items-center justify-between gap-4 text-caption text-plt-muted">
          <p>&copy; {new Date().getFullYear()} Ticknal Inc. All algorithmic data is for informational purposes only.</p>
          <div className="flex items-center gap-4">
            <span>Built for Egyptian Capital Markets</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
