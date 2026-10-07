'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Terminal, AlertTriangle, Info } from '@/components/ui/icon-library';

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

export default function LogMetadataDrawer({ log, onClose }: LogMetadataDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const isError = log.level.toUpperCase() === 'ERROR';
  const isWarn = log.level.toUpperCase() === 'WARN';

  const metadataString = log.metadata
    ? JSON.stringify(log.metadata, null, 2)
    : 'No additional metadata payload attached to this entry.';

  const handleCopy = () => {
    navigator.clipboard.writeText(metadataString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative z-10 w-full max-w-lg bg-black border-l border-white/10 h-full flex flex-col rounded-none shadow-2xl select-none"
        >
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black">
            <div className="flex items-center gap-2.5 min-w-0">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white truncate">
                  Log Entry #{log.id}
                </h2>
                <p className="text-xs text-zinc-400 truncate tabular-nums">
                  {log.source} • {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Details Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 text-xs text-zinc-300">
            {/* Status overview */}
            <div className="border border-white/10 p-3.5 rounded-xl space-y-2 bg-black">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Severity Level:</span>
                <span className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full ${
                  isError
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : isWarn
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-white/10 text-zinc-300 border border-white/10'
                }`}>
                  {log.level}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Worker Source:</span>
                <span className="text-white font-medium">{log.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Timestamp (UTC):</span>
                <span className="text-zinc-200 tabular-nums">{log.createdAt}</span>
              </div>
            </div>

            {/* Message block */}
            <div className="border border-white/10 p-3.5 rounded-xl space-y-1.5 bg-black">
              <span className="text-zinc-400 text-[11px] block">Log Message:</span>
              <p className="text-white text-xs leading-relaxed font-sans">
                {log.message}
              </p>
            </div>

            {/* Metadata Payload viewer */}
            <div className="border border-white/10 p-3.5 rounded-xl space-y-2 bg-black">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Metadata & Execution Diagnostics:</span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="p-3 bg-black border border-white/[0.08] rounded-lg text-[11px] text-zinc-300 overflow-x-auto custom-scrollbar font-sans leading-relaxed select-all">
                {metadataString}
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
