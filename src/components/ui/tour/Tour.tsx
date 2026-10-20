"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";

export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto" | "center";

export type TourStep = {
  target?: string;
  title: string;
  content: React.ReactNode;
  placement?: TourPlacement;
  padding?: number;
};

export type TourProps = {
  steps: TourStep[];
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  index?: number;
  onIndexChange?: (index: number) => void;
  onFinish?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  clickToNext?: boolean;
  dark?: boolean;
  className?: string;
  isRtl?: boolean;
  labels?: {
    back?: string;
    next?: string;
    done?: string;
    skip?: string;
  };
};

type Rect = { top: number; left: number; width: number; height: number };

function getTargetElement(selector?: string): HTMLElement | null {
  if (!selector || typeof document === "undefined") return null;
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0] as HTMLElement;
  // If multiple elements match (e.g. mobile vs desktop versions of a control), pick the one rendered and visible
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return el;
    }
  }
  return elements[0] as HTMLElement;
}

function getElementRect(selector?: string): Rect | null {
  if (!selector || typeof document === "undefined") return null;
  const el = getTargetElement(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const SPRING = { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.7 };

export function Tour({
  steps,
  open,
  onOpenChange,
  index: controlledIndex,
  onIndexChange,
  onFinish,
  onSkip,
  showProgress = true,
  clickToNext = false,
  dark,
  className,
  isRtl: explicitIsRtl,
  labels,
}: TourProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [indexState, setIndexState] = React.useState(0);
  const index = controlledIndex ?? indexState;
  const setIndex = React.useCallback(
    (i: number) => {
      onIndexChange?.(i);
      setIndexState(i);
    },
    [onIndexChange],
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [cardSize, setCardSize] = React.useState({ w: 320, h: 168 });
  const [vp, setVp] = React.useState({ w: 1024, h: 768 });

  React.useEffect(() => setMounted(true), []);

  const step = steps[index];
  const count = steps.length;
  const isFirst = index === 0;
  const isLast = index === count - 1;
  const pad = step?.padding ?? 8;

  const { isRTL: contextIsRtl } = useTranslation();
  const isRtl = explicitIsRtl ?? (contextIsRtl || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl'));

  const finish = React.useCallback(() => {
    onFinish?.();
    onOpenChange?.(false);
    onIndexChange?.(0);
    setIndexState(0);
    setRect(null);
  }, [onFinish, onOpenChange, onIndexChange]);

  const skip = React.useCallback(() => {
    onSkip?.();
    onOpenChange?.(false);
    onIndexChange?.(0);
    setIndexState(0);
    setRect(null);
  }, [onSkip, onOpenChange, onIndexChange]);

  const next = React.useCallback(() => {
    if (isLast) finish();
    else setIndex(index + 1);
  }, [isLast, finish, index, setIndex]);

  const back = React.useCallback(() => {
    if (!isFirst) setIndex(index - 1);
  }, [isFirst, index, setIndex]);

  const measure = React.useCallback(() => {
    if (typeof window === "undefined") return;
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (!step?.target) {
      setRect(null);
      return;
    }
    const r = getElementRect(step.target);
    setRect(r);
  }, [step?.target]);

  // Synchronous layout measurement BEFORE browser paint
  React.useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }

    // 1. Immediately measure before paint
    measure();

    // 2. Scroll into view only if the target is outside viewport
    const el = getTargetElement(step?.target);
    if (el) {
      const r = el.getBoundingClientRect();
      const inView =
        r.top >= 0 &&
        r.bottom <= window.innerHeight &&
        r.left >= 0 &&
        r.right <= window.innerWidth;

      if (!inView) {
        try {
          const isFixed = window.getComputedStyle(el).position === "fixed";
          if (!isFixed) {
            el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center", inline: "nearest" });
          }
        } catch {
          el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center", inline: "nearest" });
        }
      }
    }

    // 3. Multi-frame measurement loop to stay locked during scroll/layout settling
    let rafId: number;
    let frameCount = 0;
    const loop = () => {
      measure();
      frameCount++;
      if (frameCount < 16) {
        rafId = requestAnimationFrame(loop);
      }
    };
    rafId = requestAnimationFrame(loop);

    const settle1 = window.setTimeout(measure, reduce ? 0 : 320);
    const settle2 = window.setTimeout(measure, reduce ? 0 : 650);

    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(settle1);
      window.clearTimeout(settle2);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, index, step, reduce, measure]);

  React.useLayoutEffect(() => {
    if (cardRef.current) {
      const w = cardRef.current.offsetWidth || 320;
      const h = cardRef.current.offsetHeight || 168;
      setCardSize((prev) => {
        if (prev.w === w && prev.h === h) return prev;
        return { w, h };
      });
    }
  }, [index, open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRtl) back();
        else next();
      } else if (e.key === "Enter") {
        // If a button is currently focused, native click will handle it to avoid double-stepping
        if (document.activeElement?.tagName === "BUTTON") return;
        e.preventDefault();
        if (isRtl) back();
        else next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRtl) next();
        else back();
      } else if (e.key === "Tab") {
        const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], input, [tabindex]:not([tabindex='-1'])",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, skip, isRtl]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      cardRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus({ preventScroll: true });
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, index]);

  if (!mounted || !open || !step) return null;

  const isDark = dark ?? true;

  const gap = 14;
  let place: TourPlacement = step.placement ?? "auto";
  if (!rect) place = "center";
  if (place === "auto" && rect) {
    if (rect.top + rect.height + gap + cardSize.h < vp.h) place = "bottom";
    else if (rect.top - gap - cardSize.h > 0) place = "top";
    else if (rect.left + rect.width + gap + cardSize.w < vp.w) place = "right";
    else place = "left";
  }

  let left = vp.w / 2 - cardSize.w / 2;
  let top = vp.h / 2 - cardSize.h / 2;
  if (rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (place === "bottom") {
      left = cx - cardSize.w / 2;
      top = rect.top + rect.height + gap + pad;
    } else if (place === "top") {
      left = cx - cardSize.w / 2;
      top = rect.top - gap - pad - cardSize.h;
    } else if (place === "right") {
      left = rect.left + rect.width + gap + pad;
      top = cy - cardSize.h / 2;
    } else if (place === "left") {
      left = rect.left - gap - pad - cardSize.w;
      top = cy - cardSize.h / 2;
    }
  }
  left = Math.min(Math.max(12, left), vp.w - 12 - cardSize.w);
  top = Math.min(Math.max(12, top), vp.h - 12 - cardSize.h);

  const spot = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Pure pitch black overlay ink to adhere strictly to Ticknal design rules
  const overlayInk = isDark ? "rgba(0,0,0,0.78)" : "rgba(17,17,20,0.48)";

  const backLabel = labels?.back ?? (isRtl ? "السابق" : "Back");
  const nextLabel = labels?.next ?? (isRtl ? "التالي" : "Next");
  const doneLabel = labels?.done ?? (isRtl ? "تم" : "Done");

  return createPortal(
    <div ref={rootRef} className={`${isDark ? "dark" : ""} ${className ?? ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <AnimatePresence>
        <motion.div
          key="tour-layer"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          aria-hidden={false}
          role="dialog"
          aria-modal="true"
          aria-label={typeof step.title === "string" ? step.title : "Product tour"}
        >
          <div className="absolute inset-0" onClick={() => (clickToNext ? next() : skip())} />

          {spot ? (
            <motion.div
              key={`tour-spotlight-${index}`}
              className="pointer-events-none absolute rounded-xl"
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1, top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
              transition={reduce ? { duration: 0 } : SPRING}
              style={{
                background: "transparent",
                boxShadow: `0 0 0 9999px ${overlayInk}`,
                outline: isDark ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.85)",
                outlineOffset: 2,
              }}
            >
              <span
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "transparent",
                  boxShadow: isDark
                    ? "0 0 0 1px rgba(255,255,255,0.22), 0 8px 40px rgba(0,0,0,0.7)"
                    : "0 0 0 1px rgba(0,0,0,0.06), 0 8px 40px rgba(0,0,0,0.18)",
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tour-backdrop-flat"
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: overlayInk }}
            />
          )}

          <motion.div
            ref={cardRef}
            className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-black/20 dark:border-white/10 dark:bg-black"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, left, top }}
            transition={reduce ? { duration: 0 } : SPRING}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[14px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                {step.title}
              </h3>
              <button
                type="button"
                onClick={skip}
                aria-label="Close tour"
                className="-mr-1 -mt-1 rtl:-ml-1 rtl:mr-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <IconX />
              </button>
            </div>

            <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {step.content}
            </div>

            <div className="mt-4 flex items-center justify-between">
              {showProgress ? (
                <div className="flex items-center gap-1.5" aria-hidden>
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === index
                          ? "w-4 bg-zinc-900 dark:bg-white"
                          : "w-1.5 bg-zinc-200 dark:bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[11px] tabular-nums text-zinc-400">
                  {index + 1} / {count}
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={back}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
                  >
                    <IconArrow className={isRtl ? "" : "rotate-180"} />
                    {backLabel}
                  </button>
                )}
                <button
                  type="button"
                  data-tour-primary
                  onClick={next}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-black active:scale-95"
                >
                  {isLast ? doneLabel : nextLabel}
                  {!isLast && <IconArrow className={isRtl ? "rotate-180" : ""} />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export function useTour(storageKey?: string) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const seen = React.useCallback(() => {
    try {
      if (storageKey && localStorage.getItem(storageKey) === "1") return true;
      if (localStorage.getItem("ticknal_tour_completed_global") === "1") return true;
      return false;
    } catch {
      return false;
    }
  }, [storageKey]);

  const start = React.useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  const markSeen = React.useCallback(() => {
    try {
      if (storageKey) {
        localStorage.setItem(storageKey, "1");
      }
      localStorage.setItem("ticknal_tour_completed_global", "1");
    } catch {
      return;
    }
  }, [storageKey]);

  return React.useMemo(
    () => ({ open, setOpen, index, setIndex, start, seen, markSeen }),
    [open, index, start, seen, markSeen]
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className="h-4 w-4">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${className}`}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
