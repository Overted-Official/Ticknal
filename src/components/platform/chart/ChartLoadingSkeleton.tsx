'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ChartLoadingSkeletonProps {
  isLoading: boolean;
  displaySymbol: string;
}

const CANDLE_HEIGHTS = [
  45, 62, 55, 78, 50, 70, 60, 88, 45, 74, 82, 60, 72, 54, 86, 64, 48, 76, 62, 94, 55, 70, 46, 80, 60, 84, 50, 68, 76, 58
];

export default function ChartLoadingSkeleton({ isLoading, displaySymbol }: ChartLoadingSkeletonProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="chart-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-30 bg-plt-card/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          {/* Grid Line Shimmer */}
          <div className="absolute inset-0 flex flex-col justify-between py-12 px-6 opacity-40">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full h-px bg-plt-border-soft" />
            ))}
          </div>

          {/* Shimmering Candlestick Bars */}
          <div className="absolute bottom-12 left-10 right-10 h-3/5 flex items-end gap-2 px-4 opacity-20">
            {CANDLE_HEIGHTS.map((h, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.15, 0.65, 0.15] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: (i % 6) * 0.1 }}
                className="flex-1 bg-plt-text rounded-full"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* Centered Loading Badge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 flex items-center gap-3 px-4 py-2 rounded-xl bg-plt-base/80 border border-plt-border-strong backdrop-blur-md shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs tabular-nums font-medium text-plt-text tracking-wide">
              Loading {displaySymbol}...
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
