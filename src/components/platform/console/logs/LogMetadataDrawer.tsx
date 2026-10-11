'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  Info,
} from '@/components/ui/icon-library';

interface LogItem {
  id: number;
  level: string;
  source: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
}

interface LogMetadataDrawerProps {
  log: LogItem | null;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function LogMetadataDrawer({ log, onClose }: LogMetadataDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const syncViewport = () => setIsDesktop(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!log) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement?.focus();
    };
  }, [handleClose, log]);

  const metadataString = log?.metadata
    ? JSON.stringify(log.metadata, null, 2)
    : 'No additional metadata payload attached to this entry.';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(metadataString);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const level = log?.level.toUpperCase();
  const isError = level === 'ERROR';
  const isWarn = level === 'WARN';
  const severityClass = isError
    ? 'badge-risk'
    : isWarn
      ? 'badge-warning'
      : 'badge-info';

  const sheetMotion = isDesktop
    ? { initial: { x: '100%' }, exit: { x: '100%' } }
    : { initial: { y: '100%' }, exit: { y: '100%' } };

  return (
    <AnimatePresence>
      {log && (
        <div className="drawer-overlay">
          <motion.button
            type="button"
            aria-label="Close log details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="drawer-backdrop"
          />

          <motion.div
            ref={drawerRef}
            initial={sheetMotion.initial}
            animate={{ x: 0, y: 0 }}
            exit={sheetMotion.exit}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="drawer-sheet drawer-sheet-viewport-safe operations-log-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="operations-log-drawer-title"
            aria-describedby="operations-log-drawer-description"
          >
            <header className="drawer-header">
              <div className="drawer-drag-pill-container" aria-hidden="true">
                <span className="drawer-drag-pill" />
              </div>

              <div className="drawer-header-row">
                <div className="drawer-header-brand">
                  <span className="drawer-header-icon-box" aria-hidden="true">
                    <Terminal className="drawer-header-icon" />
                  </span>
                  <div className="drawer-header-titles">
                    <h2 id="operations-log-drawer-title" className="drawer-title">
                      Log Entry #{log.id}
                    </h2>
                    <p id="operations-log-drawer-description" className="drawer-subtitle tabular-nums">
                      {log.source} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={handleClose}
                  className="drawer-close-btn"
                  aria-label="Close log details"
                >
                  <X className="drawer-close-icon" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="drawer-body custom-scrollbar space-y-4">
              <section className="operations-detail-card space-y-3" aria-label="Log overview">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-white/50">Severity</span>
                  <span className={`badge !text-[10px] !min-h-5 !px-2 uppercase tracking-wider ${severityClass}`}>
                    {isError ? (
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Info className="w-3 h-3" aria-hidden="true" />
                    )}
                    {log.level}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-3">
                  <span className="text-[11px] text-white/50">Worker source</span>
                  <span className="text-xs text-white font-medium text-right break-all">{log.source}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-t border-white/[0.06] pt-3">
                  <span className="text-[11px] text-white/50 shrink-0">Timestamp (UTC)</span>
                  <span className="text-[11px] text-white/80 tabular-nums text-right break-all">{log.createdAt}</span>
                </div>
              </section>

              <section className="operations-detail-card space-y-2" aria-labelledby="operations-log-message-title">
                <h3 id="operations-log-message-title" className="widget-title">Log message</h3>
                <p className="text-xs leading-relaxed text-white/90 select-text">{log.message}</p>
              </section>

              <section className="operations-detail-card space-y-2" aria-labelledby="operations-log-metadata-title">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="operations-log-metadata-title" className="widget-title">
                    Execution diagnostics
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-token btn-secondary btn-micro"
                    aria-label={copied ? 'Metadata copied' : 'Copy metadata JSON'}
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre className="operations-code-block custom-scrollbar">{metadataString}</pre>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
