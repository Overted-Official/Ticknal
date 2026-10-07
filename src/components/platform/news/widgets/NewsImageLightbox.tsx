'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
} from '@/components/ui/icon-library';

interface NewsImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  sourceName?: string;
  onClose: () => void;
}

export default function NewsImageLightbox({
  isOpen,
  imageUrl,
  title,
  sourceName,
  onClose,
}: NewsImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset zoom whenever lightbox opens or image changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
    }
  }, [isOpen, imageUrl]);

  // Handle keyboard shortcuts (Esc, +, -, 0)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.25, 2.5));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((prev) => Math.max(prev - 0.25, 1));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };

    // Prevent body scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(prev - 0.25, 1));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(1);
  };

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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col select-none font-sans"
          onClick={onClose}
        >
          {/* Top Bar Header */}
          <div
            className="w-full shrink-0 h-14 px-4 sm:px-6 bg-black/90 border-b border-white/[0.08] flex items-center justify-between gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Source & Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-white text-xs sm:text-sm font-semibold truncate">
                {sourceName || 'Ticknal Market Intelligence'}
              </span>
              {title && (
                <>
                  <span className="text-white/30 hidden sm:inline text-xs">/</span>
                  <span className="text-white/60 hidden sm:inline text-xs truncate max-w-sm">
                    {title}
                  </span>
                </>
              )}
            </div>

            {/* Right: Actions & Close */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Zoom Controls */}
              <div className="flex items-center bg-white/[0.06] border border-white/[0.08] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="w-7 h-7 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Zoom Out (-)"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 h-7 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded tabular-nums cursor-pointer transition-colors"
                  title="Reset Zoom (0)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.5}
                  className="w-7 h-7 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Zoom In (+)"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Download / Open */}
              <button
                type="button"
                onClick={handleDownload}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Download Chart"
              >
                <Download size={14} />
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-white transition-colors cursor-pointer ml-1"
                title="Close (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Center Canvas Area */}
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-3 sm:p-8"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-5xl w-full flex items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt={title || 'Market Chart'}
                  className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-xl border border-white/[0.12] bg-black shadow-[0_24px_64px_rgba(0,0,0,0.9)]"
                  loading="eager"
                  onClick={() => {
                    // Tap/click image to toggle zoom
                    setZoom((prev) => (prev === 1 ? 1.5 : 1));
                  }}
                  style={{
                    cursor: zoom === 1 ? 'zoom-in' : 'zoom-out',
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Bottom Footnote Hint */}
          <div className="shrink-0 py-2.5 px-4 text-center text-[11px] text-white/40 border-t border-white/[0.04] bg-black/60">
            <span>Esc or tap anywhere to close • Tap chart or use +/- to zoom</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
