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

    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handler, enabled]);
}

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.62 1.62 0 1 0 1.63 1.62A1.63 1.63 0 0 0 7.83 6.2z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.186 24C5.514 24 0 18.57 0 12.002 0 5.435 5.514.004 12.186.004c6.625 0 12.029 5.345 12.029 11.865 0 .73-.067 1.455-.2 2.164-.265 1.412-1.632 2.302-3.056 2.036-1.423-.266-2.316-1.633-2.05-3.045.071-.38.106-.77.106-1.155 0-4.757-3.92-8.625-8.829-8.625-4.908 0-8.828 3.868-8.828 8.758 0 4.89 3.92 8.758 8.828 8.758 2.62 0 5.086-1.127 6.78-3.097.973-1.132 2.68-1.25 3.811-.277 1.131.974 1.25 2.681.277 3.812C18.665 22.84 15.523 24 12.186 24zm4.49-11.457c-.12-3.47-2.327-5.59-5.467-5.59-3.418 0-5.748 2.502-5.748 6.177 0 3.791 2.38 6.136 5.869 6.136 2.115 0 3.951-.954 4.896-2.541.45-.757 1.433-1.002 2.19-.551.758.45 1.003 1.432.553 2.19-1.49 2.504-4.225 3.902-7.639 3.902-5.228 0-8.869-3.568-8.869-9.136 0-5.452 3.61-9.177 8.748-9.177 4.792 0 8.358 3.328 8.47 8.441.018.82-.036 1.764-.17 2.68-.088.6-.328 1.16-.708 1.62-.73.882-1.84 1.39-3.045 1.39-1.22 0-2.35-.59-2.917-1.57-.45-.78-.5-1.74-.14-2.71.49-1.33 1.63-2.19 3.01-2.19.46 0 .91.1 1.33.29.35.16.75.02.91-.33.16-.35.02-.75-.33-.91-.65-.3-1.35-.45-2.07-.45-2.06 0-3.79 1.28-4.52 3.27-.47 1.29-.4 2.61.2 3.65.87 1.5 2.52 2.39 4.3 2.39 1.87 0 3.57-.8 4.7-2.17.65-.79 1.05-1.75 1.2-2.77.16-1.1.22-2.22.2-3.21z" />
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

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.87-4.47V8.53a8.27 8.27 0 0 0 4.9 1.6v-3.44h-1z" />
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
  variant = 'compact',
  iconOnly = true,
}: SocialButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsExpanded(false), isExpanded);

  const getShareUrl = () => {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return 'https://ticknal.com/news';
  };

  const getShareTitle = () => {
    if (title) return title;
    return 'Ticknal Market Intelligence';
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

  const handleNativeOrCopy = async (platform: 'instagram' | 'tiktok', e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getShareUrl();
    const shareTitle = getShareTitle();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle} — Ticknal`,
          url: shareUrl,
        });
        setIsExpanded(false);
        return;
      } catch {
        // Fall back to copy if dismissed or unsupported
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      setFeedbackText(platform === 'instagram' ? 'Copied for Instagram!' : 'Copied for TikTok!');
      setTimeout(() => {
        setCopied(false);
        setFeedbackText(null);
      }, 2000);

      const targetWeb = platform === 'instagram' ? 'https://www.instagram.com' : 'https://www.tiktok.com';
      window.open(targetWeb, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  const shareUrl = getShareUrl();
  const shareTitle = getShareTitle();

  const xShareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const threadsShareUrl = `https://threads.net/intent/post?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`;

  // Precise collapsed & expanded widths
  const collapsedWidth = 28;
  const expandedWidth = 186; // Exactly 7 icon actions with hairline gaps
  const height = 28;

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center select-none font-sans shrink-0', className)}
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
          'cursor-pointer rounded-[8px] transition-colors'
        )}
        initial={false}
        onClick={() => setIsExpanded((prev) => !prev)}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 28,
          mass: 0.8,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isExpanded ? (
            <motion.div
              key="share-collapsed"
              className="w-full h-full flex items-center justify-center px-0"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Share2 size={13} className="text-zinc-300 shrink-0" />
            </motion.div>
          ) : (
            <motion.div
              key="share-expanded"
              className="w-full h-full flex items-center justify-between gap-1 px-1.5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {/* 1. X.com (Twitter) */}
              <a
                href={xShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeout(() => setIsExpanded(false), 300);
                }}
                className="h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-white hover:bg-white/10 shrink-0"
                title="Share to X.com"
              >
                <XIcon className="h-3 w-3" />
              </a>

              {/* 2. LinkedIn */}
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeout(() => setIsExpanded(false), 300);
                }}
                className="h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#0A66C2] hover:bg-[#0A66C2]/15 shrink-0"
                title="Share to LinkedIn"
              >
                <LinkedinIcon className="h-3 w-3" />
              </a>

              {/* 3. Facebook */}
              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeout(() => setIsExpanded(false), 300);
                }}
                className="h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#1877F2] hover:bg-[#1877F2]/15 shrink-0"
                title="Share to Facebook"
              >
                <FacebookIcon className="h-3 w-3" />
              </a>

              {/* 4. Threads */}
              <a
                href={threadsShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeout(() => setIsExpanded(false), 300);
                }}
                className="h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-white hover:bg-white/10 shrink-0"
                title="Share to Threads"
              >
                <ThreadsIcon className="h-3 w-3" />
              </a>

              {/* 5. Instagram */}
              <button
                type="button"
                onClick={(e) => handleNativeOrCopy('instagram', e)}
                className="h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#E1306C] hover:bg-[#E1306C]/15 cursor-pointer shrink-0"
                title="Share to Instagram"
              >
                <InstagramIcon className="h-3 w-3" />
              </button>

              {/* 6. TikTok */}
              <button
                type="button"
                onClick={(e) => handleNativeOrCopy('tiktok', e)}
                className="h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-[#00f2fe] hover:bg-[#00f2fe]/15 cursor-pointer shrink-0"
                title="Share to TikTok"
              >
                <TikTokIcon className="h-3 w-3" />
              </button>

              {/* Hairline Divider */}
              <div className="h-3.5 w-px bg-white/20 shrink-0" />

              {/* 7. Copy Link */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'h-5.5 w-5.5 flex items-center justify-center rounded transition-colors text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0',
                  copied && 'bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                )}
                title={copied ? (feedbackText || 'Link Copied!') : 'Copy Link'}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating toast notification for Instagram / TikTok copy feedback */}
      <AnimatePresence>
        {feedbackText && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-white/20 text-[10px] text-white whitespace-nowrap z-50 pointer-events-none shadow-lg"
          >
            {feedbackText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
