'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Signals', href: '#signals' },
    { name: 'Strategies', href: '#strategies' },
    { name: 'Markets', href: '#solutions' },
    { name: 'Performance', href: '#customers' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/[0.08]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto h-[72px] px-6 sm:px-10 lg:px-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <Image
              src="/logo-mark.svg"
              alt="Ticknal Logo"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
              priority
            />
          </div>
          <span className="text-white font-medium text-lg tracking-tight font-sans">
            Ticknal
          </span>
        </Link>

        {/* Desktop Links (Center) */}
        <nav className="hidden md:flex items-center gap-9">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-[14px] font-normal text-white/90 hover:text-white transition-colors tracking-tight font-sans"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions (Right) */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/login"
            className="text-[14px] font-normal text-white hover:text-white/80 transition-colors font-sans"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-all font-sans"
          >
            Start Trading
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isMobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden bg-black/95 backdrop-blur-2xl border-b border-white/10 px-6 py-6 flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-normal text-white/80 hover:text-white py-1.5 transition-colors font-sans"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-sm font-normal text-white hover:text-white/80 rounded-full border border-white/15"
              >
                Log In
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-medium text-black rounded-full bg-white hover:bg-white/90"
              >
                Start Trading
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
