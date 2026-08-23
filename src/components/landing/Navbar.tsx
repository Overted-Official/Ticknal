'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthButton from './AuthButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, BarChart2 } from '@/components/ui/icon-library';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'About', href: '#about' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-tv-nav pointer-events-none flex justify-center px-4 pt-4 md:pt-6">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`pointer-events-auto w-full max-w-170 rounded-full transition-all duration-300 px-4 py-2 flex items-center justify-between border ${
          isScrolled
            ? 'bg-plt-base/75 backdrop-blur-xl border-plt-border-strong shadow-panel'
            : 'bg-plt-base/40 backdrop-blur-md border-plt-border shadow-panel'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-tv-accent flex items-center justify-center text-plt-inverse font-medium shadow-accent group-hover:scale-105 transition-transform">
            <BarChart2 size={16} strokeWidth={2.5} />
          </div>
          <span className="text-plt-text font-medium text-sm tracking-tight">QuantEGX</span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-caption font-medium text-plt-subtle hover:text-plt-text transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2">
          <AuthButton variant="ghost">
            Sign In
          </AuthButton>
          <AuthButton
            variant="primary"
            className="text-caption"
          >
            Get Started
          </AuthButton>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-plt-text p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </motion.div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="surface-popover pointer-events-auto fixed top-16 left-4 right-4 max-w-80 mx-auto flex flex-col gap-2 md:hidden"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-medium text-plt-subtle hover:text-plt-text py-2 px-2 rounded-xl hover:bg-plt-hover transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-plt-border flex flex-col gap-2">
              <AuthButton variant="ghost" className="w-full">
                Sign In
              </AuthButton>
              <AuthButton variant="primary" className="w-full">
                Get Started
              </AuthButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
