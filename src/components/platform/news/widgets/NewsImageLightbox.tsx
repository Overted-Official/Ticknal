'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
  ArrowLeft,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';

interface NewsImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  sourceName?: string;
  onClose: () => void;
}

const HISTORY_STATE_KEY = 'ticknal_news_lightbox';

export default function NewsImageLightbox({
  isOpen,
  imageUrl,
  title,
  sourceName,
  onClose,
}: NewsImageLightboxProps) {
  const { locale, isRTL } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [swipeDownY, setSwipeDownY] = useState(0);

  const [isPinching, setIsPinching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipingDown, setIsSwipingDown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasPushedHistoryRef = useRef(false);

  // Touch tracking refs
  const pinchStartDistRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const pinchStartPanRef = useRef({ x: 0, y: 0 });
  const pinchStartMidRef = useRef({ x: 0, y: 0 });
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const panStartPosRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });

  // Mouse drag tracking refs (desktop)
  const mouseDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const mousePanStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Programmatic dismiss that pops synthetic history entry if pushed
  const dismiss = useCallback(() => {
    if (hasPushedHistoryRef.current) {
      hasPushedHistoryRef.current = false;
      if (typeof window !== 'undefined' && window.history.state?.[HISTORY_STATE_KEY]) {
        window.history.back();
      }
    }
    onClose();
  }, [onClose]);

  // Handle history push/pop (phone back button / swipe back gesture) & keyboard shortcuts
  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setSwipeDownY(0);
      return;
    }

    // 1. Push history state entry so phone back button / swipe gesture closes lightbox instead of navigating away
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ [HISTORY_STATE_KEY]: true }, '');
        hasPushedHistoryRef.current = true;
      } catch (err) {
        console.debug('Failed to push lightbox history state', err);
      }
    }

    // 2. Intercept popstate (phone hardware back button, Android gesture, browser back)
    const handlePopState = () => {
      hasPushedHistoryRef.current = false;
      onClose();
    };

    // 3. Handle keyboard shortcuts (Esc, +, -, 0)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.25, 3.5));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((prev) => {
          const next = Math.max(prev - 0.25, 1);
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    // Prevent body scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      // Clean up history entry if unmounting while still pushed
      if (hasPushedHistoryRef.current) {
        hasPushedHistoryRef.current = false;
        if (typeof window !== 'undefined' && window.history.state?.[HISTORY_STATE_KEY]) {
          window.history.back();
        }
      }
    };
  }, [isOpen, onClose, dismiss]);

  // Clamp pan position relative to container and zoom level
  const clampPan = useCallback((targetPan: { x: number; y: number }, targetZoom: number) => {
    if (targetZoom <= 1.05) return { x: 0, y: 0 };
    const w = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);
    const h = containerRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
    const maxPanX = Math.max(0, (w * (targetZoom - 1)) / 2 + 40);
    const maxPanY = Math.max(0, (h * (targetZoom - 1)) / 2 + 40);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, targetPan.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, targetPan.y)),
    };
  }, []);

  // Zoom control handlers
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => Math.min(prev + 0.35, 3.5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => {
      const next = Math.max(prev - 0.35, 1);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSwipeDownY(0);
  };

  // Touch gesture handlers for mobile (pinch-to-zoom, pan, swipe-down-to-dismiss, double-tap)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // 2 fingers: Pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      pinchStartPanRef.current = { ...pan };
      pinchStartMidRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      setIsPinching(true);
      setIsDragging(false);
      setIsSwipingDown(false);
      setSwipeDownY(0);
    } else if (e.touches.length === 1) {
      // 1 finger: Pan (if zoomed) or Swipe-down (if at 1x)
      const t = e.touches[0];
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };
      panStartPosRef.current = { ...pan };
      if (zoom > 1.05) {
        setIsDragging(true);
      } else {
        setIsSwipingDown(false);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDistRef.current > 0) {
        const factor = dist / pinchStartDistRef.current;
        const newZoom = Math.max(0.75, Math.min(pinchStartZoomRef.current * factor, 4.2));
        setZoom(newZoom);

        const currentMid = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
        const dx = currentMid.x - pinchStartMidRef.current.x;
        const dy = currentMid.y - pinchStartMidRef.current.y;
        setPan(clampPan({
          x: pinchStartPanRef.current.x + dx,
          y: pinchStartPanRef.current.y + dy,
        }, newZoom));
      }
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchStartPosRef.current.x;
      const dy = t.clientY - touchStartPosRef.current.y;

      if (zoom > 1.05 && isDragging) {
        setPan(clampPan({
          x: panStartPosRef.current.x + dx,
          y: panStartPosRef.current.y + dy,
        }, zoom));
      } else if (zoom <= 1.05) {
        // Pull down gesture to dismiss
        if (dy > 8 && dy > Math.abs(dx)) {
          setIsSwipingDown(true);
          const pullY = Math.pow(dy, 0.88);
          setSwipeDownY(pullY);
        } else if (dy < 0) {
          setSwipeDownY(0);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isPinching) {
      setIsPinching(false);
      pinchStartDistRef.current = 0;
      if (zoom < 1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (zoom > 3.5) {
        setZoom(3.5);
        setPan((prev) => clampPan(prev, 3.5));
      } else {
        setPan((prev) => clampPan(prev, zoom));
      }
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      setPan((prev) => clampPan(prev, zoom));
    }

    if (isSwipingDown) {
      setIsSwipingDown(false);
      if (swipeDownY > 75) {
        dismiss();
        return;
      } else {
        setSwipeDownY(0);
      }
    }

    // Double-tap detection
    if (e.changedTouches.length === 1 && !isPinching && !isDragging && swipeDownY === 0) {
      const touch = e.changedTouches[0];
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      const distDiff = Math.hypot(
        touch.clientX - lastTapPosRef.current.x,
        touch.clientY - lastTapPosRef.current.y
      );

      if (timeDiff < 300 && distDiff < 35) {
        // Double tap toggles zoom
        if (zoom > 1.1) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        } else {
          setZoom(2.2);
          const w = window.innerWidth;
          const h = window.innerHeight;
          setPan(clampPan({
            x: (w / 2 - touch.clientX) * 0.7,
            y: (h / 2 - touch.clientY) * 0.7,
          }, 2.2));
        }
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  // Mouse pan & wheel zoom for desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      const delta = -e.deltaY * 0.003;
      setZoom((prev) => {
        const next = Math.max(1, Math.min(prev + delta, 3.5));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1.05 && e.button === 0) {
      e.preventDefault();
      mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
      mousePanStartRef.current = { ...pan };
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && mouseDragStartRef.current && zoom > 1.05) {
      const dx = e.clientX - mouseDragStartRef.current.x;
      const dy = e.clientY - mouseDragStartRef.current.y;
      setPan(clampPan({
        x: mousePanStartRef.current.x + dx,
        y: mousePanStartRef.current.y + dy,
      }, zoom));
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      mouseDragStartRef.current = null;
      setPan((prev) => clampPan(prev, zoom));
    }
  };

  // Actions
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `ticknal-chart-${Date.now()}.${imageUrl.startsWith('data:image/svg') ? 'svg' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="news-image-lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 h-[100dvh] w-full z-[300] bg-black/95 backdrop-blur-md flex flex-col select-none font-sans overflow-hidden"
          style={{
            opacity: 1 - Math.min(swipeDownY / 300, 0.65),
          }}
          onClick={dismiss}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Top Bar Header with Mobile Safe Area Inset Support */}
          <header
            className="w-full shrink-0 border-b border-white/10 bg-black/90 backdrop-blur-sm z-20 flex flex-col"
            style={{
              paddingTop: 'max(env(safe-area-inset-top, 0px), var(--ticknal-safe-area-top, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-2.5">
              {/* Left: Mobile Back Button + Title */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] border border-white/10 text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Back"
                  title="Back (Esc)"
                >
                  <ArrowLeft size={17} className={isRTL ? 'rotate-180' : ''} />
                </button>

                <div className="flex flex-col min-w-0">
                  <span className="text-white text-xs sm:text-sm font-semibold truncate leading-tight">
                    {sourceName || (locale === 'ar' ? 'نبض تكنال' : 'Ticknal Market Intelligence')}
                  </span>
                  {title && (
                    <span className="text-zinc-400 text-[11px] truncate leading-tight max-w-[200px] sm:max-w-md">
                      {title}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Reset Zoom Badge (shows when zoomed in on phone & desktop) */}
                {zoom > 1.05 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="flex items-center gap-1 px-2.5 h-8 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-lg tabular-nums cursor-pointer hover:bg-emerald-500/20 transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={12} />
                    <span>{Math.round(zoom * 100)}%</span>
                  </button>
                )}

                {/* Desktop Zoom Stepper Controls (hidden on phone where pinch-to-zoom is native) */}
                <div className="hidden sm:flex items-center bg-white/[0.04] border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2 h-7 text-[11px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded tabular-nums cursor-pointer transition-colors"
                    title="Reset Zoom (0)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3.5}
                    className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title={locale === 'ar' ? 'تحميل الصورة' : 'Download Chart'}
                >
                  <Download size={15} />
                </button>

                {/* Open in new tab (desktop) */}
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title={locale === 'ar' ? 'فتح في علامة تبويب جديدة' : 'Open in new tab'}
                >
                  <ExternalLink size={15} />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </header>

          {/* Center Canvas Area with Touch Gestures */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-hidden relative flex items-center justify-center p-2 sm:p-6 select-none"
            style={{
              touchAction: 'none',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onClick={dismiss}
          >
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y + swipeDownY}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                transition:
                  isPinching || isDragging || isSwipingDown
                    ? 'none'
                    : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform',
              }}
              className="max-w-5xl w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt={title || 'Market Chart'}
                draggable={false}
                className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-xl border border-white/10 bg-black shadow-[0_24px_64px_rgba(0,0,0,0.95)]"
                loading="eager"
                style={{
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
                onClick={() => {
                  // On non-touch desktop click, toggle zoom
                  if (typeof window !== 'undefined' && !('ontouchstart' in window)) {
                    if (zoom === 1) {
                      setZoom(2.2);
                    } else {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom Footnote Hint with Safe Area Inset Support */}
          <footer
            className="shrink-0 py-2.5 px-4 text-center text-[11px] text-zinc-400 border-t border-white/10 bg-black/90 backdrop-blur-sm z-20"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px), var(--ticknal-safe-area-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sm:hidden">
              {locale === 'ar'
                ? 'قرّب بالإصبعين للتكبير • اسحب للتنقل • اسحب لأسفل للإغلاق'
                : 'Pinch to zoom • Drag to pan • Swipe down to close'}
            </span>
            <span className="hidden sm:inline">
              {locale === 'ar'
                ? 'اضغط Esc أو في أي مكان للإغلاق • انقر نقرًا مزدوجًا أو استخدم +/- للتكبير'
                : 'Esc or tap outside to close • Double-click or use +/- to zoom'}
            </span>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
