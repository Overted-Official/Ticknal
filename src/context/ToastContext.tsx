'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { toast } from '@/components/ui/sonner';
import type { ExternalToast } from 'sonner';

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
  addToast: (toastItem: Omit<ToastItem, 'id'>) => string | number;
  removeToast: (id: string | number) => void;
  toast: typeof toast;
};

const defaultContextValue: ToastContextValue = {
  toasts: [],
  addToast: ({ type, title, message, duration }) => {
    const opts: ExternalToast = {
      description: message,
      duration,
    };
    if (type === 'success') return toast.success(title, opts);
    if (type === 'error') return toast.error(title, opts);
    if (type === 'warning') return toast.warning(title, opts);
    return toast.info(title, opts);
  },
  removeToast: (id) => toast.dismiss(id),
  toast,
};

const ToastContext = createContext<ToastContextValue>(defaultContextValue);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => defaultContextValue, []);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  return context || defaultContextValue;
}
