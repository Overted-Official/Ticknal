"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

type ToastArgData = string | ExternalToast;

function normalizeToastArgs(
  message: React.ReactNode,
  data?: ToastArgData
): [React.ReactNode, ExternalToast | undefined] {
  if (typeof data === 'string') {
    return [message, { description: data }];
  }
  return [message, data];
}

const toast = Object.assign(
  (message: React.ReactNode, data?: ToastArgData) => {
    const [msg, opts] = normalizeToastArgs(message, data);
    return sonnerToast(msg, opts);
  },
  {
    success: (message: React.ReactNode, data?: ToastArgData) => {
      const [msg, opts] = normalizeToastArgs(message, data);
      return sonnerToast.success(msg, opts);
    },
    info: (message: React.ReactNode, data?: ToastArgData) => {
      const [msg, opts] = normalizeToastArgs(message, data);
      return sonnerToast.info(msg, opts);
    },
    warning: (message: React.ReactNode, data?: ToastArgData) => {
      const [msg, opts] = normalizeToastArgs(message, data);
      return sonnerToast.warning(msg, opts);
    },
    error: (message: React.ReactNode, data?: ToastArgData) => {
      const [msg, opts] = normalizeToastArgs(message, data);
      return sonnerToast.error(msg, opts);
    },
    custom: sonnerToast.custom,
    message: (message: React.ReactNode, data?: ToastArgData) => {
      const [msg, opts] = normalizeToastArgs(message, data);
      return sonnerToast.message(msg, opts);
    },
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    loading: (message: React.ReactNode, data?: ToastArgData) => {
      const [msg, opts] = normalizeToastArgs(message, data);
      return sonnerToast.loading(msg, opts);
    },
    getHistory: sonnerToast.getHistory,
    getToasts: sonnerToast.getToasts,
  }
);

export { Toaster, toast }
