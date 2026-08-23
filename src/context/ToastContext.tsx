'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from '@/components/ui/icon-library';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => string;
    error: (title: string, message?: string) => string;
    warning: (title: string, message?: string) => string;
    info: (title: string, message?: string) => string;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const toastHelpers = useMemo(
    () => ({
      success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
      error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
      warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
      info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
    }),
    [addToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      toast: toastHelpers,
    }),
    [toasts, addToast, removeToast, toastHelpers]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`pointer-events-auto p-3.5 rounded-md border shadow-popover backdrop-blur-xl flex items-start gap-3 relative overflow-hidden ${
                t.type === 'success'
                  ? 'bg-plt-profit-soft border-plt-profit-border text-plt-text'
                  : t.type === 'error'
                  ? 'bg-plt-risk-soft border-plt-risk-border text-plt-text'
                  : t.type === 'warning'
                  ? 'bg-plt-warning-soft border-plt-warning-border text-plt-text'
                  : 'bg-plt-info-soft border-plt-info-border text-plt-text'
              }`}
            >
              {/* Type Icon */}
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 size={18} className="text-plt-profit" />}
                {t.type === 'error' && <AlertCircle size={18} className="text-plt-risk" />}
                {t.type === 'warning' && <AlertTriangle size={18} className="text-plt-warning" />}
                {t.type === 'info' && <Info size={18} className="text-plt-info" />}
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-medium leading-tight">{t.title}</h4>
                {t.message && (
                  <p className="text-[11px] text-plt-subtle mt-0.5 leading-snug break-words">
                    {t.message}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="absolute top-3 right-3 text-plt-faint hover:text-plt-text transition"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
