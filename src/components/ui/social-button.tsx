'use client';

import React, { useState, useRef, useEffect, type RefObject } from 'react';
import { Check, Copy, Share2 } from '@/components/ui/icon-library';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    // Use capture phase so outer clicks are intercepted cleanly even if child buttons stop propagation
    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handler, enabled]);
}

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.62 1.62 0 1 0 1.63 1.62A1.63 1.63 0 0 0 7.83 6.2z" />
  </svg>
);

export interface SocialButtonProps {
  className?: string;
  url?: string;
  title?: string;
  shareCount?: number;
  variant?: 'compact' | 'default';
  iconOnly?: boolean;
}

export default function SocialButton({
  className,
  url,
  title,
  shareCount,
  variant = 'compact',
  iconOnly = false,
}: SocialButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsExpanded(false), isExpanded);

  const getShareUrl = () => {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return 'https://ticknal.com';
  };

  const getShareTitle = () => {
    if (title) return title;
    return 'Ticknal Market Intelligence';
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareTitle())}&url=${encodeURIComponent(getShareUrl())}`;
    window.open(shareLink, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`;
    window.open(shareLink, '_blank', 'noopener,noreferrer');
  };

  const handleShareInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCopy();
  };

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(getShareUrl());
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCompact = variant === 'compact';

  // Crisp dimensions
  const collapsedWidth = isCompact
    ? iconOnly
      ? 28
      : typeof shareCount === 'number'
      ? 52
      : 72
    : iconOnly
    ? 48
    : 120;
  const expandedWidth = isCompact ? 154 : 210;
  const height = isCompact ? 28 : 48;

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center select-none font-sans', className)}
    >
      <motion.div
        data-testid="social-share-btn"
        animate={{
          width: isExpanded ? expandedWidth : collapsedWidth,
          height,
        }}
        className={cn(
          'relative flex items-center overflow-hidden',
          'bg-black text-white',
          'border border-white/15 hover:border-white/30',
          'cursor-pointer',
          isCompact ? 'rounded-[8px]' : 'rounded-full shadow-sm hover:shadow-md'
        )}
        initial={false}
        onClick={() => setIsExpanded((prev) => !prev)}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 26,
          mass: 0.8,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isExpanded ? (
            <motion.div
              key="share-collapsed"
              className={cn(
                'w-full h-full flex items-center justify-center',
                iconOnly ? 'px-0' : 'gap-1.5 px-2.5'
              )}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Share2
                size={isCompact ? 13 : 16}
                className={cn(
                  isCompact ? 'text-zinc-300 shrink-0' : 'h-4 w-4 shrink-0'
                )}
              />
              {!iconOnly && (
                <span
                  className={cn(
                    'font-medium text-white tabular-nums select-none',
                    isCompact ? 'text-[11.5px]' : 'text-sm'
                  )}
                >
                  {typeof shareCount === 'number' ? shareCount : 'Share'}
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="share-expanded"
              className="w-full h-full flex items-center justify-center gap-1 px-1.5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {/* Twitter / X */}
              <button
                className={cn(
                  'flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 cursor-pointer shrink-0',
                  isCompact ? 'h-5.5 w-5.5' : 'h-9 w-9 rounded-full'
                )}
                onClick={handleShareTwitter}
                type="button"
                title="Share on Twitter / X"
              >
                <TwitterIcon className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>

              {/* Instagram */}
              <button
                className={cn(
                  'flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#E1306C] hover:bg-[#E1306C]/10 cursor-pointer shrink-0',
                  isCompact ? 'h-5.5 w-5.5' : 'h-9 w-9 rounded-full'
                )}
                onClick={handleShareInstagram}
                type="button"
                title="Copy link for Instagram"
              >
                <InstagramIcon className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>

              {/* LinkedIn */}
              <button
                className={cn(
                  'flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 cursor-pointer shrink-0',
                  isCompact ? 'h-5.5 w-5.5' : 'h-9 w-9 rounded-full'
                )}
                onClick={handleShareLinkedin}
                type="button"
                title="Share on LinkedIn"
              >
                <LinkedinIcon className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>

              <div
                className={cn(
                  'mx-0.5 bg-white/20 shrink-0',
                  isCompact ? 'h-3.5 w-px' : 'h-5 w-px'
                )}
              />

              {/* Copy Link */}
              <button
                className={cn(
                  'flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0',
                  isCompact ? 'h-5.5 w-5.5' : 'h-9 w-9 rounded-full',
                  copied && 'bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                )}
                onClick={handleCopy}
                type="button"
                title={copied ? 'Link Copied!' : 'Copy Link'}
              >
                {copied ? (
                  <Check className={cn(isCompact ? 'h-3 w-3 text-emerald-400' : 'h-4 w-4')} />
                ) : (
                  <Copy className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
